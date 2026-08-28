# FinovaOS Biometric Bridge

Fingerprint machine office ki LAN par hoti hai (jaise `192.168.1.201`), FinovaOS
internet par. Cloud seedha LAN device tak nahi pohanch sakta — is liye ye chhota
agent office ke kisi PC par chalta hai: machine se logs uthata hai aur FinovaOS ko
bhej deta hai.

Sirf **outbound HTTPS** — koi port forwarding, static IP ya firewall hole nahi
chahiye.

---

## 1. Requirements

- Office me ek Windows PC ya laptop jo machine wali LAN par ho aur din bhar on rahe
- Node.js 18+ — https://nodejs.org
- ZKTeco protocol wali machine (K40, F18, MB360, iClock, aur eSSL / Anviz clones)
  jis ka TCP port **4370** khula ho

## 2. FinovaOS me device register karein

1. Dashboard → **Attendance → Devices**
2. **Add device** — naam, serial number (machine ke peeche likha hota hai),
   brand, aur mode = **Bridge agent**
3. Save karte hi ek key milegi: `fbd_…`
   **Ye key sirf aik dafa dikhti hai.** Copy kar lein — kho jaye to
   "Rotate key" se nayi bana lein.

## 3. Agent install karein

```bash
cd scripts/biometric-bridge
npm install
cp config.example.json config.json
```

`config.json` edit karein:

| Field            | Kya daalna hai                                                    |
| ---------------- | ----------------------------------------------------------------- |
| `serverUrl`      | Aapka FinovaOS URL, e.g. `https://app.finovaos.app`               |
| `deviceKey`      | Step 2 wali `fbd_…` key                                           |
| `deviceIp`       | Machine ka LAN IP — machine ke menu → Comm → Ethernet me milta hai |
| `devicePort`     | Tqreeban hamesha `4370`                                           |
| `pollSeconds`    | Kitni der baad check kare (default 120)                           |
| `clearAfterSync` | `true` sirf tab jab machine ki memory bhar rahi ho — dekhen neeche |

## 4. Test karein

```bash
npm run once
```

Chalne par ye dikhna chahiye:

```
[2026-08-28 09:12:03] INFO  bridge starting — device 192.168.1.201:4370 → https://app.finovaos.app
[2026-08-28 09:12:03] INFO  key accepted for "Main Gate"
[2026-08-28 09:12:05] INFO  machine holds 1284 scan(s)
[2026-08-28 09:12:07] INFO  1284 new scan(s) to send
[2026-08-28 09:12:11] INFO  sent 1284, stored 1284, duplicates 0
```

Ab dashboard me **Attendance → Devices → Punch log** khol kar dekhein.

Agar `WARN … enrollment numbers no employee is mapped to` aaye, to matlab
machine me jo user IDs hain wo abhi kisi employee se juri nahi. **Employee
mapping** section me map karein — purani punches bhi khud ba khud attach ho
jayengi, kuch dobara bhejne ki zarurat nahi.

## 5. Hamesha chalta rahe

```bash
npm start
```

Windows par startup par chalane ke liye — `Win+R` → `shell:startup` → us folder
me ye `.bat` rakh dein:

```bat
@echo off
cd /d C:\finovaos-bridge
node bridge.js >> bridge.log 2>&1
```

Ya `pm2` use karein:

```bash
npm install -g pm2
pm2 start bridge.js --name finovaos-bridge
pm2 save
pm2 startup
```

---

## Kaise kaam karta hai

- Har poll par machine ka poora log parha jata hai, phir `.bridge-state.json`
  wale high-water mark se sirf **naye** scans bheje jate hain.
- Server par dedupe `(device, enrollment number, timestamp)` par hai — is liye
  ek hi batch dobara bhejna bilkul safe hai. Timeout ke baad retry karne se
  duplicate attendance nahi banti.
- Ek cycle fail ho jaye (machine reboot, internet down, laptop sleep) to agent
  band nahi hota — agla poll wahin se uthata hai.
- Machine ka waqt sahi rakhein. Agent wall-clock time bhejta hai aur server
  device ke `tzOffsetMin` (Pakistan = 300) se UTC banata hai.

## `clearAfterSync` ke bare me

Ye machine ka log **permanently mita** deta hai. Sirf tab on karein jab machine
ki memory bhar rahi ho, aur pehle kuch din confirm kar lein ke sync theek chal
raha hai. Off rehne par machine apna log rakhti hai, jo ek doosra backup hai.

## Masail

| Alamat                        | Wajah                                                                       |
| ----------------------------- | --------------------------------------------------------------------------- |
| `server rejected the device key` | Key ghalat ya device inactive hai. Dashboard se rotate karke naya paste karein |
| `connect ETIMEDOUT`           | PC aur machine alag network par hain, ya port 4370 band hai                  |
| `machine holds 0 scan(s)`     | Kisi ne machine ka log clear kar diya, ya IP kisi doosri device ka hai       |
| Punch aa rahe, attendance nahi | Enrollment numbers map nahi — Employee mapping dekhein                       |
