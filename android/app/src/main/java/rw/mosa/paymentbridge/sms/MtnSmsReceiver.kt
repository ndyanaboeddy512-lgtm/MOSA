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

        // 1. Telecom Sender Verification & Privacy Guard (Requirement 9)
        val originatingAddress = messages[0].displayOriginatingAddress
        if (!MtnSmsParser.isMtnSender(originatingAddress)) {
            // Discard immediately — do not inspect, log, or forward private/personal messages
            Log.d(TAG, "Ignored SMS from non-telecom sender: $originatingAddress")
            return
        }

        // 2. Assemble full text from potential multi-part SMS segments
        val fullBodyBuilder = StringBuilder()
        for (msg in messages) {
            fullBodyBuilder.append(msg.displayMessageBody)
        }
        val fullSmsText = fullBodyBuilder.toString()

        Log.i(TAG, "Inbound MTN Mobile Money SMS detected. Parsing payload...")

        // 3. Parse financial parameters
        val parsed = MtnSmsParser.parse(fullSmsText)
        if (!parsed.isValidMoMoSms || parsed.providerTransactionRef == null) {
            Log.w(TAG, "SMS from telecom did not contain recognizable financial transaction structure.")
            return
        }

        val keystoreManager = KeystoreManager(context)
        if (!keystoreManager.isPaired) {
            Log.w(TAG, "Terminal is not yet paired. Queuing transaction locally until paired.")
        }

        // 4. Persist to Room SQLite Queue
        val db = BridgeDatabase.getDatabase(context)
        val transaction = QueuedTransaction(
            transactionId = parsed.providerTransactionRef,
            paymentReference = parsed.paymentReference,
            amount = parsed.amount,
            currency = parsed.currency,
            senderPhone = parsed.senderPhone,
            senderName = parsed.senderName,
            rawSms = fullSmsText,
            status = if (parsed.paymentReference != null) QueuedTransaction.STATUS_PENDING else QueuedTransaction.STATUS_UNMATCHED
        )

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val insertedId = db.transactionDao().insertTransaction(transaction)
                if (insertedId != -1L) {
                    Log.i(TAG, "Transaction ${parsed.providerTransactionRef} queued (ID: $insertedId, Ref: ${parsed.paymentReference ?: "UNMATCHED"})")
                    // 5. Trigger WorkManager sync
                    triggerImmediateSync(context)
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
