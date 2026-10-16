package rw.mosa.paymentbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import rw.mosa.paymentbridge.sms.MtnSmsParser

class MtnSmsParserTest {

    @Test
    fun testParseKinyarwandaMtnMoMoSms() {
        val sms = "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788123456 (JEAN PAUL) kuri 15/10/2026 10:15. Ref: MOSA-REG-20261015-ABC12. Umubare w'amafaranga asigaye ni 125,000 RWF. Id y'igikorwa: 9876543210."
        val result = MtnSmsParser.parse(sms)

        assertTrue("Should be recognized as a valid MoMo transaction", result.isValidMoMoSms)
        assertEquals(5000.0, result.amount, 0.001)
        assertEquals("RWF", result.currency)
        assertEquals("9876543210", result.providerTransactionRef)
        assertEquals("MOSA-REG-20261015-ABC12", result.paymentReference)
        assertEquals("+250788123456", result.senderPhone)
        assertEquals("JEAN PAUL", result.senderName)
    }

    @Test
    fun testParseEnglishMtnMoMoSms() {
        val sms = "You have received 20,000 RWF from +250788999888 (MUGISHA ALBERT) on 15/10/2026 14:30:00. Transaction ID: 1122334455. Reference: MOSA-REN-20261015-XYZ99. New balance: 85,000 RWF."
        val result = MtnSmsParser.parse(sms)

        assertTrue(result.isValidMoMoSms)
        assertEquals(20000.0, result.amount, 0.001)
        assertEquals("1122334455", result.providerTransactionRef)
        assertEquals("MOSA-REN-20261015-XYZ99", result.paymentReference)
        assertEquals("+250788999888", result.senderPhone)
        assertEquals("MUGISHA ALBERT", result.senderName)
    }

    @Test
    fun testParseAlternativeKinyarwandaFormat() {
        val sms = "Mwakiriye 10,000 RWF ivuye kuri 0788777666. Nimero y'ubwishyu: 5544332211. Impamvu: MOSA-REG-20261015-KGL01."
        val result = MtnSmsParser.parse(sms)

        assertTrue(result.isValidMoMoSms)
        assertEquals(10000.0, result.amount, 0.001)
        assertEquals("5544332211", result.providerTransactionRef)
        assertEquals("MOSA-REG-20261015-KGL01", result.paymentReference)
        assertEquals("0788777666", result.senderPhone)
    }

    @Test
    fun testUnmatchedReferenceHandling() {
        val sms = "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788123456 kuri 15/10/2026. Id y'igikorwa: 99887766."
        val result = MtnSmsParser.parse(sms)

        // Valid MoMo payment, but applicant forgot the MOSA reference
        assertTrue(result.isValidMoMoSms)
        assertEquals(5000.0, result.amount, 0.001)
        assertEquals("99887766", result.providerTransactionRef)
        assertNull("Payment reference should be null when missing in text", result.paymentReference)
    }

    @Test
    fun testRejectPrivateAndPromotionalSms() {
        // Private personal SMS
        val personalSms = "Hey bro, are you still at the office? Let's grab lunch."
        val personalResult = MtnSmsParser.parse(personalSms)
        assertFalse("Personal SMS must not be parsed as MoMo payment", personalResult.isValidMoMoSms)

        // Promotional telecom SMS
        val promoSms = "Koresha MoMo uhabwe amahirwe yo gutsindira imodoka nshya! Kanda *182*5#."
        val promoResult = MtnSmsParser.parse(promoSms)
        assertFalse("Promotional broadcast SMS must not be parsed as MoMo payment", promoResult.isValidMoMoSms)
    }

    @Test
    fun testMtnSenderWhitelist() {
        assertTrue(MtnSmsParser.isMtnSender("MTN"))
        assertTrue(MtnSmsParser.isMtnSender("mtn"))
        assertTrue(MtnSmsParser.isMtnSender("182"))
        assertTrue(MtnSmsParser.isMtnSender("MTNMOMORW"))
        assertTrue(MtnSmsParser.isMtnSender("M-Money"))
        assertTrue(MtnSmsParser.isMtnSender("+250182"))

        // Must reject non-whitelisted senders to protect user privacy
        assertFalse(MtnSmsParser.isMtnSender("+250788123456"))
        assertFalse(MtnSmsParser.isMtnSender("+250788000111"))
        assertFalse(MtnSmsParser.isMtnSender("RandomSender"))
        assertFalse(MtnSmsParser.isMtnSender(null))
        assertFalse(MtnSmsParser.isMtnSender(""))
    }
}
