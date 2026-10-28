package rw.mosa.paymentbridge

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import rw.mosa.paymentbridge.data.local.BridgeDatabase
import rw.mosa.paymentbridge.data.local.QueuedTransaction
import rw.mosa.paymentbridge.data.models.PaymentWebhookPayload
import rw.mosa.paymentbridge.data.security.HmacUtil
import rw.mosa.paymentbridge.sms.AirtelSmsParser
import rw.mosa.paymentbridge.sms.CarrierResolution
import rw.mosa.paymentbridge.sms.MtnSmsParser
import rw.mosa.paymentbridge.sms.TelecomProviderDetector

class ProviderSyncTest {

    private val gson = Gson()

    @Test
    fun testQueuedTransactionV1DefaultValues() {
        // Simulating how v1 code created transactions without provider/isEkash
        val tx = QueuedTransaction(
            transactionId = "MTN_TX_12345",
            paymentReference = "MOSA-REG-1234",
            amount = 5000.0,
            currency = "RWF",
            senderPhone = "+250788111222",
            senderName = "MUGISHA Jean",
            rawSms = "Yello! Mwakiriye 5,000 RWF...",
            status = QueuedTransaction.STATUS_PENDING
        )

        assertEquals("MTN_MOMO", tx.provider)
        assertFalse(tx.isEkash)
        assertEquals(QueuedTransaction.PROVIDER_MTN_MOMO, tx.provider)
        assertEquals("MOSA-REG-1234", tx.paymentReference)
        assertEquals(5000.0, tx.amount, 0.001)
        assertEquals("RWF", tx.currency)
    }

    @Test
    fun testQueuedTransactionExplicitAirtelAndEkashValues() {
        val airtelTx = QueuedTransaction(
            transactionId = "AIRTEL_TX_12345",
            paymentReference = "MOSA-REG-5678",
            amount = 10000.0,
            currency = "RWF",
            provider = QueuedTransaction.PROVIDER_AIRTEL_MONEY,
            isEkash = false,
            senderPhone = "+250730000000",
            senderName = "UWASE Alice",
            rawSms = "You have received 10,000 RWF...",
            status = QueuedTransaction.STATUS_PENDING
        )

        assertEquals("AIRTEL_MONEY", airtelTx.provider)
        assertFalse(airtelTx.isEkash)

        val ekashTx = QueuedTransaction(
            transactionId = "EKASH_TX_99999",
            paymentReference = "MOSA-REG-9999",
            amount = 7500.0,
            currency = "RWF",
            provider = QueuedTransaction.PROVIDER_AIRTEL_MONEY,
            isEkash = true,
            senderPhone = "+250788333444",
            senderName = "BIZIMANA David",
            rawSms = "Mwakiriye 7,500 RWF kuva kuri 250788333444 binyuze muri eKash...",
            status = QueuedTransaction.STATUS_PENDING
        )

        assertEquals("AIRTEL_MONEY", ekashTx.provider)
        assertTrue(ekashTx.isEkash)
    }

    @Test
    fun testPaymentWebhookPayloadSerializationMtn() {
        val mtnPayload = PaymentWebhookPayload(
            provider = "MTN_MOMO",
            paymentReference = "MOSA-REG-20261015-TEST",
            providerTransactionRef = "MOMO1729000000",
            amount = 5000.0,
            currency = "RWF",
            phoneNumber = "+250788111222",
            rawSms = "Yello! Mwakiriye 5,000 RWF...",
            bridgeDeviceId = "bridge-dev-001",
            timestamp = "2026-10-26T12:00:00.000Z"
        )

        val json = gson.toJson(mtnPayload)
        assertTrue(json.contains("\"provider\":\"MTN_MOMO\""))
        assertTrue(json.contains("\"providerTransactionRef\":\"MOMO1729000000\""))
        assertTrue(json.contains("\"paymentReference\":\"MOSA-REG-20261015-TEST\""))

        // Verify HMAC produces valid 64-char hex
        val secret = "test_hmac_secret_key"
        val signature = HmacUtil.computeHmacSha256(json, secret)
        assertEquals(64, signature.length)
    }

