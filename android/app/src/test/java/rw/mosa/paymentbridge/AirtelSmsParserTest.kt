package rw.mosa.paymentbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import rw.mosa.paymentbridge.sms.AirtelSmsParser

/**
 * Unit Tests for Android Airtel Money & eKash SMS Parser.
 * 
 * Uses clearly labeled synthetic test fixtures to test direct Airtel Money
 * and cross-network eKash SMS notifications in Rwanda.
 * 
 * INVARIANT:
 * Parsing an SMS on the Android bridge terminal NEVER automatically confirms a payment
 * or completes settlement. It only extracts candidate parameters for backend validation.
 */
class AirtelSmsParserTest {

    // =========================================================================
    // 1. DIRECT AIRTEL MONEY TESTS
    // =========================================================================

    @Test
    fun testParseDirectAirtelKinyarwanda() {
        val sms = "Mwakiriye 5,000 RWF yavuye kuri 250733123456 (JEAN BAPTISTE). Txn ID: AM261026.1234.SIM01. Impamvu: MOSA-REG-20261026-ABC12. Amafaranga asigaye ni 125,000 RWF."
        val result = AirtelSmsParser.parseDirectAirtel(sms)

        assertTrue("Direct Airtel SMS should be marked valid", result.isValidMoMoSms)
        assertFalse("Direct Airtel should not be flagged as eKash", result.isEkash)
        assertEquals("AIRTEL_MONEY", result.provider)
        assertEquals(5000.0, result.amount, 0.001)
        assertEquals("RWF", result.currency)
        assertEquals("AM261026.1234.SIM01", result.providerTransactionRef)
        assertEquals("MOSA-REG-20261026-ABC12", result.paymentReference)
        assertEquals("250733123456", result.senderPhone)
        assertEquals("JEAN BAPTISTE", result.senderName)
        assertEquals(125000.0, result.balance ?: 0.0, 0.001)
    }

    @Test
    fun testParseDirectAirtelEnglish() {
        val sms = "You have received 5,000 RWF from 250733123456 (JEAN BAPTISTE) on your Airtel Money account. Txn ID: AM261026.1234.SIM02. Ref: MOSA-REG-20261026-ABC12. Your new balance is: 125,000 RWF."
        val result = AirtelSmsParser.parseDirectAirtel(sms)

        assertTrue(result.isValidMoMoSms)
        assertFalse(result.isEkash)
        assertEquals("AIRTEL_MONEY", result.provider)
        assertEquals(5000.0, result.amount, 0.001)
        assertEquals("AM261026.1234.SIM02", result.providerTransactionRef)
        assertEquals("MOSA-REG-20261026-ABC12", result.paymentReference)
        assertEquals("250733123456", result.senderPhone)
        assertEquals("JEAN BAPTISTE", result.senderName)
        assertEquals(125000.0, result.balance ?: 0.0, 0.001)
    }

    @Test
    fun testParseAirtelMerchantTillKinyarwanda() {
        val sms = "Mwakiriye amafaranga 5,000 RWF kuri Konti yawe ya Bucuruzi yavuye kuri 250733987654 (UWASE ALINE). Nimero y'icyemezo: AM261026.5432.C98765. Impamvu: MOSA-REG-20261026-ABC12. Balance: 135,000 RWF."
        val result = AirtelSmsParser.parse(sms)

        assertTrue(result.isValidMoMoSms)
        assertEquals(5000.0, result.amount, 0.001)
        assertEquals("AM261026.5432.C98765", result.providerTransactionRef)
        assertEquals("MOSA-REG-20261026-ABC12", result.paymentReference)
        assertEquals("250733987654", result.senderPhone)
        assertEquals("UWASE ALINE", result.senderName)
        assertEquals(135000.0, result.balance ?: 0.0, 0.001)
    }

    @Test
    fun testParseAnnualRenewalReference() {
        val sms = "Mwakiriye 5,000 RWF yavuye kuri 250733555666 (HABIMANA PAUL). Id y'igikorwa: AM261026.9999.R0001. Reason: MOSA-REN-20261026-REN01. Amafaranga asigaye ni: 140,000 RWF."
        val result = AirtelSmsParser.parse(sms)

        assertTrue(result.isValidMoMoSms)
        assertEquals("MOSA-REN-20261026-REN01", result.paymentReference)
        assertEquals("AM261026.9999.R0001", result.providerTransactionRef)
    }

    // =========================================================================
    // 2. EKASH INTEROPERABILITY TESTS
    // =========================================================================

