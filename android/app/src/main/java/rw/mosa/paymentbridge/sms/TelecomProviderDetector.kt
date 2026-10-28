package rw.mosa.paymentbridge.sms

/**
 * Resolution outcome for inbound telecom financial SMS notifications.
 */
enum class CarrierResolution {
    MTN_MOMO,
    AIRTEL_MONEY,
    AMBIGUOUS,
    UNTRUSTED
}

/**
 * Carrier disambiguation utility for Android Payment Bridge.
 * 
 * Safely resolves carrier identity when inbound telecom SMS messages originate
 * from alphanumeric headers (e.g. "MTNMOMORW", "AIRTELMONEY") or the shared Rwandan
 * national financial USSD shortcode "182" (*182#).
 * 
 * Invariant: If a message from shortcode 182 lacks definitive carrier evidence,
 * it is resolved as AMBIGUOUS and must be left UNMATCHED rather than guessing.
 */
object TelecomProviderDetector {

    private val AIRTEL_TX_ID_REGEX = Regex("""\b(?:AM|EK)\d{4,}""", RegexOption.IGNORE_CASE)

    fun resolveCarrier(originatingAddress: String?, smsBody: String): CarrierResolution {
        if (originatingAddress.isNullOrBlank()) return CarrierResolution.UNTRUSTED
        val cleanSender = originatingAddress.trim().uppercase()

        val isNumeric182 = cleanSender == "182" || cleanSender.endsWith("182")
        val isMtnAlpha = cleanSender == "MTN" || cleanSender == "MTNMOMORW" || cleanSender == "M-MONEY"
        val isAirtelAlpha = cleanSender == "AIRTELMONEY" || cleanSender == "AIRTEL-MONEY" ||
                cleanSender == "AIRTEL" || cleanSender == "AIRTELRWANDA" ||
                cleanSender == "EKASH" || cleanSender == "RNDPS"

        if (!isNumeric182 && !isMtnAlpha && !isAirtelAlpha) {
            return CarrierResolution.UNTRUSTED
        }

        // Unambiguous alphanumeric senders
        if (isMtnAlpha && !isAirtelAlpha && !isNumeric182) {
            return CarrierResolution.MTN_MOMO
        }

        if (isAirtelAlpha && !isMtnAlpha && !isNumeric182) {
            return CarrierResolution.AIRTEL_MONEY
        }

        // Shared numeric shortcode 182: inspect SMS body for explicit provider evidence
        val body = smsBody.trim()

        val hasEkash = body.contains("eKash", ignoreCase = true)
        val hasAirtelText = body.contains("Airtel", ignoreCase = true)
        val hasAirtelTxId = AIRTEL_TX_ID_REGEX.containsMatchIn(body)
        val hasAirtelEvidence = hasEkash || hasAirtelText || hasAirtelTxId

        val hasYello = body.contains("Yello", ignoreCase = true)
        val hasMtnText = body.contains("MTNMOMO", ignoreCase = true) ||
                body.contains("MTN MoMo", ignoreCase = true) ||
                body.contains("konti yawe ya MTN", ignoreCase = true) ||
                (body.contains("MTN", ignoreCase = true) && !hasEkash)
        val hasMtnEvidence = hasYello || hasMtnText

        return when {
            // eKash or Airtel markers definitively indicate the receiving wallet is Airtel Money
            hasAirtelEvidence && !hasYello -> CarrierResolution.AIRTEL_MONEY
            // Yello or MTN markers without Airtel/eKash definitively indicate MTN MoMo
            hasMtnEvidence && !hasAirtelEvidence -> CarrierResolution.MTN_MOMO
            // If neither or conflicting: leave ambiguous, never guess
            else -> CarrierResolution.AMBIGUOUS
        }
    }
}
