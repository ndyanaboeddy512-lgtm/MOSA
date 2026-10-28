package rw.mosa.paymentbridge.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [QueuedTransaction::class],
    version = 2,
    exportSchema = false
)
abstract class BridgeDatabase : RoomDatabase() {

    abstract fun transactionDao(): TransactionDao

    companion object {
        @Volatile
        private var INSTANCE: BridgeDatabase? = null

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE queued_transactions ADD COLUMN provider TEXT NOT NULL DEFAULT 'MTN_MOMO'")
                db.execSQL("ALTER TABLE queued_transactions ADD COLUMN is_ekash INTEGER NOT NULL DEFAULT 0")
            }
        }

        fun getDatabase(context: Context): BridgeDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    BridgeDatabase::class.java,
                    "mosa_bridge_database"
                )
                    .addMigrations(MIGRATION_1_2)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
