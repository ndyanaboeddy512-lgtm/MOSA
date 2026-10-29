package rw.mosa.paymentbridge.worker

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import rw.mosa.paymentbridge.data.api.RetrofitClient
import rw.mosa.paymentbridge.data.models.HeartbeatRequest
import rw.mosa.paymentbridge.data.security.KeystoreManager

/**
 * Periodic WorkManager worker reporting hardware health, battery level, charging status,
 * and connectivity to the MOSA Command Center.
 */
class HeartbeatWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val keystoreManager = KeystoreManager(appContext)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (!keystoreManager.isPaired) {
            Log.d(TAG, "Device not paired. Heartbeat skipped.")
            return@withContext Result.success()
        }

        val deviceId = keystoreManager.deviceId ?: return@withContext Result.failure()
        val deviceToken = keystoreManager.deviceToken ?: return@withContext Result.failure()

        val batteryInfo = getBatteryStatus(applicationContext)
        val networkType = getNetworkType(applicationContext)

        val db = rw.mosa.paymentbridge.data.local.BridgeDatabase.getDatabase(applicationContext)
        val pendingCount = try { db.transactionDao().getPendingCount() } catch (_: Exception) { 0 }

        val request = HeartbeatRequest(
            deviceId = deviceId,
            deviceToken = deviceToken,
            batteryLevel = batteryInfo.level,
            isCharging = batteryInfo.isCharging,
            networkType = networkType,
            appVersion = "1.1.0",
            pendingSyncCount = pendingCount
        )

        try {
            val apiService = RetrofitClient.getApiService(keystoreManager)
            val response = apiService.sendHeartbeat(
                authHeader = "Bearer $deviceToken",
                deviceIdHeader = deviceId,
                request = request
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()
                keystoreManager.lastHeartbeatTimestamp = System.currentTimeMillis()
                Log.d(TAG, "Heartbeat successful. Status: ${body?.status ?: "ACTIVE"}")

                // Apply dynamic backend remote configuration
                body?.configuration?.let { cfg ->
                    cfg.approvedDomains?.let { domains ->
                        keystoreManager.updateApprovedDomains(domains)
                    }
                    cfg.deviceName?.let { if (it.isNotBlank()) keystoreManager.deviceName = it }
                    cfg.carrier?.let { if (it.isNotBlank()) keystoreManager.carrier = it }
                    cfg.simPhoneNumber?.let { if (it.isNotBlank()) keystoreManager.simPhoneNumber = it }
                    cfg.serverUrl?.let { if (it.isNotBlank()) keystoreManager.serverUrl = it }
                }

                if (body?.isDeviceActive == false) {
                    keystoreManager.isRevoked = true
                    Log.w(TAG, "Server flagged terminal as inactive/revoked.")
                }
                Result.success()
            } else {
                val code = response.code()
                val error = response.errorBody()?.string() ?: response.message()
                Log.w(TAG, "Heartbeat rejected ($code): $error")

                if (code == 401 || code == 403) {
                    if (error.contains("REVOKED", ignoreCase = true)) {
                        keystoreManager.isRevoked = true
                    }
                }
                Result.retry()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Heartbeat failed due to network exception: ${e.message}")
            Result.retry()
        }
    }

    private data class BatteryInfo(val level: Int, val isCharging: Boolean)

    private fun getBatteryStatus(context: Context): BatteryInfo {
        val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val batteryStatus: Intent? = context.registerReceiver(null, ifilter)

        val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 100

        val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

        return BatteryInfo(level = batteryPct, isCharging = isCharging)
    }

    private fun getNetworkType(context: Context): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return "UNKNOWN"
        val activeNetwork = cm.activeNetwork ?: return "OFFLINE"
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return "UNKNOWN"

        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
            else -> "CONNECTED"
        }
    }

    companion object {
        const val WORK_NAME = "MOSA_HEARTBEAT_PERIODIC_WORK"
        private const val TAG = "HeartbeatWorker"
    }
}
