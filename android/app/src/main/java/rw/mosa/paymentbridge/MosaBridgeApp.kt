package rw.mosa.paymentbridge

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import rw.mosa.paymentbridge.data.security.KeystoreManager
import rw.mosa.paymentbridge.worker.BootReceiver

class MosaBridgeApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()

        val keystore = KeystoreManager(this)
        if (keystore.isPaired && !keystore.isRevoked) {
            BootReceiver.schedulePeriodicHeartbeat(this)
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_BRIDGE_SERVICE,
                "MOSA Payment Bridge Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows live connectivity and synchronization status of the MTN SIM payment bridge."
            }

            val alertsChannel = NotificationChannel(
                CHANNEL_ALERTS,
                "MOSA Payment Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts for payment receipts and critical terminal warnings."
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
            manager?.createNotificationChannel(alertsChannel)
        }
    }

    companion object {
        const val CHANNEL_BRIDGE_SERVICE = "mosa_bridge_service_channel"
        const val CHANNEL_ALERTS = "mosa_bridge_alerts_channel"
    }
}