    @Test
    fun testPaymentWebhookPayloadSerializationAirtel() {
        val airtelPayload = PaymentWebhookPayload(
            provider = "AIRTEL_MONEY",
            paymentReference = "MOSA-REG-20261026-AIR1",
            providerTransactionRef = "AM261026.1234.SIM01",
            amount = 8000.0,
            currency = "RWF",
            phoneNumber = "+250730000000",
            rawSms = "You have received 8,000 RWF...",
            bridgeDeviceId = "bridge-dev-001",
            timestamp = "2026-10-26T12:00:00.000Z"
        )

        val json = gson.toJson(airtelPayload)
        assertTrue(json.contains("\"provider\":\"AIRTEL_MONEY\""))
        assertTrue(json.contains("\"providerTransactionRef\":\"AM261026.1234.SIM01\""))

        val secret = "test_hmac_secret_key"
        val signature = HmacUtil.computeHmacSha256(json, secret)
        assertEquals(64, signature.length)
    }

    @Test
    fun testProviderRoutingFromParsers() {
        // 1. MTN MoMo routing
        val mtnSms = "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788111222 (TEST USER). Ref: MOSA-REG-1234. Umubare w'amafaranga asigaye ni 250,000 RWF. Id y'igikorwa: MOMO98765."
        val mtnParsed = MtnSmsParser.parse(mtnSms)
        assertTrue(mtnParsed.isValidMoMoSms)
        assertEquals("MTN_MOMO", mtnParsed.provider)
        assertFalse(mtnParsed.isEkash)

        val mtnQueued = QueuedTransaction(
            transactionId = mtnParsed.providerTransactionRef!!,
            paymentReference = mtnParsed.paymentReference,
            amount = mtnParsed.amount,
            currency = mtnParsed.currency,
            provider = mtnParsed.provider,
            isEkash = mtnParsed.isEkash,
            senderPhone = mtnParsed.senderPhone,
            senderName = mtnParsed.senderName,
            rawSms = mtnSms
        )
        assertEquals("MTN_MOMO", mtnQueued.provider)
        assertFalse(mtnQueued.isEkash)

        // 2. Direct Airtel Money routing
        val airtelSms = "You have received 5,000 RWF from 250730000000, MUGISHA JEAN. TxId: AM261026.1234.SIM01. Ref: MOSA-REG-1234. Your new balance: 125,000 RWF."
        val airtelParsed = AirtelSmsParser.parse(airtelSms)
        assertTrue(airtelParsed.isValidMoMoSms)
        assertEquals("AIRTEL_MONEY", airtelParsed.provider)
        assertFalse(airtelParsed.isEkash)

        val airtelQueued = QueuedTransaction(
            transactionId = airtelParsed.providerTransactionRef!!,
            paymentReference = airtelParsed.paymentReference,
            amount = airtelParsed.amount,
            currency = airtelParsed.currency,
            provider = airtelParsed.provider,
            isEkash = airtelParsed.isEkash,
            senderPhone = airtelParsed.senderPhone,
            senderName = airtelParsed.senderName,
            rawSms = airtelSms
        )
        assertEquals("AIRTEL_MONEY", airtelQueued.provider)
        assertFalse(airtelQueued.isEkash)

        // 3. eKash routing
        val ekashSms = "Mwakiriye 5,000 RWF kuva kuri 250788000000 (MUGISHA JEAN) binyuze muri eKash. TxId: EK261026.1234.SIM01. Ref: MOSA-REG-1234. Umubare mushya: 125,000 RWF."
        val ekashParsed = AirtelSmsParser.parse(ekashSms)
        assertTrue(ekashParsed.isValidMoMoSms)
        assertEquals("AIRTEL_MONEY", ekashParsed.provider)
        assertTrue(ekashParsed.isEkash)

        val ekashQueued = QueuedTransaction(
            transactionId = ekashParsed.providerTransactionRef!!,
            paymentReference = ekashParsed.paymentReference,
            amount = ekashParsed.amount,
            currency = ekashParsed.currency,
            provider = ekashParsed.provider,
            isEkash = ekashParsed.isEkash,
            senderPhone = ekashParsed.senderPhone,
            senderName = ekashParsed.senderName,
            rawSms = ekashSms
        )
        assertEquals("AIRTEL_MONEY", ekashQueued.provider)
        assertTrue(ekashQueued.isEkash)
    }

