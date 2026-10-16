package rw.mosa.paymentbridge.data.security

import java.nio.charset.StandardCharsets
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object HmacUtil {
    private const val ALGORITHM = "HmacSHA256"

    /**
     * Computes HMAC-SHA256 hex string matching MOSA backend crypto.createHmac("sha256", secret).
     */
    fun computeHmacSha256(payload: String, secret: String): String {
        val secretKey = SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), ALGORITHM)
        val mac = Mac.getInstance(ALGORITHM)
        mac.init(secretKey)
        val rawHmac = mac.doFinal(payload.toByteArray(StandardCharsets.UTF_8))
        return bytesToHex(rawHmac)
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexChars = CharArray(bytes.size * 2)
        for (i in bytes.indices) {
            val v = bytes[i].toInt() and 0xFF
            hexChars[i * 2] = "0123456789abcdef"[v ushr 4]
            hexChars[i * 2 + 1] = "0123456789abcdef"[v and 0x0F]
        }
        return String(hexChars)
    }
}
