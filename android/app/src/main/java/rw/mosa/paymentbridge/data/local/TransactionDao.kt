package rw.mosa.paymentbridge.data.local

import androidx.lifecycle.LiveData
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

@Dao
interface TransactionDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertTransaction(transaction: QueuedTransaction): Long

    @Query("SELECT * FROM queued_transactions WHERE transaction_id = :txId LIMIT 1")
    suspend fun getTransactionByTxId(txId: String): QueuedTransaction?

    @Query("SELECT * FROM queued_transactions WHERE status = 'PENDING' ORDER BY created_at ASC")
    suspend fun getPendingTransactions(): List<QueuedTransaction>

    @Query("SELECT COUNT(*) FROM queued_transactions WHERE status = 'PENDING'")
    fun getPendingCountLiveData(): LiveData<Int>

    @Query("SELECT COUNT(*) FROM queued_transactions WHERE status = 'SYNCED'")
    fun getSyncedCountLiveData(): LiveData<Int>

    @Query("SELECT * FROM queued_transactions ORDER BY created_at DESC LIMIT :limit")
    fun getRecentTransactionsLiveData(limit: Int = 30): LiveData<List<QueuedTransaction>>

    @Update
    suspend fun updateTransaction(transaction: QueuedTransaction)

    @Query("UPDATE queued_transactions SET status = 'SYNCED', synced_at = :syncedAt, receipt_number = :receiptNumber WHERE id = :id")
    suspend fun markSynced(id: Long, syncedAt: Long, receiptNumber: String?)

    @Query("UPDATE queued_transactions SET status = 'FAILED', last_error = :error, retry_count = retry_count + 1 WHERE id = :id")
    suspend fun markFailed(id: Long, error: String)

    @Query("DELETE FROM queued_transactions WHERE status = 'SYNCED' AND created_at < :olderThanTs")
    suspend fun pruneOldSynced(olderThanTs: Long)
}
