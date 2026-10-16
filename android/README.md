# MOSA Android Payment Bridge (Native Kotlin Application)

The **MOSA Android Payment Bridge** is a lightweight, background-resident native Android application designed to run on a dedicated company-owned Android smartphone hosting an MTN Rwanda SIM card.

It intercepts official financial SMS notifications from MTN Rwanda Mobile Money, parses payment details, stores them in an encrypted offline SQLite queue (Room), and securely forwards transaction evidence to the MOSA cloud backend using hardware-backed device credentials and HMAC-SHA256 signatures.

---

## 1. System Architecture

```
[MTN Rwanda GSM Network] 
          │ (SMS Push from "MTN" / "182")
          ▼
[MtnSmsReceiver (BroadcastReceiver)]
          │ (Whitelist validation: MTN/182 only, discards personal SMS)
          ▼
[MtnSmsParser] ──> Dual-language Kinyarwanda/English regex
          │
          ▼
[BridgeDatabase (Room SQLite)] ──> Offline queue (status: PENDING)
          │
          ▼
[SyncPaymentWorker (WorkManager)]
          │ (Calculates HMAC-SHA256 via KeystoreManager)
          ▼
[HTTPS POST: /api/payments/webhook] ──> Neon PostgreSQL (MOSA Backend)
          │
          ▼
[Receipt Generated: MOSA-REC-XXXX] ──> Business Activated / Renewed for 12 Months
```

---

## 2. Requirements & Permissions

### Minimum Hardware
- **Operating System:** Android 8.0 (API level 26) or higher (Android 11–14 recommended).
- **RAM:** Minimum 2GB (runs comfortably on entry-level phones like Samsung Galaxy A05, Tecno Pop 8, Xiaomi Redmi A3).
- **Storage:** < 15MB installed footprint.
- **Power:** Kept connected to AC wall power in the MOSA office/hub, connected to office Wi-Fi with cellular data fallback.

### Android Permissions Declared in `AndroidManifest.xml`
| Permission | Technical Justification |
| :--- | :--- |
| `RECEIVE_SMS` | Intercepts incoming telecom SMS broadcasts via `android.provider.Telephony.SMS_RECEIVED`. |
| `READ_SMS` | Reads full message body from multi-part concatenated SMS segments. |
| `INTERNET` | Transmits authenticated webhook payloads and recurring telemetry heartbeats to MOSA server. |
| `ACCESS_NETWORK_STATE` | WorkManager constraint checking for Wi-Fi/Cellular connectivity before dispatching sync tasks. |
| `RECEIVE_BOOT_COMPLETED` | Automatically restarts periodic heartbeat monitoring if the phone reboots or loses power. |
| `POST_NOTIFICATIONS` | Displays a persistent low-priority foreground status notification on Android 13+ devices. |

> [!NOTE]
> **Why Private Sideloading?**  
> Google Play Store policy strictly restricts `RECEIVE_SMS` to default SMS and phone dialer apps. Because this app is internal infrastructure running exclusively on a dedicated company phone, we **bypass Google Play entirely** and install the APK directly via ADB or private download.

---

## 3. Step-by-Step Installation & Enrollment

### Step 1: Build the APK
Open the `android/` project in Android Studio or compile via command line:
```bash
cd android
./gradlew assembleRelease
```
The compiled APK will be located at:  
`android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Step 2: Sideload onto the Dedicated Phone
Connect the dedicated Android phone via USB and enable **USB Debugging** in Developer Options:
```bash
adb install -r app-release.apk
```
*Alternatively, transfer the APK file to the phone and install via Android Files (enabling "Install from Unknown Sources").*

### Step 3: Grant Permissions & Disable Battery Optimization
1. Launch the **MOSA Bridge** app on the phone.
2. When prompted, tap **Allow** for SMS and Notification permissions.
3. Open **Phone Settings > Apps > MOSA Payment Bridge > Battery**:
   - Set battery usage to **Unrestricted** (or turn off "Put app to sleep").
   - On Samsung / Xiaomi devices, lock the app in the recent apps task switcher.

### Step 4: Pair with MOSA Command Center
1. On your computer, open **MOSA Command Center > Registration & Payments > Bridge Devices**.
2. Click **Enroll New Bridge Device** to generate an 8-character pairing code (e.g. `D07A-6B90`).
3. On the phone, enter the server URL (e.g. `https://mosa.rw`) and the pairing code.
4. Tap **Pair Device & Activate Terminal**.
5. The terminal will securely receive its persistent `deviceId`, `deviceToken`, and `hmacSecret`, wipe the one-time code, and transition to the live dashboard.

---

## 4. Hardware Replacement & Phone Recovery Procedure

If the physical phone is damaged, lost, or replaced with a newer model:

```
[Lost / Broken Phone]                             [Replacement Android Phone]
         │                                                     │
         │ (1. Super Admin revokes in Command Center)          │
         ▼                                                     ▼
[Status: REVOKED in PostgreSQL]                     [Install APK & Open App]
(Old tokens instantly blacklisted)                             │
(Past transactions & receipts intact!)                         │
                                                               ▼
                                                    [Scan New Pairing QR Code]
                                                               │
                                                               ▼
                                                    [Status: ACTIVE Terminal]
                                                    (Sync resumes immediately!)
```

1. Go to **Command Center > Registration & Payments > Bridge Devices**.
2. Locate the old phone profile and click **Revoke**.
   - The server immediately invalidates the old device token.
   - Any further requests from the old phone are rejected with HTTP 401/403.
   - **Zero Data Loss:** All past payment records, receipts, and audit logs remain permanently preserved in PostgreSQL.
3. Click **Enroll New Bridge Device** to generate a new pairing code.
4. Install the APK on the replacement phone, enter the new code, and tap **Pair**.
5. The replacement phone takes over payment bridge duties immediately.

---

## 5. Security & Privacy Safeguards

- **Strict Telecom Sender Whitelist:** The app evaluates incoming messages against an approved telecom list (`MTN`, `182`, `M-Money`). Any SMS originating from standard mobile numbers or unknown senders is **immediately discarded** without parsing, persisting, or forwarding.
- **Hardware-Backed Keystore:** Device bearer tokens and HMAC signing keys are encrypted using Android Keystore with AES-256-GCM (`EncryptedSharedPreferences`). Secrets are never logged or exported.
- **HMAC-SHA256 Payload Integrity:** Every webhook payload carries an `x-signature` header matching the SHA-256 HMAC of the request body. Tampering with amounts, dates, or references in transit will cause immediate server rejection.
- **Idempotent Deduplication:** Telecom transaction IDs (`providerTransactionRef`) are indexed uniquely in the phone's Room SQLite database and in MOSA's PostgreSQL database, preventing duplicate processing even if network retries resend a notification.
- **SMS is Evidence, Not Final Settlement:** Forwarded SMS notifications represent immediate evidence for provisional registration activation. Official final settlement is cross-checked against MTN web statements via the Command Center export tool.
