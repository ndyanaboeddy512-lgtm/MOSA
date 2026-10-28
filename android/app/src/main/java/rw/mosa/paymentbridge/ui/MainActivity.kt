package rw.mosa.paymentbridge.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import rw.mosa.paymentbridge.R
import rw.mosa.paymentbridge.data.api.RetrofitClient
import rw.mosa.paymentbridge.data.local.BridgeDatabase
import rw.mosa.paymentbridge.data.local.QueuedTransaction
import rw.mosa.paymentbridge.data.models.PairRequest
import rw.mosa.paymentbridge.data.security.KeystoreManager
import rw.mosa.paymentbridge.databinding.ActivityMainBinding
import rw.mosa.paymentbridge.sms.AirtelSmsParser
import rw.mosa.paymentbridge.sms.MtnSmsParser
import rw.mosa.paymentbridge.worker.BootReceiver
import rw.mosa.paymentbridge.worker.SyncPaymentWorker
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var keystoreManager: KeystoreManager
    private lateinit var db: BridgeDatabase

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val smsGranted = permissions[Manifest.permission.RECEIVE_SMS] == true
        if (smsGranted) {
            Toast.makeText(this, "SMS permissions granted. Terminal active.", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "SMS permission required to receive MoMo payment notifications.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        keystoreManager = KeystoreManager(this)
        db = BridgeDatabase.getDatabase(this)

        checkPermissions()
        setupEventListeners()
        renderState()
        observeDatabase()
    }

    override fun onResume() {
        super.onResume()
        renderState()
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun setupEventListeners() {
        binding.btnPair.setOnClickListener {
            handlePairing()
        }

        binding.btnSyncNow.setOnClickListener {
            triggerImmediateSync()
            Toast.makeText(this, "Triggered payment synchronization.", Toast.LENGTH_SHORT).show()
        }

        binding.btnSimulateSms.setOnClickListener {
            showSimulationDialog()
        }

        binding.btnUnpair.setOnClickListener {
            showUnpairConfirmationDialog()
        }
    }

    private fun renderState() {
        if (keystoreManager.isPaired) {
            binding.cardPairing.visibility = View.GONE
            binding.cardDashboard.visibility = View.VISIBLE

            binding.tvDeviceName.text = keystoreManager.deviceName ?: "Enrolled MOSA Terminal"
            binding.tvDeviceId.text = "Terminal ID: ${keystoreManager.deviceId ?: "Unknown"}"
            binding.tvSimInfo.text = "SIM: ${keystoreManager.simPhoneNumber ?: "N/A"} (${keystoreManager.carrier})"

            val batteryInfo = getBatteryStatus(this)
            val chargingText = if (batteryInfo.isCharging) "Charging" else "On Battery"
            binding.tvBatteryInfo.text = "Battery: ${batteryInfo.level}% ($chargingText)"

            if (keystoreManager.lastSyncTimestamp > 0L) {
                val dateStr = SimpleDateFormat("dd MMM yyyy HH:mm:ss", Locale.getDefault())
                    .format(Date(keystoreManager.lastSyncTimestamp))
                binding.tvLastSync.text = "Last Sync: $dateStr"
            } else {
                binding.tvLastSync.text = "Last Sync: None yet"
            }

            if (keystoreManager.isRevoked) {
                binding.tvStatusBadge.text = getString(R.string.status_revoked)
                binding.tvStatusBadge.setTextColor(ContextCompat.getColor(this, R.color.status_red))
            } else {
                binding.tvStatusBadge.text = getString(R.string.status_active)
                binding.tvStatusBadge.setTextColor(ContextCompat.getColor(this, R.color.status_green))
            }
        } else {
            binding.cardPairing.visibility = View.VISIBLE
            binding.cardDashboard.visibility = View.GONE
            binding.inputServerUrl.setText(keystoreManager.serverUrl)
        }
    }

    private fun observeDatabase() {
        db.transactionDao().getPendingCountLiveData().observe(this) { count ->
            binding.tvPendingCount.text = (count ?: 0).toString()
        }

        db.transactionDao().getSyncedCountLiveData().observe(this) { count ->
            binding.tvSyncedCount.text = (count ?: 0).toString()
        }

        db.transactionDao().getRecentTransactionsLiveData().observe(this) { list ->
            if (list.isNullOrEmpty()) {
                binding.tvLogFeed.text = "No transactions recorded yet.\nWaiting for incoming telecom notifications (Airtel / MTN)..."
            } else {
                val sb = StringBuilder()
                val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                for (tx in list.take(10)) {
                    val time = dateFormat.format(Date(tx.createdAt))
                    val statusEmoji = when (tx.status) {
                        QueuedTransaction.STATUS_SYNCED -> "✅"
                        QueuedTransaction.STATUS_PENDING -> "⏳"
                        QueuedTransaction.STATUS_FAILED -> "❌"
                        else -> "❓"
                    }
                    val receiptPart = if (tx.receiptNumber != null) " [${tx.receiptNumber}]" else ""
                    sb.append("$statusEmoji $time: ${tx.amount.toInt()} RWF | ${tx.paymentReference ?: "NO-REF"}$receiptPart\n")
                }
                binding.tvLogFeed.text = sb.toString().trimEnd()
            }
        }
    }

    private fun handlePairing() {
        val pairingCode = binding.inputPairingCode.text?.toString()?.trim()?.uppercase()
        val serverUrl = binding.inputServerUrl.text?.toString()?.trim()

        if (pairingCode.isNullOrBlank()) {
            binding.inputPairingCode.error = "Enter pairing code"
            return
        }

        if (!serverUrl.isNullOrBlank()) {
            keystoreManager.serverUrl = serverUrl
        }

        binding.progressPairing.visibility = View.VISIBLE
        binding.btnPair.isEnabled = false
        binding.tvPairingError.visibility = View.GONE

        val hardwareId = "android_${Build.MANUFACTURER.lowercase()}_${Build.MODEL.lowercase().replace(" ", "_")}"

        lifecycleScope.launch {
            try {
                val api = RetrofitClient.getApiService(keystoreManager)
                val response = withContext(Dispatchers.IO) {
                    api.pairTerminal(
                        PairRequest(
                            pairingCode = pairingCode,
                            deviceHardwareId = hardwareId,
                            appVersion = "1.0.0"
                        )
                    )
                }

                if (response.isSuccessful && response.body()?.success == true) {
                    val deviceData = response.body()?.device
                    if (deviceData != null) {
                        keystoreManager.savePairingCredentials(
                            deviceId = deviceData.deviceId,
                            deviceToken = deviceData.deviceToken,
                            hmacSecret = deviceData.hmacSecret,
                            name = deviceData.name,
                            simPhone = deviceData.simPhoneNumber,
                            carrier = deviceData.carrier
                        )

                        BootReceiver.schedulePeriodicHeartbeat(this@MainActivity)
                        Toast.makeText(this@MainActivity, "Terminal successfully paired!", Toast.LENGTH_LONG).show()
                        renderState()
                    }
                } else {
                    val err = response.errorBody()?.string() ?: response.message()
                    binding.tvPairingError.text = "Pairing failed: $err"
                    binding.tvPairingError.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                binding.tvPairingError.text = "Connection error: ${e.message}"
                binding.tvPairingError.visibility = View.VISIBLE
            } finally {
                binding.progressPairing.visibility = View.GONE
                binding.btnPair.isEnabled = true
            }
        }
    }

    private fun triggerImmediateSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = OneTimeWorkRequestBuilder<SyncPaymentWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniqueWork(
            SyncPaymentWorker.WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            syncRequest
        )
    }

    private fun showSimulationDialog() {
        val options = arrayOf(
            "Airtel Money (+250729974065) [Primary]",
            "MTN Mobile Money"
        )
        AlertDialog.Builder(this)
            .setTitle("Simulate Payment SMS")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> simulateTestAirtelPaymentSms()
                    1 -> simulateTestMtnPaymentSms()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    /**
     * Development testing harness: allows injecting a simulated Airtel Money SMS on the device
     * without spending real money or needing a physical SIM during development.
     */
    private fun simulateTestAirtelPaymentSms() {
        val randomSuffix = (1000..9999).random()
        val testRef = "MOSA-REG-SIM-$randomSuffix"
        val testTxId = "AM${System.currentTimeMillis()}"
        val simulatedSms = "Mwakiriye 5,000 RWF yavuye kuri +250729974065 (TEST USER). Txn ID: $testTxId. Impamvu: $testRef. Amafaranga asigaye ni 250,000 RWF."

        val parsed = AirtelSmsParser.parse(simulatedSms)

        lifecycleScope.launch(Dispatchers.IO) {
            val tx = QueuedTransaction(
                transactionId = parsed.providerTransactionRef ?: testTxId,
                paymentReference = parsed.paymentReference,
                amount = parsed.amount,
                currency = parsed.currency,
                provider = parsed.provider,
                isEkash = parsed.isEkash,
                senderPhone = parsed.senderPhone,
                senderName = parsed.senderName,
                rawSms = simulatedSms,
                status = QueuedTransaction.STATUS_PENDING
            )
            db.transactionDao().insertTransaction(tx)
            triggerImmediateSync()

            withContext(Dispatchers.Main) {
                Toast.makeText(this@MainActivity, "Simulated Airtel SMS queued: $testRef", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Development testing harness: allows injecting a simulated MTN MoMo SMS on the device.
     */
    private fun simulateTestMtnPaymentSms() {
        val randomSuffix = (1000..9999).random()
        val testRef = "MOSA-REG-SIM-$randomSuffix"
        val testTxId = "MOMO${System.currentTimeMillis()}"
        val simulatedSms = "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788111222 (TEST USER). Ref: $testRef. Umubare w'amafaranga asigaye ni 250,000 RWF. Id y'igikorwa: $testTxId."

        val parsed = MtnSmsParser.parse(simulatedSms)

        lifecycleScope.launch(Dispatchers.IO) {
            val tx = QueuedTransaction(
                transactionId = parsed.providerTransactionRef ?: testTxId,
                paymentReference = parsed.paymentReference,
                amount = parsed.amount,
                currency = parsed.currency,
                provider = parsed.provider,
                isEkash = parsed.isEkash,
                senderPhone = parsed.senderPhone,
                senderName = parsed.senderName,
                rawSms = simulatedSms,
                status = QueuedTransaction.STATUS_PENDING
            )
            db.transactionDao().insertTransaction(tx)
            triggerImmediateSync()

            withContext(Dispatchers.Main) {
                Toast.makeText(this@MainActivity, "Simulated MTN SMS queued: $testRef", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showUnpairConfirmationDialog() {
        AlertDialog.Builder(this)
            .setTitle("Unpair Terminal?")
            .setMessage("This will remove the device credentials and stop payment synchronization. You can re-pair using a new pairing code from Command Center.")
            .setPositiveButton("Unpair & Reset") { _, _ ->
                keystoreManager.clearCredentials()
                WorkManager.getInstance(this).cancelUniqueWork(SyncPaymentWorker.WORK_NAME)
                WorkManager.getInstance(this).cancelUniqueWork("MOSA_HEARTBEAT_PERIODIC_WORK")
                renderState()
                Toast.makeText(this, "Terminal unpaired.", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
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
}
