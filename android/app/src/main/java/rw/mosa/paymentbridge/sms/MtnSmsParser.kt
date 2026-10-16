package rw.mosa.paymentbridge.sms

import rw.mosa.paymentbridge.data.models.ParsedSmsResult
import java.util.regex.Pattern

object MtnSmsParser {

    // 1. Amount & Currency
    private val AMOUNT_PATTERN = Pattern.compile(
        "(\\d{1,3}(?:,\\d{3})*|\\d+)\\s*(?:RWF|FRW|Rwf)",
        Pattern.CASE_INSENSITIVE
    )

    // 2. Sender Phone & Optional Name
    // Matches: "yavuye kuri 250788123456 (JEAN BAPTISTE)", "ivuye kuri +250788123456", "from 0788123456 (NAME)"
    private val SENDER_PATTERN = Pattern.compile(
        "(?:yavuye kuri|ivuye kuri|from)\\s+([0-9+]+)(?:\\s*\\(([^)]+)\\))?",
        Pattern.CASE_INSENSITIVE
    )

    // 3. MOSA Reference (Registration or Annual Renewal)
    // Matches: "Ref: MOSA-REG-20261015-ABCD1", "Impamvu: MOSA-REN-...", or standalone "MOSA-REG-..."
    private val REFERENCE_PATTERN = Pattern.compile(
        "(?:(?:Ref(?:erence)?|Impamvu)[:\\s]+)?(MOSA-(?:REG|REN)-[A-Z0-9-]+)",
        Pattern.CASE_INSENSITIVE
    )

    // 4. Telecom Transaction Identifier
    // Matches: "Id y'igikorwa: 10482910482", "Nimero y'ubwishyu: 10482910482", "Transaction ID: ...", "TxId: ..."
    private val TX_ID_PATTERN = Pattern.compile(
        "(?:Id y'igikorwa|Nimero y'ubwishyu|Financial Transaction Id|Transaction ID|TxId|Id)[:\\s]+([0-9A-Za-z_-]+)",
        Pattern.CASE_INSENSITIVE
    )

    /**
     * Parses an incoming SMS text and extracts financial parameters.
     * Returns ParsedSmsResult with isValidMoMoSms = true only if an amount > 0 and transaction ID exist.
     */
    fun parse(smsText: String): ParsedSmsResult {
        if (smsText.isBlank()) {
            return ParsedSmsResult(isValidMoMoSms = false, rawText = smsText)
        }

        val text = smsText.trim()
        var amount = 0.0
        var senderPhone: String? = null
        var senderName: String? = null
        var paymentReference: String? = null
        var providerTxRef: String? = null

        // 1. Extract Amount
        val amountMatcher = AMOUNT_PATTERN.matcher(text)
        if (amountMatcher.find()) {
            val amountStr = amountMatcher.group(1)?.replace(",", "")
            amount = amountStr?.toDoubleOrNull() ?: 0.0
        }

        // 2. Extract Sender
        val senderMatcher = SENDER_PATTERN.matcher(text)
        if (senderMatcher.find()) {
            senderPhone = senderMatcher.group(1)?.trim()
            senderName = senderMatcher.group(2)?.trim()
        }

        // 3. Extract MOSA Reference
        val refMatcher = REFERENCE_PATTERN.matcher(text)
        if (refMatcher.find()) {
            paymentReference = refMatcher.group(1)?.uppercase()?.trim()
        }

        // 4. Extract Telecom Transaction ID
        val txMatcher = TX_ID_PATTERN.matcher(text)
        if (txMatcher.find()) {
            providerTxRef = txMatcher.group(1)?.trim()
        }

        val isValid = amount > 0.0 && !providerTxRef.isNullOrBlank()

        return ParsedSmsResult(
            isValidMoMoSms = isValid,
            paymentReference = paymentReference,
            providerTransactionRef = providerTxRef,
            amount = amount,
            currency = "RWF",
            senderPhone = senderPhone,
            senderName = senderName,
            rawText = text
        )
    }

    /**
     * Whitelist check: Ensures originating address belongs to official MTN Rwanda Mobile Money.
     * Rejects non-official senders to protect user privacy and block forged messages.
     */
    fun isMtnSender(originatingAddress: String?): Boolean {
        if (originatingAddress.isNullOrBlank()) return false
        val clean = originatingAddress.trim().uppercase()
        return clean == "MTN" ||
                clean == "MTNMOMORW" ||
                clean == "182" ||
                clean == "M-MONEY" ||
                clean.endsWith("182")
    }
}
