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
        set(value) {
            val cleaned = cleanUrl(value)
            if (isTrustedServerUrl(cleaned)) {
                val current = sharedPreferences.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
                if (current != cleaned && isTrustedServerUrl(current)) {
                    // Record verified current URL as fallback before transitioning
                    sharedPreferences.edit().putString(KEY_FALLBACK_SERVER_URL, current).apply()
                }
                sharedPreferences.edit().putString(KEY_SERVER_URL, cleaned).apply()
            } else {
                android.util.Log.w("KeystoreManager", "Blocked untrusted serverUrl redirection attempt: $value")
            }
        }

    val fallbackServerUrl: String
        get() = sharedPreferences.getString(KEY_FALLBACK_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL

    var consecutiveHeartbeatFailures: Int
        get() = sharedPreferences.getInt(KEY_CONSECUTIVE_HB_FAILURES, 0)
        set(value) = sharedPreferences.edit().putInt(KEY_CONSECUTIVE_HB_FAILURES, value).apply()

    fun restoreFallbackServerUrl(): Boolean {
        val fallback = fallbackServerUrl
        if (isTrustedServerUrl(fallback)) {
            android.util.Log.i("KeystoreManager", "Terminal recovering: restoring serverUrl to verified fallback: $fallback")
            sharedPreferences.edit()
                .putString(KEY_SERVER_URL, fallback)
                .putInt(KEY_CONSECUTIVE_HB_FAILURES, 0)
                .apply()
            return true
        }
        return false
    }

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

    val approvedDomains: Set<String>
        get() {
            val stored = sharedPreferences.getStringSet(KEY_APPROVED_DOMAINS, null)
            val defaults = setOf("mosa-one.vercel.app", "mosa.rw", "*.mosa.rw")
            return if (stored != null) (defaults + stored) else defaults
        }

    fun updateApprovedDomains(domains: List<String>) {
        val current = approvedDomains.toMutableSet()
        for (raw in domains) {
            val clean = raw.trim().lowercase().removePrefix("https://").removePrefix("http://").trimEnd('/')
            if (clean.isBlank()) continue

            // Prohibit invalid characters, ports, and whitespace
            if (clean.contains("/") || clean.contains(":") || clean.contains(" ")) {
                android.util.Log.w("KeystoreManager", "Rejected malformed domain: $clean")
                continue
            }

            // Prohibit raw IP addresses in approved production domains
            if (clean.matches(Regex("^(\\d{1,3}\\.){3}\\d{1,3}$"))) {
                android.util.Log.w("KeystoreManager", "Rejected raw IP domain: $clean")
                continue
            }

            // Strictly prohibit broad wildcards (e.g. *, *.com, *.net, *.org, *.rw)
            if (clean.startsWith("*.")) {
                val suffix = clean.removePrefix("*.")
                val isOfficialMosaWildcard = suffix == "mosa.rw" || suffix.endsWith(".mosa.rw") || suffix == "55mosa.rw"
                if (!isOfficialMosaWildcard) {
                    android.util.Log.w("KeystoreManager", "Rejected non-official wildcard domain: $clean")
                    continue
                }
            }

            // Disallow arbitrary *.vercel.app subdomains. Only official mosa-one.vercel.app is permitted.
            if (clean.endsWith(".vercel.app") && clean != "mosa-one.vercel.app") {
                android.util.Log.w("KeystoreManager", "Rejected untrusted vercel subdomain: $clean")
                continue
            }
            current.add(clean)
        }
        sharedPreferences.edit().putStringSet(KEY_APPROVED_DOMAINS, current).apply()
    }

    fun isTrustedServerUrl(url: String): Boolean {
        return try {
            val uri = java.net.URI(cleanUrl(url))
            val host = uri.host?.lowercase() ?: return false
            val isHttps = uri.scheme.equals("https", ignoreCase = true)

            // Strictly disallow arbitrary *.vercel.app subdomains
            if (host.endsWith(".vercel.app") && host != "mosa-one.vercel.app") {
                return false
            }

            val domains = approvedDomains
            val isTrustedDomain = domains.any { pattern ->
                if (pattern.startsWith("*.")) {
                    val root = pattern.removePrefix("*.")
                    host == root || host.endsWith(".$root")
                } else {
                    host == pattern
                }
            }

            if (rw.mosa.paymentbridge.BuildConfig.DEBUG) {
                val isLocalHost = host == "10.0.2.2" || host == "localhost" || host.startsWith("192.168.")
                (isHttps && isTrustedDomain) || isLocalHost
            } else {
                isHttps && isTrustedDomain
            }
        } catch (_: Exception) {
            false
        }
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
        private const val KEY_FALLBACK_SERVER_URL = "fallback_server_url"
        private const val KEY_CONSECUTIVE_HB_FAILURES = "consecutive_hb_failures"
        private const val KEY_APPROVED_DOMAINS = "approved_domains"
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
