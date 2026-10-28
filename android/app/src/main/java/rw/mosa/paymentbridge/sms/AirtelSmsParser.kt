package rw.mosa.paymentbridge.sms

import rw.mosa.paymentbridge.data.models.ParsedSmsResult
import java.util.regex.Pattern

/**
 * Airtel Money & eKash Rwanda SMS Parser Utility for Android Bridge Terminal.
 * 
 * Handles incoming telecom SMS notifications for:
 * 1. Direct Airtel Money Rwanda transfers (P2P, Cash-In, Merchant Till)
 * 2. eKash Interoperable cross-network transfers (MTN MoMo -> Airtel Money)
 * In both Kinyarwanda and English formats.
 * 
 * CRITICAL SETTLEMENT INVARIANT:
 * Parsing an SMS on the bridge device does NOT constitute settlement or payment confirmation.
 * The parsed result is merely an unverified candidate transaction queued for backend validation.
 * Full settlement requires the backend to verify the pending database record, expected fee amount,
 * currency (RWF), reference matching, and transaction ID uniqueness.
 */
object AirtelSmsParser {

    // 1. Amount & Currency Pattern
    // Matches: "5,000 RWF", "5000 RWF", "5,000.00 RWF", "5000FRW", "5000 Rwf", "amafaranga 5,000 RWF"
    private val AMOUNT_PATTERN = Pattern.compile(
        "(?:amafaranga\\s+)?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)\\s*(?:RWF|FRW|Rwf)",
        Pattern.CASE_INSENSITIVE
    )

    // 2. Sender Phone & Optional Name Patterns
    // Format A: "yavuye kuri 250733123456 (JEAN BAPTISTE)" or "from 250733123456 (JEAN BAPTISTE)"
    private val SENDER_PATTERN_A = Pattern.compile(
        "(?:yavuye kuri|from)\\s+([0-9+]+)(?:\\s*\\(([^)]+)\\))?",
        Pattern.CASE_INSENSITIVE
    )
    // Format B: "kuri JEAN BAPTISTE (250733123456)" or "from JEAN BAPTISTE (250733123456)"
    private val SENDER_PATTERN_B = Pattern.compile(
        "(?:yavuye kuri|from|kuri)\\s+([A-Za-z\\s]+)\\s*\\(([0-9+]+)\\)",
        Pattern.CASE_INSENSITIVE
    )

    // 3. MOSA Reference (Registration or Annual Renewal)
    // Matches: "Impamvu: MOSA-REG-20261026-ABC12", "Ref: MOSA-REG-...", "Reason: MOSA-REN-...", standalone
    private val REFERENCE_PATTERN = Pattern.compile(
        "(?:(?:Ref(?:erence)?|Impamvu|Reason)[:\\s]+)?(MOSA-(?:REG|REN)-[A-Z0-9-]+)",
        Pattern.CASE_INSENSITIVE
    )

    // 4. Telecom Transaction Identifier
    // Matches: "Txn ID: AM261026.1234.A12345", "Nimero y'icyemezo: ...", "Id y'igikorwa: ...", "TxId: ...", "Transaction ID: ..."
    private val TX_ID_PATTERN = Pattern.compile(
        "(?:Txn\\s*ID|Transaction\\s*ID|Nimero\\s*y['']icyemezo|Id\\s*y['']igikorwa|TxId|Financial\\s*Transaction\\s*Id)[:\\s]+([0-9A-Za-z\\.\\-_]+)",
        Pattern.CASE_INSENSITIVE
    )

    // 5. Account Balance
    // Matches: "Amafaranga asigaye ni: 125,000 RWF", "Balance yawe nshya ni 125,000 RWF", "Your new balance is: 125,000 RWF"
    private val BALANCE_PATTERN = Pattern.compile(
        "(?:Amafaranga asigaye ni|Balance yawe nshya ni|Your new balance(?:\\s*is)?|New balance|Balance)[:\\s]+(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)\\s*RWF",
        Pattern.CASE_INSENSITIVE
    )

    // Configurable Telecom Allowlist
    private val ALLOWED_AIRTEL_SENDERS = setOf(
        "AIRTELMONEY",
        "AIRTEL-MONEY",
        "AIRTEL",
        "AIRTELRWANDA",
        "182",
        "EKASH",
        "RNDPS"
    )

