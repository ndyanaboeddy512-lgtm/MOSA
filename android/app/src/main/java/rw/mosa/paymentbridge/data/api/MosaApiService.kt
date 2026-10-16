package rw.mosa.paymentbridge.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import rw.mosa.paymentbridge.data.models.HeartbeatRequest
import rw.mosa.paymentbridge.data.models.HeartbeatResponse
import rw.mosa.paymentbridge.data.models.PairRequest
import rw.mosa.paymentbridge.data.models.PairResponse
import rw.mosa.paymentbridge.data.models.PaymentWebhookPayload
import rw.mosa.paymentbridge.data.models.PaymentWebhookResponse

interface MosaApiService {

    @POST("api/payments/bridge/pair")
    suspend fun pairTerminal(
        @Body request: PairRequest
    ): Response<PairResponse>

    @POST("api/payments/bridge/heartbeat")
    suspend fun sendHeartbeat(
        @Header("Authorization") authHeader: String,
        @Header("x-mosa-device-id") deviceIdHeader: String,
        @Body request: HeartbeatRequest
    ): Response<HeartbeatResponse>

    @POST("api/payments/webhook")
    suspend fun forwardPaymentWebhook(
        @Header("Authorization") authHeader: String,
        @Header("x-mosa-device-id") deviceIdHeader: String,
        @Header("x-signature") hmacSignature: String,
        @Body payload: PaymentWebhookPayload
    ): Response<PaymentWebhookResponse>
}
