# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:\Users\...\AppData\Local\Android\sdk/tools/proguard/proguard-android.txt

# Preserve Gson models
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class rw.mosa.paymentbridge.data.models.** { *; }

# Preserve Retrofit interfaces
-keepattributes Signature
-keepattributes *Annotation*
-keep class rw.mosa.paymentbridge.data.api.** { *; }

# Preserve Room Database and entities
-keep class androidx.room.** { *; }
-keep class rw.mosa.paymentbridge.data.local.** { *; }
-dontwarn androidx.room.paging.**

# Preserve WorkManager Workers
-keep class * extends androidx.work.Worker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
-keep class * extends androidx.work.CoroutineWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