    /**
     * Whitelist check: Ensures originating address belongs to official Airtel Rwanda / eKash gateway.
     * Rejects non-official senders to protect user privacy and discard unverified/spoofed texts.
     */
    fun isAirtelSender(originatingAddress: String?): Boolean {
        if (originatingAddress.isNullOrBlank()) return false
        val clean = originatingAddress.trim().uppercase()
        return ALLOWED_AIRTEL_SENDERS.contains(clean) || clean.endsWith("182")
    }

    /**
     * Parses an incoming direct Airtel Money SMS (P2P, Cash-in, Merchant Till).
     */
    fun parseDirectAirtel(smsText: String): ParsedSmsResult {
        return parseInternal(smsText, forceEkash = false)
    }

    /**
     * Parses an incoming cross-network eKash interoperable SMS (e.g. from MTN MoMo to Airtel).
     */
    fun parseEkash(smsText: String): ParsedSmsResult {
        return parseInternal(smsText, forceEkash = true)
    }

    /**
     * Auto-detecting parser: automatically checks for eKash indicators, otherwise treats as direct Airtel Money.
     */
    fun parse(smsText: String): ParsedSmsResult {
        if (smsText.isBlank()) {
            return ParsedSmsResult(
                isValidMoMoSms = false,
                rawText = smsText,
                provider = "AIRTEL_MONEY",
                isEkash = false
            )
        }

        val text = smsText.trim()
        val isEkash = text.contains("eKash", ignoreCase = true) ||
                text.contains("binyuze kuri MTN", ignoreCase = true) ||
                text.contains("via MTN", ignoreCase = true)

        return parseInternal(text, forceEkash = isEkash)
    }

    private fun parseInternal(smsText: String, forceEkash: Boolean): ParsedSmsResult {
        if (smsText.isBlank()) {
            return ParsedSmsResult(
                isValidMoMoSms = false,
                rawText = smsText,
                provider = "AIRTEL_MONEY",
                isEkash = forceEkash
            )
        }

        val text = smsText.trim()
        var amount = 0.0
        var senderPhone: String? = null
        var senderName: String? = null
        var paymentReference: String? = null
        var providerTxRef: String? = null
        var balance: Double? = null

        // 1. Extract Amount
        val amountMatcher = AMOUNT_PATTERN.matcher(text)
        if (amountMatcher.find()) {
            val amountStr = amountMatcher.group(1)?.replace(",", "")
            amount = amountStr?.toDoubleOrNull() ?: 0.0
        }

        // 2. Extract Sender
        val senderMatcherA = SENDER_PATTERN_A.matcher(text)
        val senderMatcherB = SENDER_PATTERN_B.matcher(text)
        if (senderMatcherA.find()) {
            senderPhone = senderMatcherA.group(1)?.trim()
            senderName = senderMatcherA.group(2)?.trim()
        } else if (senderMatcherB.find()) {
            senderName = senderMatcherB.group(1)?.trim()
            senderPhone = senderMatcherB.group(2)?.trim()
        }

        // 3. Extract MOSA Reference
        val refMatcher = REFERENCE_PATTERN.matcher(text)
        if (refMatcher.find()) {
            val rawRef = refMatcher.group(1)?.trim()
            paymentReference = rawRef?.replace(Regex("[\\.,;:!]+$"), "")?.uppercase()?.trim()
        }

        // 4. Extract Telecom Transaction ID
        val txMatcher = TX_ID_PATTERN.matcher(text)
        if (txMatcher.find()) {
            val rawTx = txMatcher.group(1)?.trim()
            providerTxRef = rawTx?.replace(Regex("[\\.,;:!]+$"), "")?.trim()
        }

        // 5. Extract Account Balance
        val balanceMatcher = BALANCE_PATTERN.matcher(text)
        if (balanceMatcher.find()) {
            val balanceStr = balanceMatcher.group(1)?.replace(",", "")
            balance = balanceStr?.toDoubleOrNull()
        }

        // Strict syntax validation: must have positive amount and transaction ID
        val isValid = amount > 0.0 && !providerTxRef.isNullOrBlank()

        return ParsedSmsResult(
            isValidMoMoSms = isValid,
            paymentReference = paymentReference,
            providerTransactionRef = providerTxRef,
            amount = amount,
            currency = "RWF",
            senderPhone = senderPhone,
            senderName = senderName,
            rawText = text,
            provider = "AIRTEL_MONEY",
            isEkash = forceEkash,
            balance = balance
        )
    }
}
