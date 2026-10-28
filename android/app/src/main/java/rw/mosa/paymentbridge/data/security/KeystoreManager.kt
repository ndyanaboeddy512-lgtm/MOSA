package rw.mosa.paymentbridge.data.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/**
 * Manages secure storage of device tokens, HMAC signing keys, and server configuration
 * using hardware-backed Android Keystore and EncryptedSharedPreferences (AES-256-GCM).
 */
class KeystoreManager(context: Context) {

    private val sharedPreferences: SharedPreferences

    init {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        sharedPreferences = EncryptedSharedPreferences.create(
            PREFS_FILE_NAME,
            masterKeyAlias,
            context.applicationContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    var serverUrl: String
        get() = sharedPreferences.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = sharedPreferences.edit().putString(KEY_SERVER_URL, cleanUrl(value)).apply()

    var deviceId: String?
        get() = sharedPreferences.getString(KEY_DEVICE_ID, null)
        set(value) = sharedPreferences.edit().putString(KEY_DEVICE_ID, value).apply()

    var deviceToken: String?
        get() = sharedPreferences.getString(KEY_DEVICE_TOKEN, null)
        set(value) = sharedPreferences.edit().putString(KEY_DEVICE_TOKEN, value).apply()

    var hmacSecret: String?
        get() = sharedPreferences.getString(KEY_HMAC_SECRET, null)
        set(value) = sharedPreferences.edit().putString(KEY_HMAC_SECRET, value).apply()

    var deviceName: String?
        get() = sharedPreferences.getString(KEY_DEVICE_NAME, null)
        set(value) = sharedPreferences.edit().putString(KEY_DEVICE_NAME, value).apply()

    var simPhoneNumber: String?
        get() = sharedPreferences.getString(KEY_SIM_PHONE, null)
        set(value) = sharedPreferences.edit().putString(KEY_SIM_PHONE, value).apply()

    var carrier: String
        get() = sharedPreferences.getString(KEY_CARRIER, "MTN Rwanda") ?: "MTN Rwanda"
        set(value) = sharedPreferences.edit().putString(KEY_CARRIER, value).apply()

    var isPaired: Boolean
        get() = sharedPreferences.getBoolean(KEY_IS_PAIRED, false)
        set(value) = sharedPreferences.edit().putBoolean(KEY_IS_PAIRED, value).apply()

    var isRevoked: Boolean
        get() = sharedPreferences.getBoolean(KEY_IS_REVOKED, false)
        set(value) = sharedPreferences.edit().putBoolean(KEY_IS_REVOKED, value).apply()

    var lastSyncTimestamp: Long
        get() = sharedPreferences.getLong(KEY_LAST_SYNC_TS, 0L)
        set(value) = sharedPreferences.edit().putLong(KEY_LAST_SYNC_TS, value).apply()

    var lastHeartbeatTimestamp: Long
        get() = sharedPreferences.getLong(KEY_LAST_HB_TS, 0L)
        set(value) = sharedPreferences.edit().putLong(KEY_LAST_HB_TS, value).apply()

    fun savePairingCredentials(
        deviceId: String,
        deviceToken: String,
        hmacSecret: String,
        name: String?,
        simPhone: String?,
        carrier: String?
    ) {
        sharedPreferences.edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_TOKEN, deviceToken)
            .putString(KEY_HMAC_SECRET, hmacSecret)
            .putString(KEY_DEVICE_NAME, name)
            .putString(KEY_SIM_PHONE, simPhone)
            .putString(KEY_CARRIER, carrier ?: "MTN Rwanda")
            .putBoolean(KEY_IS_PAIRED, true)
            .putBoolean(KEY_IS_REVOKED, false)
            .apply()
    }

    fun clearCredentials() {
        sharedPreferences.edit()
            .remove(KEY_DEVICE_ID)
            .remove(KEY_DEVICE_TOKEN)
            .remove(KEY_HMAC_SECRET)
            .remove(KEY_DEVICE_NAME)
            .remove(KEY_SIM_PHONE)
            .putBoolean(KEY_IS_PAIRED, false)
            .putBoolean(KEY_IS_REVOKED, false)
            .apply()
    }

    fun getMaskedToken(): String {
        val token = deviceToken ?: return "Not Paired"
        if (token.length <= 8) return "***"
        return "${token.take(6)}...${token.takeLast(4)}"
    }

    private fun cleanUrl(url: String): String {
        var clean = url.trim()
        if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
            clean = "https://$clean"
        }
        if (clean.endsWith("/")) {
            clean = clean.dropLast(1)
        }
        return clean
    }

    companion object {
        private const val PREFS_FILE_NAME = "mosa_bridge_secure_prefs"
        private const val DEFAULT_SERVER_URL = "https://mosa-one.vercel.app"

        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_HMAC_SECRET = "hmac_secret"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_SIM_PHONE = "sim_phone"
        private const val KEY_CARRIER = "carrier"
        private const val KEY_IS_PAIRED = "is_paired"
        private const val KEY_IS_REVOKED = "is_revoked"
        private const val KEY_LAST_SYNC_TS = "last_sync_ts"
        private const val KEY_LAST_HB_TS = "last_hb_ts"
    }
}
