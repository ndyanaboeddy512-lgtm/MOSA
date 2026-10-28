package rw.mosa.paymentbridge.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import rw.mosa.paymentbridge.data.local.BridgeDatabase
import rw.mosa.paymentbridge.data.local.QueuedTransaction
import rw.mosa.paymentbridge.data.models.ParsedSmsResult
import rw.mosa.paymentbridge.data.security.KeystoreManager
import rw.mosa.paymentbridge.worker.SyncPaymentWorker

/**
 * High-priority BroadcastReceiver intercepting incoming SMS messages.
 * Enforces strict telecom whitelist to ensure only financial MTN Mobile Money
 * SMS notifications are processed, discarding all personal or unrelated text messages.
 */
class MtnSmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // 1. Assemble full text from potential multi-part SMS segments first
        val fullBodyBuilder = StringBuilder()
        for (msg in messages) {
            fullBodyBuilder.append(msg.displayMessageBody)
        }
        val fullSmsText = fullBodyBuilder.toString()

        // 2. Telecom Sender Verification & Carrier Resolution
        val originatingAddress = messages[0].displayOriginatingAddress
        val carrierResolution = TelecomProviderDetector.resolveCarrier(originatingAddress, fullSmsText)

        if (carrierResolution == CarrierResolution.UNTRUSTED) {
            // Discard immediately — do not inspect, log, or forward private/personal messages
            Log.d(TAG, "Ignored SMS from non-telecom sender: $originatingAddress")
            return
        }

        // 3. Parse financial parameters via resolved carrier parser
        val isAmbiguous = (carrierResolution == CarrierResolution.AMBIGUOUS)
        val parsed: ParsedSmsResult = when (carrierResolution) {
            CarrierResolution.AIRTEL_MONEY -> {
                Log.i(TAG, "Inbound Airtel Money / eKash SMS detected. Parsing payload...")
                AirtelSmsParser.parse(fullSmsText)
            }
            CarrierResolution.MTN_MOMO -> {
                Log.i(TAG, "Inbound MTN Mobile Money SMS detected. Parsing payload...")
                MtnSmsParser.parse(fullSmsText)
            }
            CarrierResolution.AMBIGUOUS -> {
                Log.w(TAG, "Inbound 182 SMS lacked definitive carrier indicators. Parsing candidate...")
                val mtnAttempt = MtnSmsParser.parse(fullSmsText)
                if (mtnAttempt.isValidMoMoSms && mtnAttempt.providerTransactionRef != null) {
                    mtnAttempt
                } else {
                    AirtelSmsParser.parse(fullSmsText)
                }
            }
            CarrierResolution.UNTRUSTED -> ParsedSmsResult(isValidMoMoSms = false, rawText = fullSmsText)
        }

        if (!parsed.isValidMoMoSms || parsed.providerTransactionRef == null) {
            Log.w(TAG, "SMS from telecom did not contain recognizable financial transaction structure.")
            return
        }

        val keystoreManager = KeystoreManager(context)
        if (!keystoreManager.isPaired) {
            Log.w(TAG, "Terminal is not yet paired. Queuing transaction locally until paired.")
        }

        // 4. Persist to Room SQLite Queue
        // If provider cannot be identified confidently, leave the message unmatched rather than guessing.
        val targetStatus = if (isAmbiguous) {
            QueuedTransaction.STATUS_UNMATCHED
        } else if (parsed.paymentReference != null) {
            QueuedTransaction.STATUS_PENDING
        } else {
            QueuedTransaction.STATUS_UNMATCHED
        }

        val targetProvider = if (isAmbiguous) {
            QueuedTransaction.PROVIDER_UNKNOWN
        } else {
            parsed.provider
        }

        val db = BridgeDatabase.getDatabase(context)
        val transaction = QueuedTransaction(
            transactionId = parsed.providerTransactionRef,
            paymentReference = parsed.paymentReference,
            amount = parsed.amount,
            currency = parsed.currency,
            provider = targetProvider,
            isEkash = parsed.isEkash,
            senderPhone = parsed.senderPhone,
            senderName = parsed.senderName,
            rawSms = fullSmsText,
            status = targetStatus,
            lastError = if (isAmbiguous) "AMBIGUOUS_PROVIDER: Sender 182 lacked definitive carrier markers" else null
        )

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val insertedId = db.transactionDao().insertTransaction(transaction)
                if (insertedId != -1L) {
                    Log.i(TAG, "Transaction ${parsed.providerTransactionRef} queued (ID: $insertedId, Status: $targetStatus, Provider: $targetProvider)")
                    // 5. Trigger WorkManager sync only for confident pending transactions
                    if (targetStatus == QueuedTransaction.STATUS_PENDING) {
                        triggerImmediateSync(context)
                    }
                } else {
                    Log.w(TAG, "Duplicate transaction ${parsed.providerTransactionRef} was already queued; ignored.")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to persist queued transaction: ${e.message}")
            }
        }
    }

    private fun triggerImmediateSync(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = OneTimeWorkRequestBuilder<SyncPaymentWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            SyncPaymentWorker.WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            syncRequest
        )
    }

    companion object {
        private const val TAG = "MtnSmsReceiver"
    }
}
