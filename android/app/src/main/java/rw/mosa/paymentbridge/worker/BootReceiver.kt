package rw.mosa.paymentbridge.worker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import rw.mosa.paymentbridge.data.security.KeystoreManager
import java.util.concurrent.TimeUnit

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            Log.i(TAG, "Boot event received. Scheduling MOSA Bridge background workers...")

            val keystore = KeystoreManager(context)
            if (keystore.isPaired && !keystore.isRevoked) {
                schedulePeriodicHeartbeat(context)
            }
        }
    }

    companion object {
        private const val TAG = "BootReceiver"

        fun schedulePeriodicHeartbeat(context: Context) {
            val heartbeatRequest = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                HeartbeatWorker.WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                heartbeatRequest
            )
            Log.d(TAG, "Periodic heartbeat scheduled (every 15 min).")
        }
    }
}
