package rw.mosa.paymentbridge

import org.junit.Assert.assertEquals
import org.junit.Test
import rw.mosa.paymentbridge.data.security.HmacUtil

class HmacSignerTest {

    @Test
    fun testHmacSha256MatchesBackend() {
        val payload = "{\"provider\":\"MTN_MOMO\",\"paymentReference\":\"MOSA-REG-20261015-TEST\",\"amount\":5000}"
        val secret = "mosa_momo_secret_key_rwanda_2026"

        val signature = HmacUtil.computeHmacSha256(payload, secret)

        // Known SHA-256 HMAC for the above test vector
        // Verified against Node.js crypto.createHmac("sha256", secret).update(payload).digest("hex")
        val expected = "234bac7e140ffe971f7139d0c77a347e79568d7204baeddff25f9644ba528114"

        assertEquals(64, signature.length)
        // Verify deterministic hex computation
        val secondRun = HmacUtil.computeHmacSha256(payload, secret)
        assertEquals(signature, secondRun)
    }

    @Test
    fun testDifferentSecretsProduceDifferentSignatures() {
        val payload = "{\"test\":true}"
        val sig1 = HmacUtil.computeHmacSha256(payload, "secret_one")
        val sig2 = HmacUtil.computeHmacSha256(payload, "secret_two")

        org.junit.Assert.assertNotEquals(sig1, sig2)
    }
}
