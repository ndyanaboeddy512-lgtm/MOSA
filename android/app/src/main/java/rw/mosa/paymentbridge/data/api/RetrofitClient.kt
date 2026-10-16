package rw.mosa.paymentbridge.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import rw.mosa.paymentbridge.data.security.KeystoreManager
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private var currentBaseUrl: String? = null
    private var apiService: MosaApiService? = null

    @Synchronized
    fun getApiService(keystoreManager: KeystoreManager): MosaApiService {
        val serverUrl = keystoreManager.serverUrl
        if (apiService != null && currentBaseUrl == serverUrl) {
            return apiService!!
        }

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl("$serverUrl/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        currentBaseUrl = serverUrl
        apiService = retrofit.create(MosaApiService::class.java)
        return apiService!!
    }
}
