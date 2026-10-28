package rw.mosa.paymentbridge.data.models

import com.google.gson.annotations.SerializedName

/**
 * Payload sent to /api/payments/bridge/pair to consume one-time pairing code.
 */
data class PairRequest(
    @SerializedName("pairingCode") val pairingCode: String,
    @SerializedName("deviceHardwareId") val deviceHardwareId: String,
    @SerializedName("appVersion") val appVersion: String = "1.0.0"
)

data class PairResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("device") val device: PairDeviceData?
)

data class PairDeviceData(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceToken") val deviceToken: String,
    @SerializedName("hmacSecret") val hmacSecret: String,
    @SerializedName("name") val name: String?,
    @SerializedName("carrier") val carrier: String?,
    @SerializedName("simPhoneNumber") val simPhoneNumber: String?,
    @SerializedName("enrolledAt") val enrolledAt: String?
)

/**
 * Payload sent to /api/payments/bridge/heartbeat periodically.
 */
data class HeartbeatRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceToken") val deviceToken: String,
    @SerializedName("batteryLevel") val batteryLevel: Int,
    @SerializedName("isCharging") val isCharging: Boolean,
    @SerializedName("networkType") val networkType: String,
    @SerializedName("appVersion") val appVersion: String = "1.0.0"
)

data class HeartbeatResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("isDeviceActive") val isDeviceActive: Boolean,
    @SerializedName("status") val status: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("serverTime") val serverTime: String?
)

/**
 * Payload sent to /api/payments/webhook when a payment SMS is detected.
 */
data class PaymentWebhookPayload(
    @SerializedName("provider") val provider: String = "MTN_MOMO",
    @SerializedName("paymentReference") val paymentReference: String?,
    @SerializedName("providerTransactionRef") val providerTransactionRef: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("currency") val currency: String = "RWF",
    @SerializedName("phoneNumber") val phoneNumber: String?,
    @SerializedName("rawSms") val rawSms: String,
    @SerializedName("bridgeDeviceId") val bridgeDeviceId: String,
    @SerializedName("timestamp") val timestamp: String
)

data class PaymentWebhookResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("receiptNumber") val receiptNumber: String?,
    @SerializedName("businessStatus") val businessStatus: String?
)

/**
 * Internal parsing result from MtnSmsParser and AirtelSmsParser.
 */
data class ParsedSmsResult(
    val isValidMoMoSms: Boolean,
    val paymentReference: String? = null,
    val providerTransactionRef: String? = null,
    val amount: Double = 0.0,
    val currency: String = "RWF",
    val senderPhone: String? = null,
    val senderName: String? = null,
    val timestamp: String? = null,
    val rawText: String,
    val provider: String = "MTN_MOMO",
    val isEkash: Boolean = false,
    val balance: Double? = null
)