    @Test
    fun testMigration1To2SqlDefinition() {
        assertEquals(1, BridgeDatabase.MIGRATION_1_2.startVersion)
        assertEquals(2, BridgeDatabase.MIGRATION_1_2.endVersion)

        val executedSql = mutableListOf<String>()
        val handler = java.lang.reflect.InvocationHandler { _, method, args ->
            if (method.name == "execSQL" && args != null && args.isNotEmpty()) {
                executedSql.add(args[0] as String)
            }
            null
        }
        val mockDb = java.lang.reflect.Proxy.newProxyInstance(
            androidx.sqlite.db.SupportSQLiteDatabase::class.java.classLoader,
            arrayOf(androidx.sqlite.db.SupportSQLiteDatabase::class.java),
            handler
        ) as androidx.sqlite.db.SupportSQLiteDatabase

        BridgeDatabase.MIGRATION_1_2.migrate(mockDb)

        assertEquals(2, executedSql.size)
        assertTrue(
            executedSql.any { it.contains("ADD COLUMN provider") && it.contains("DEFAULT 'MTN_MOMO'") }
        )
        assertTrue(
            executedSql.any { it.contains("ADD COLUMN is_ekash") && it.contains("DEFAULT 0") }
        )
    }

    @Test
    fun testMigrationOnRealSqliteV1DatabaseFixture() {
        // Enforce SQLite JDBC presence — fails loudly if driver missing, never silently skips
        Class.forName("org.sqlite.JDBC")

        val conn = java.sql.DriverManager.getConnection("jdbc:sqlite::memory:")
        val stmt = conn.createStatement()

        // 1. Create exact Version 1 schema (without provider, without is_ekash)
        stmt.execute("""
            CREATE TABLE queued_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                transaction_id TEXT NOT NULL,
                payment_reference TEXT,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'RWF',
                sender_phone TEXT,
                sender_name TEXT,
                raw_sms TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                retry_count INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                receipt_number TEXT,
                created_at INTEGER NOT NULL,
                synced_at INTEGER
            )
        """.trimIndent())

        // 2. Insert existing V1 historical transactions
        stmt.execute("""
            INSERT INTO queued_transactions (
                transaction_id, payment_reference, amount, currency,
                sender_phone, sender_name, raw_sms, status,
                retry_count, last_error, receipt_number, created_at, synced_at
            ) VALUES (
                'MOMO1001', 'MOSA-REG-HIST-01', 5000.0, 'RWF',
                '+250788111222', 'MUGISHA Jean', 'Yello! 5,000 RWF received...', 'SYNCED',
                0, NULL, 'RCP-202610-0001', 1729000000000, 1729000010000
            )
        """.trimIndent())

        stmt.execute("""
            INSERT INTO queued_transactions (
                transaction_id, payment_reference, amount, currency,
                sender_phone, sender_name, raw_sms, status,
                retry_count, last_error, receipt_number, created_at, synced_at
            ) VALUES (
                'MOMO1002', 'MOSA-REG-HIST-02', 10000.0, 'RWF',
                '+250788333444', 'UWASE Marie', 'Yello! 10,000 RWF received...', 'PENDING',
                1, 'HTTP 500: Server Busy', NULL, 1729000020000, NULL
            )
        """.trimIndent())

        // 3. Wrap JDBC connection with SupportSQLiteDatabase proxy
        val handler = java.lang.reflect.InvocationHandler { _, method, args ->
            if (method.name == "execSQL" && args != null && args.isNotEmpty()) {
                stmt.execute(args[0] as String)
            }
            null
        }
        val supportDb = java.lang.reflect.Proxy.newProxyInstance(
            androidx.sqlite.db.SupportSQLiteDatabase::class.java.classLoader,
            arrayOf(androidx.sqlite.db.SupportSQLiteDatabase::class.java),
            handler
        ) as androidx.sqlite.db.SupportSQLiteDatabase

        // 4. Run Room Migration 1 -> 2
        BridgeDatabase.MIGRATION_1_2.migrate(supportDb)

        // 5. Verify columns added with correct defaults
        val pragmaRs = stmt.executeQuery("PRAGMA table_info(queued_transactions)")
        val columns = mutableMapOf<String, String>()
        while (pragmaRs.next()) {
            columns[pragmaRs.getString("name")] = pragmaRs.getString("type")
        }
        assertTrue("Column 'provider' must exist in v2", columns.containsKey("provider"))
        assertTrue("Column 'is_ekash' must exist in v2", columns.containsKey("is_ekash"))

        // 6. Verify existing historical records preserved and defaulted to MTN_MOMO
        val rs1 = stmt.executeQuery("SELECT * FROM queued_transactions WHERE transaction_id = 'MOMO1001'")
        assertTrue(rs1.next())
        assertEquals("MTN_MOMO", rs1.getString("provider"))
        assertEquals(0, rs1.getInt("is_ekash"))
        assertEquals("MOSA-REG-HIST-01", rs1.getString("payment_reference"))
        assertEquals(5000.0, rs1.getDouble("amount"), 0.001)
        assertEquals("SYNCED", rs1.getString("status"))
        assertEquals("RCP-202610-0001", rs1.getString("receipt_number"))
        assertEquals(1729000010000L, rs1.getLong("synced_at"))

        val rs2 = stmt.executeQuery("SELECT * FROM queued_transactions WHERE transaction_id = 'MOMO1002'")
        assertTrue(rs2.next())
        assertEquals("MTN_MOMO", rs2.getString("provider"))
        assertEquals(0, rs2.getInt("is_ekash"))
        assertEquals("PENDING", rs2.getString("status"))
        assertEquals("HTTP 500: Server Busy", rs2.getString("last_error"))
        assertEquals(1, rs2.getInt("retry_count"))

        // 7. Verify new V2 records can be inserted with AIRTEL_MONEY and is_ekash = 1
        stmt.execute("""
            INSERT INTO queued_transactions (
                transaction_id, payment_reference, amount, currency, provider, is_ekash,
                sender_phone, sender_name, raw_sms, status, created_at
            ) VALUES (
                'AIRTEL2001', 'MOSA-REG-AIRTEL-01', 5000.0, 'RWF', 'AIRTEL_MONEY', 1,
                '+250730000000', 'BIZIMANA David', 'Mwakiriye 5000 RWF binyuze muri eKash...', 'PENDING', 1729000030000
            )
        """.trimIndent())

        val rs3 = stmt.executeQuery("SELECT * FROM queued_transactions WHERE transaction_id = 'AIRTEL2001'")
        assertTrue(rs3.next())
        assertEquals("AIRTEL_MONEY", rs3.getString("provider"))
        assertEquals(1, rs3.getInt("is_ekash"))

        conn.close()
    }

