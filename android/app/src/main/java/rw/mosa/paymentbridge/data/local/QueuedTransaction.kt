package rw.mosa.paymentbridge.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "queued_transactions",
    indices = [
        Index(value = ["transaction_id"], unique = true),
        Index(value = ["status"]),
        Index(value = ["created_at"])
    ]
)
data class QueuedTransaction(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "transaction_id")
    val transactionId: String,

    @ColumnInfo(name = "payment_reference")
    val paymentReference: String?,

    @ColumnInfo(name = "amount")
    val amount: Double,

    @ColumnInfo(name = "currency")
    val currency: String = "RWF",

    @ColumnInfo(name = "sender_phone")
    val senderPhone: String?,

    @ColumnInfo(name = "sender_name")
    val senderName: String?,

    @ColumnInfo(name = "raw_sms")
    val rawSms: String,

    @ColumnInfo(name = "status")
    var status: String = STATUS_PENDING,

    @ColumnInfo(name = "retry_count")
    var retryCount: Int = 0,

    @ColumnInfo(name = "last_error")
    var lastError: String? = null,

    @ColumnInfo(name = "receipt_number")
    var receiptNumber: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "synced_at")
    var syncedAt: Long? = null
) {
    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_SYNCED = "SYNCED"
        const val STATUS_FAILED = "FAILED"
        const val STATUS_UNMATCHED = "UNMATCHED"
    }
}
