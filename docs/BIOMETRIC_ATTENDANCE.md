# Biometric Attendance

Fingerprint / face machine (ZKTeco, eSSL, Hikvision) ko FinovaOS se jorne ka
poora system. Machine sirf **scans** deti hai; PRESENT / LATE / HALF_DAY ka
faisla FinovaOS ke rules karte hain.

---

## Data flow

```
  Machine (office LAN, 192.168.x.x)
        │
        ├── BRIDGE ── scripts/biometric-bridge ── POST /api/attendance/ingest
        ├── PUSH ───── machine khud ─────────────── POST /iclock/cdata
        └── IMPORT ─── vendor CSV export ────────── POST /api/attendance/import
                                    │
                                    ▼
                            AttendancePunch      ← raw scans, kabhi delete nahi
                                    │
                          processPunches()       ← rules lagti hain
                                    │
                                    ▼
                              Attendance         ← daily row, payroll isi ko parhta hai
```

Raw punches aur derived attendance jaan boojh kar alag hain. Rules badlein to
purana data replay ho jata hai — machine se dobara kuch mangwane ki zarurat nahi.

---

## Teen connection modes

| Mode       | Kab use karein                                     | Setup                                                       |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------- |
| **BRIDGE** | Default. Har ZKTeco-protocol machine par chalta hai | Office PC par `scripts/biometric-bridge` (README wahan hai)  |
| **PUSH**   | Naye ZKTeco jinme ADMS / Cloud Server option ho     | Machine menu → Comm → Cloud Server → domain + port 443       |
| **IMPORT** | Machine tak network hi na ho                        | ZKTime / eTimeTrack se export → Attendance Devices → step 4  |

BRIDGE aur PUSH me farq sirf itna hai ke punch kaun bhejta hai. Dono ek hi
`AttendancePunch` table me girte hain aur aage ka raasta ek hi hai.

---

## Auth

| Path                      | Kaise authenticate hota hai                                     |
| ------------------------- | --------------------------------------------------------------- |
| `/api/attendance/ingest`  | `x-device-key: fbd_…` — per-device key, SHA-256 DB me            |
| `/iclock/*`               | Serial number (firmware headers nahi bhej sakta)                 |
| Baqi sab                  | Normal user session + `requireRole`                              |

Key sirf **register / rotate ke waqt aik dafa** dikhti hai. Kho jaye to
dashboard se rotate karein — purani foran band ho jati hai.

`/iclock` ki SN-based auth kamzor hai, is liye device tabhi chalti hai jab admin
ne wo exact serial **PUSH mode me** register kiya ho. Jis firmware me URL prefix
set ho sakta ho, wo `/iclock/<ingest-key>/cdata` use kare — us surat me key
properly verify hoti hai.

`/api/attendance/ingest` `proxy.ts` ki `publicApi` list me hai, kyunki bridge
agent ke paas koi session cookie ya `x-company-id` nahi hota.

---

## Rules (Attendance Devices → step 3)

| Setting                | Default | Kya karta hai                                                    |
| ---------------------- | ------- | ----------------------------------------------------------------- |
| `graceMinutes`         | 15      | Shift start ke baad itni der tak LATE nahi                       |
| `halfDayHours`         | 4       | Is se kam kaam → HALF_DAY                                        |
| `dedupeMinutes`        | 2       | Itni der me do scans = ek punch (log par dobara ungli lagana)    |
| `autoAbsent`           | off     | Bina punch wale ko ABSENT — sirf "Finalize day" par chalta hai   |
| `nightShiftCutoffHour` | 5       | Raat ki shift ka is se pehle ka scan pichle din ka check-out     |

Settings `ActivityLog` me `COMPANY_BIOMETRIC_SETTINGS` action ke saath jati hain
— wahi tareeqa jo holiday settings ka hai.

### Status kaise banta hai

1. Din ke punches collapse hote hain (`dedupeMinutes`)
2. Pehla = `checkIn`, aakhri = `checkOut`
3. Sirf ek punch → PRESENT, remark "no check-out recorded"
4. Worked hours < `halfDayHours` → **HALF_DAY**
5. Arrival > `shiftStart + graceMinutes` → **LATE**
6. Warna → **PRESENT**

Shift har employee ke apne record se aati hai (`Employee.shiftStart` / `shiftEnd`),
default `09:00`–`18:00`.

**LEAVE aur HOLIDAY kabhi overwrite nahi hoti.** Jo chhutti approve ho chuki, wo
machine ke data se nahi badalti.

---

## Timezone

Machines bare wall-clock bhejti hain, bina zone ke. `BiometricDevice.tzOffsetMin`
(Pakistan = 300) se asal instant banta hai.

Do cheezen dhyan me rakhne wali hain:

- **Lateness minutes-of-day me compare hoti hai**, Date objects se nahi. Warna
  jawab server ke timezone par depend karta — production me UTC, dev laptop par
  local — aur wohi punch Vercel par on-time aur laptop par 5 ghante late aata.
- **`Attendance.date` UTC midnight hai**, kyunki manual attendance
  `new Date("2026-08-28")` se banti hai. Server-local midnight rakhne se upsert
  purani rows se match na karta aur calendar double ho jata.

---

## Dedupe

`AttendancePunch` par unique key: `(deviceId, biometricId, punchTime)`.

Is ka matlab har ingest path safe-to-retry hai. Bridge agent timeout ke baad
wahi batch dobara bhej de, ya kisi ne overlapping CSV upload kar di — kuch
double nahi hota.

---

## Employee mapping

Machine banda nahi janti, sirf enrollment number janti hai (1, 2, 3…).
`Employee.biometricId` wo number rakhta hai.

Jab tak mapping na ho, punches **store to hoti hain** lekin kisi ke naam nahi
lagtin. Mapping save karte hi `resolveUnmappedPunches()` purani punches ko
attach kar deta hai aur `processed: false` kar deta hai, taake wo dobara
process hon. Machine se kuch dobara mangwana nahi parta.

Dashboard un enrollment numbers ko alag warning me dikhata hai jo punch to kar
rahe hain magar kisi employee se jure nahi.

---

## Files

| File                                            | Kaam                                      |
| ----------------------------------------------- | ----------------------------------------- |
| `lib/biometric.ts`                              | Keys, settings, time parsing              |
| `lib/attendanceProcessing.ts`                   | Punch → Attendance engine                 |
| `app/api/attendance/devices/`                   | Device CRUD + key rotation                |
| `app/api/attendance/ingest/`                    | Bridge agent endpoint                     |
| `app/api/attendance/mapping/`                   | Employee ↔ enrollment number              |
| `app/api/attendance/settings/`                  | Rules                                     |
| `app/api/attendance/punches/`                   | Raw log + reprocess / relink / finalize   |
| `app/api/attendance/import/`                    | CSV / TXT import                          |
| `app/iclock/[[...slug]]/`                       | ZKTeco ADMS push protocol                 |
| `app/dashboard/attendance/devices/`             | UI (5 numbered steps)                     |
| `scripts/biometric-bridge/`                     | Standalone LAN agent                      |
| `prisma/migrations/manual_biometric_attendance.sql` | DB migration                          |

---

## Deploy checklist

1. `prisma/migrations/manual_biometric_attendance.sql` Supabase SQL editor me chalayen
2. `npx prisma generate`
3. `/admin/permissions` me **CORE_ATTENDANCE_DEVICES** ko un plans par tick karein
   jinhe ye feature dena hai — warna page kisi ko nazar nahi aayega
4. Deploy
5. Client ke office me bridge agent lagayen (`scripts/biometric-bridge/README.md`)