    @Test
    fun testResolveCarrierAlphanumericSenders() {
        val dummyBody = "Mwakiriye 5,000 RWF..."

        assertEquals(CarrierResolution.MTN_MOMO, TelecomProviderDetector.resolveCarrier("MTNMOMORW", dummyBody))
        assertEquals(CarrierResolution.MTN_MOMO, TelecomProviderDetector.resolveCarrier("MTN", dummyBody))
        assertEquals(CarrierResolution.MTN_MOMO, TelecomProviderDetector.resolveCarrier("M-MONEY", dummyBody))

        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("AIRTELMONEY", dummyBody))
        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("AIRTEL", dummyBody))
        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("EKASH", dummyBody))
        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("RNDPS", dummyBody))

        assertEquals(CarrierResolution.UNTRUSTED, TelecomProviderDetector.resolveCarrier("+250788111222", dummyBody))
        assertEquals(CarrierResolution.UNTRUSTED, TelecomProviderDetector.resolveCarrier("BK_ALERT", dummyBody))
        assertEquals(CarrierResolution.UNTRUSTED, TelecomProviderDetector.resolveCarrier("", dummyBody))
        assertEquals(CarrierResolution.UNTRUSTED, TelecomProviderDetector.resolveCarrier(null, dummyBody))
    }

    @Test
    fun testResolveCarrierNumeric182WithExplicitEvidence() {
        // 1. Identifiable MTN MoMo via "Yello!"
        val mtnYello = "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788111222. Ref: MOSA-REG-1234. Id y'igikorwa: MOMO98765."
        assertEquals(CarrierResolution.MTN_MOMO, TelecomProviderDetector.resolveCarrier("182", mtnYello))

        // 2. Identifiable MTN MoMo via "kuri konti yawe ya MTN"
        val mtnAccount = "Mwakiriye 5,000 RWF kuri konti yawe ya MTN MoMo. Ref: MOSA-REG-1234. Id: 98765."
        assertEquals(CarrierResolution.MTN_MOMO, TelecomProviderDetector.resolveCarrier("182", mtnAccount))

        // 3. Identifiable Direct Airtel via "on your Airtel Money account"
        val airtelText = "You have received 5,000 RWF from 250733123456 on your Airtel Money account. Txn ID: AM261026.1234. Ref: MOSA-REG-1234."
        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("182", airtelText))

        // 4. Identifiable Direct Airtel via AM transaction ID prefix
        val airtelAmPrefix = "Mwakiriye 5,000 RWF yavuye kuri 250733123456. TxId: AM261026.1234.SIM01. Ref: MOSA-REG-1234."
        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("182", airtelAmPrefix))

        // 5. Identifiable eKash via "eKash" (even when mentioning MTN originating network)
        val ekashText = "eKash: Mwakiriye 5,000 RWF yavuye kuri 250788123456 binyuze kuri MTN MoMo. Txn ID: EK261026.SIM03. Ref: MOSA-REG-1234."
        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("182", ekashText))

        // 6. Senders ending with 182 (e.g. telecom gateways +250182)
        assertEquals(CarrierResolution.MTN_MOMO, TelecomProviderDetector.resolveCarrier("+250182", mtnYello))
        assertEquals(CarrierResolution.AIRTEL_MONEY, TelecomProviderDetector.resolveCarrier("+250182", airtelText))
    }

    @Test
    fun testResolveCarrierNumeric182AmbiguousLeavesUnmatched() {
        // Generic financial SMS from 182 with NO carrier keywords or prefixes
        val genericSms = "Mwakiriye 5,000 RWF yavuye kuri 250788111222. Ref: MOSA-REG-1234. Id: 987654321."
        val resolution = TelecomProviderDetector.resolveCarrier("182", genericSms)
        assertEquals(CarrierResolution.AMBIGUOUS, resolution)

        // Parse using fallback
        val parsed = MtnSmsParser.parse(genericSms)
        assertTrue(parsed.isValidMoMoSms)

        // Verify ambiguity handling: left UNMATCHED, provider UNKNOWN, never marked PENDING
        val isAmbiguous = (resolution == CarrierResolution.AMBIGUOUS)
        val targetStatus = if (isAmbiguous) QueuedTransaction.STATUS_UNMATCHED else QueuedTransaction.STATUS_PENDING
        val targetProvider = if (isAmbiguous) QueuedTransaction.PROVIDER_UNKNOWN else parsed.provider

        val queuedTx = QueuedTransaction(
            transactionId = parsed.providerTransactionRef!!,
            paymentReference = parsed.paymentReference,
            amount = parsed.amount,
            currency = parsed.currency,
            provider = targetProvider,
            senderPhone = parsed.senderPhone,
            senderName = parsed.senderName,
            rawSms = genericSms,
            status = targetStatus,
            lastError = if (isAmbiguous) "AMBIGUOUS_PROVIDER: Sender 182 lacked definitive carrier markers" else null
        )

        assertEquals("UNKNOWN", queuedTx.provider)
        assertEquals(QueuedTransaction.PROVIDER_UNKNOWN, queuedTx.provider)
        assertEquals(QueuedTransaction.STATUS_UNMATCHED, queuedTx.status)
        assertNotNull(queuedTx.lastError)
        assertTrue(queuedTx.lastError!!.contains("AMBIGUOUS_PROVIDER"))

        // Conflicting indicators (e.g. synthetic message with both Yello and Airtel)
        val conflictingSms = "Yello! You received 5,000 RWF on your Airtel Money account. Ref: MOSA-REG-1234. Id: 112233."
        assertEquals(CarrierResolution.AMBIGUOUS, TelecomProviderDetector.resolveCarrier("182", conflictingSms))
    }

    @Test
    fun testAirtelPrimaryPaymentReceivedOnAirtelSimQueuesCorrectly() {
        val receivingSimPhone = "+250729974065"
        val incomingSms = "Mwakiriye 5,000 RWF yavuye kuri $receivingSimPhone (TEST SENDER). Txn ID: AM261027.7777.065. Impamvu: MOSA-REG-20261027-AIR01. Amafaranga asigaye ni 250,000 RWF."

        // 1. Telecom carrier detector verification
        val carrier = TelecomProviderDetector.resolveCarrier("AirtelMoney", incomingSms)
        assertEquals(CarrierResolution.AIRTEL_MONEY, carrier)

        // 2. Airtel financial parser verification
        val parsed = AirtelSmsParser.parse(incomingSms)
        assertTrue(parsed.isValidMoMoSms)
        assertEquals("AM261027.7777.065", parsed.providerTransactionRef)
        assertEquals("MOSA-REG-20261027-AIR01", parsed.paymentReference)
        assertEquals(5000.0, parsed.amount, 0.001)
        assertEquals("RWF", parsed.currency)
        assertEquals("AIRTEL_MONEY", parsed.provider)
        assertEquals(receivingSimPhone, parsed.senderPhone)

        // 3. Room Queue entity persistence format
        val queuedTx = QueuedTransaction(
            transactionId = parsed.providerTransactionRef!!,
            paymentReference = parsed.paymentReference,
            amount = parsed.amount,
            currency = parsed.currency,
            provider = parsed.provider,
            isEkash = parsed.isEkash,
            senderPhone = parsed.senderPhone,
            senderName = parsed.senderName,
            rawSms = incomingSms,
            status = QueuedTransaction.STATUS_PENDING
        )

        assertEquals("AIRTEL_MONEY", queuedTx.provider)
        assertEquals(QueuedTransaction.STATUS_PENDING, queuedTx.status)
        assertEquals("RWF", queuedTx.currency)
        assertEquals(5000.0, queuedTx.amount, 0.001)

        // 4. Webhook synchronization payload generation
        val payload = PaymentWebhookPayload(
            provider = queuedTx.provider,
            paymentReference = queuedTx.paymentReference,
            providerTransactionRef = queuedTx.transactionId,
            amount = queuedTx.amount,
            currency = queuedTx.currency,
            phoneNumber = queuedTx.senderPhone,
            rawSms = queuedTx.rawSms,
            bridgeDeviceId = "bridge_terminal_airtel_01",
            timestamp = "2026-10-27T15:00:00.000Z"
        )

        val json = gson.toJson(payload)
        assertTrue(json.contains("\"provider\":\"AIRTEL_MONEY\""))
        assertTrue(json.contains("\"currency\":\"RWF\""))
        assertTrue(json.contains("\"paymentReference\":\"MOSA-REG-20261027-AIR01\""))
        assertTrue(json.contains("\"providerTransactionRef\":\"AM261027.7777.065\""))
    }
}