    @Test
    fun testParseEkashKinyarwanda() {
        val sms = "eKash: Mwakiriye 5,000 RWF yavuye kuri 250788123456 (MUGABO ERIC) binyuze kuri MTN MoMo. Txn ID: EK261026.SIM03. Impamvu: MOSA-REG-20261026-ABC12. Amafaranga asigaye ni 130,000 RWF."
        val result = AirtelSmsParser.parseEkash(sms)

        assertTrue("eKash notification should be valid", result.isValidMoMoSms)
        assertTrue("eKash flag must be true", result.isEkash)
        assertEquals("AIRTEL_MONEY", result.provider)
        assertEquals(5000.0, result.amount, 0.001)
        assertEquals("EK261026.SIM03", result.providerTransactionRef)
        assertEquals("MOSA-REG-20261026-ABC12", result.paymentReference)
        assertEquals("250788123456", result.senderPhone)
        assertEquals("MUGABO ERIC", result.senderName)
    }

    @Test
    fun testParseEkashEnglish() {
        val sms = "eKash: You have received 5,000 RWF from 250788123456 (MUGABO ERIC) via MTN MoMo. Txn ID: EK261026.SIM04. Ref: MOSA-REN-20261026-XYZ99. New balance: 130,000 RWF."
        val result = AirtelSmsParser.parse(sms) // Auto-detect eKash

        assertTrue(result.isValidMoMoSms)
        assertTrue("Auto-detection should recognize eKash prefix", result.isEkash)
        assertEquals(5000.0, result.amount, 0.001)
        assertEquals("EK261026.SIM04", result.providerTransactionRef)
        assertEquals("MOSA-REN-20261026-XYZ99", result.paymentReference)
        assertEquals("250788123456", result.senderPhone)
    }

    // =========================================================================
    // 3. MALFORMED & INCOMPLETE MESSAGE TESTS
    // =========================================================================

    @Test
    fun testMissingTransactionIdRejected() {
        // Amount and ref present, but no telecom transaction identifier
        val sms = "Mwakiriye 5,000 RWF yavuye kuri 250733123456. Impamvu: MOSA-REG-20261026-ABC12."
        val result = AirtelSmsParser.parse(sms)

        assertFalse("Message without transaction ID must be rejected", result.isValidMoMoSms)
        assertNull(result.providerTransactionRef)
    }

    @Test
    fun testMissingOrZeroAmountRejected() {
        // Transaction ID present, but amount is missing
        val sms = "Mwakiriye amafaranga yavuye kuri 250733123456. Txn ID: AM261026.1234.SIM01."
        val result = AirtelSmsParser.parse(sms)

        assertFalse("Message without amount must be rejected", result.isValidMoMoSms)
        assertEquals(0.0, result.amount, 0.001)
    }

    @Test
    fun testRejectNonFinancialText() {
        val personalSms = "Muraho, muzaza mu nama ejo saa tatu za mu gitondo?"
        val result = AirtelSmsParser.parse(personalSms)
        assertFalse("Personal SMS must not be parsed as payment", result.isValidMoMoSms)

        val promoSms = "Shyiramo interineti ya 4G uyu munsi uhabwe inyongera ya 20%. Kanda *500#."
        val promoResult = AirtelSmsParser.parse(promoSms)
        assertFalse("Promotional broadcast must not be parsed as payment", promoResult.isValidMoMoSms)
    }

    @Test
    fun testMissingReferenceHandling() {
        // Valid financial payment received, but payer forgot the reference
        val sms = "Mwakiriye 5,000 RWF yavuye kuri 250733123456 (JEAN BAPTISTE). Txn ID: AM261026.NOREFERENCE. Balance: 125,000 RWF."
        val result = AirtelSmsParser.parse(sms)

        // Syntax is valid for the terminal, but paymentReference is null
        assertTrue(result.isValidMoMoSms)
        assertEquals("AM261026.NOREFERENCE", result.providerTransactionRef)
        assertEquals(5000.0, result.amount, 0.001)
        assertNull("Missing reference must yield null, requiring backend unmatched handling", result.paymentReference)
    }

    @Test
    fun testRejectForeignCurrencies() {
        // USD notification
        val usdSms = "You have received 50 USD from 250733123456. Txn ID: AM12345. Ref: MOSA-REG-20261026-ABC12."
        val usdResult = AirtelSmsParser.parse(usdSms)
        assertFalse("USD transaction must not be accepted as valid RWF payment", usdResult.isValidMoMoSms)
        assertEquals(0.0, usdResult.amount, 0.001)

        // EUR notification
        val eurSms = "Mwakiriye 50 EUR yavuye kuri 250733123456. Txn ID: AM12346. Ref: MOSA-REG-20261026-ABC12."
        val eurResult = AirtelSmsParser.parse(eurSms)
        assertFalse("EUR transaction must not be accepted as valid RWF payment", eurResult.isValidMoMoSms)
        assertEquals(0.0, eurResult.amount, 0.001)

        // KES notification
        val kesSms = "You have received 5,000 KES from 250733123456. Txn ID: AM12347. Ref: MOSA-REG-20261026-ABC12."
        val kesResult = AirtelSmsParser.parse(kesSms)
        assertFalse("KES transaction must not be accepted as valid RWF payment", kesResult.isValidMoMoSms)
        assertEquals(0.0, kesResult.amount, 0.001)
    }

