package rw.mosa.paymentbridge.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import rw.mosa.paymentbridge.data.api.RetrofitClient
import rw.mosa.paymentbridge.data.local.BridgeDatabase
import rw.mosa.paymentbridge.data.models.PaymentWebhookPayload
import rw.mosa.paymentbridge.data.security.HmacUtil
import rw.mosa.paymentbridge.data.security.KeystoreManager
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * WorkManager worker executing resilient offline-first payment synchronization.
 * Computes authentic HMAC-SHA256 signatures and handles exponential backoff retries.
 */
class SyncPaymentWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val keystoreManager = KeystoreManager(appContext)
    private val db = BridgeDatabase.getDatabase(appContext)
    private val gson = Gson()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (!keystoreManager.isPaired) {
            Log.w(TAG, "Device is not paired with MOSA server. Sync skipped.")
            return@withContext Result.success()
        }

        if (keystoreManager.isRevoked) {
            Log.e(TAG, "Device has been revoked. Sync aborted.")
            return@withContext Result.failure()
        }

        val deviceId = keystoreManager.deviceId ?: return@withContext Result.failure()
        val deviceToken = keystoreManager.deviceToken ?: return@withContext Result.failure()
        val hmacSecret = keystoreManager.hmacSecret ?: return@withContext Result.failure()

        val pendingList = db.transactionDao().getPendingTransactions()
        if (pendingList.isEmpty()) {
            Log.d(TAG, "No pending transactions to synchronize.")
            return@withContext Result.success()
        }

        Log.i(TAG, "Synchronizing ${pendingList.size} pending transaction(s) to MOSA backend...")

        val apiService = RetrofitClient.getApiService(keystoreManager)
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        var anyFailed = false

        for (tx in pendingList) {
            try {
                val payload = PaymentWebhookPayload(
                    provider = tx.provider,
                    paymentReference = tx.paymentReference,
                    providerTransactionRef = tx.transactionId,
                    amount = tx.amount,
                    currency = tx.currency,
                    phoneNumber = tx.senderPhone,
                    rawSms = tx.rawSms,
                    bridgeDeviceId = deviceId,
                    timestamp = isoFormat.format(Date(tx.createdAt))
                )

                val rawJson = gson.toJson(payload)
                val hmacSignature = HmacUtil.computeHmacSha256(rawJson, hmacSecret)

                val response = apiService.forwardPaymentWebhook(
                    authHeader = "Bearer $deviceToken",
                    deviceIdHeader = deviceId,
                    hmacSignature = hmacSignature,
                    payload = payload
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()
                    val receiptNo = body?.receiptNumber
                    Log.i(TAG, "Transaction ${tx.transactionId} confirmed! Receipt: ${receiptNo ?: "N/A"}")
                    db.transactionDao().markSynced(tx.id, System.currentTimeMillis(), receiptNo)
                    keystoreManager.lastSyncTimestamp = System.currentTimeMillis()
                } else {
                    val errorCode = response.code()
                    val errorMsg = response.errorBody()?.string() ?: response.message()
                    Log.w(TAG, "Server rejected payment (${errorCode}): $errorMsg")

                    if (errorCode == 401 || errorCode == 403) {
                        if (errorMsg.contains("REVOKED", ignoreCase = true)) {
                            keystoreManager.isRevoked = true
                            Log.e(TAG, "Terminal was revoked by administrator.")
                            db.transactionDao().markFailed(tx.id, "TERMINAL_REVOKED: $errorMsg")
                            return@withContext Result.failure()
                        }
                    }

                    db.transactionDao().markFailed(tx.id, "HTTP $errorCode: $errorMsg")
                    anyFailed = true
                }
            } catch (e: IOException) {
                // Network outage, timeout, or DNS failure -> Retry with exponential backoff
                Log.w(TAG, "Network connection unavailable during sync for tx ${tx.transactionId}: ${e.message}")
                db.transactionDao().markFailed(tx.id, "NETWORK_ERROR: ${e.message}")
                return@withContext Result.retry()
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error synchronizing transaction ${tx.transactionId}: ${e.message}")
                db.transactionDao().markFailed(tx.id, "EXCEPTION: ${e.message}")
                anyFailed = true
            }
        }

        if (anyFailed) {
            Result.retry()
        } else {
            Result.success()
        }
    }

    companion object {
        const val WORK_NAME = "MOSA_PAYMENT_SYNC_WORK"
        private const val TAG = "SyncPaymentWorker"
    }
}