    @Test
    fun testNegativeOrDebitAmountRejected() {
        // Negative amount string without positive currency match
        val sms1 = "Igikorwa cyagabanutseho: -5,000. Txn ID: AM12345. Ref: MOSA-REG-20261026-ABC12."
        val res1 = AirtelSmsParser.parse(sms1)
        assertFalse("Negative deduction string must be rejected", res1.isValidMoMoSms)
        assertEquals(0.0, res1.amount, 0.001)

        // Debit adjustment notification without valid credit amount
        val sms2 = "Konti yawe yagabanutseho amafaranga -5,000. Txn ID: AM12346."
        val res2 = AirtelSmsParser.parse(sms2)
        assertFalse("Debit adjustment must be rejected", res2.isValidMoMoSms)
        assertEquals(0.0, res2.amount, 0.001)
    }

    @Test
    fun testMalformedReferenceProducesNoUsableCandidateReference() {
        // Missing hyphen: MOSA12345
        val sms1 = "Mwakiriye 5,000 RWF yavuye kuri 250733123456. Txn ID: AM12345. Ref: MOSA12345."
        val res1 = AirtelSmsParser.parse(sms1)
        assertNull("Reference without hyphen (MOSA12345) must not match", res1.paymentReference)

        // Invalid prefix: INVALID-12345
        val sms2 = "Mwakiriye 5,000 RWF yavuye kuri 250733123456. Txn ID: AM12346. Ref: INVALID-12345."
        val res2 = AirtelSmsParser.parse(sms2)
        assertNull("Reference with invalid prefix must not match", res2.paymentReference)

        // Unknown type: MOSA-UNKNOWN-12345
        val sms3 = "Mwakiriye 5,000 RWF yavuye kuri 250733123456. Txn ID: AM12347. Ref: MOSA-UNKNOWN-12345."
        val res3 = AirtelSmsParser.parse(sms3)
        assertNull("Reference with unknown type must not match", res3.paymentReference)

        // Incomplete: MOSA-REG-
        val sms4 = "Mwakiriye 5,000 RWF yavuye kuri 250733123456. Txn ID: AM12348. Ref: MOSA-REG-."
        val res4 = AirtelSmsParser.parse(sms4)
        assertNull("Incomplete reference without identifier must not match", res4.paymentReference)
    }

    // =========================================================================
    // 4. TELECOM SENDER WHITELIST TESTS
    // =========================================================================

    @Test
    fun testAirtelSenderWhitelist() {
        // Authorized telecom senders
        assertTrue(AirtelSmsParser.isAirtelSender("AirtelMoney"))
        assertTrue(AirtelSmsParser.isAirtelSender("AIRTELMONEY"))
        assertTrue(AirtelSmsParser.isAirtelSender("airtelmoney"))
        assertTrue(AirtelSmsParser.isAirtelSender("Airtel-Money"))
        assertTrue(AirtelSmsParser.isAirtelSender("Airtel"))
        assertTrue(AirtelSmsParser.isAirtelSender("AirtelRwanda"))
        assertTrue(AirtelSmsParser.isAirtelSender("182"))
        assertTrue(AirtelSmsParser.isAirtelSender("eKash"))
        assertTrue(AirtelSmsParser.isAirtelSender("RNDPS"))
        assertTrue(AirtelSmsParser.isAirtelSender("+250182"))

        // Unauthorized / Personal / Spoofed senders
        assertFalse(AirtelSmsParser.isAirtelSender("+250733123456"))
        assertFalse(AirtelSmsParser.isAirtelSender("0733123456"))
        assertFalse(AirtelSmsParser.isAirtelSender("SPAMMER"))
        assertFalse(AirtelSmsParser.isAirtelSender("BANK_OF_KIGALI"))
        assertFalse(AirtelSmsParser.isAirtelSender(null))
        assertFalse(AirtelSmsParser.isAirtelSender(""))
    }

    // =========================================================================
    // 5. SETTLEMENT INVARIANT ASSERTION
    // =========================================================================

    @Test
    fun testParsingDoesNotConstituteSettlementInvariant() {
        // Even a perfectly parsed SMS produces only a candidate transaction.
        // It does not mark payment settled or confirmed.
        val sms = "Mwakiriye 5,000 RWF yavuye kuri 250733123456 (JEAN BAPTISTE). Txn ID: AM261026.TEST. Impamvu: MOSA-REG-20261026-ABC12."
        val result = AirtelSmsParser.parse(sms)

        assertTrue(result.isValidMoMoSms)
        // Settlement verification requires backend confirmation
        assertEquals("AIRTEL_MONEY", result.provider)
        assertEquals("MOSA-REG-20261026-ABC12", result.paymentReference)
        assertEquals("AM261026.TEST", result.providerTransactionRef)
        // Ensure no local receipt generation occurs during parsing
        assertEquals("RWF", result.currency)
    }
}
