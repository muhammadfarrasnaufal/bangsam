# Mobile App Mapping

Base URL lokal:

```txt
http://127.0.0.1:3001
```

Dokumen ini fokus ke app mobile per role:

- `nasabah`
- `petugas`

Semua endpoint petugas selain login wajib kirim:

```txt
Authorization: Bearer <token>
```

Semua endpoint nasabah setelah login juga pakai header yang sama.

## 1. Role Nasabah

### Screen: Register

Endpoint:

- `POST /api/mobile/register`

Request:

```json
{
  "nama": "Nasabah Baru",
  "email": "nasabahbaru@bangsam.local",
  "password": "nasabah123",
  "noHp": "081234567890",
  "alamat": "Jl. Nasabah"
}
```

Response penting:

- `token`
- `message`
- `user`
- `verification.status`
- `verification.code`
- `verification.qrPayload`

Catatan UI:

- setelah register, user langsung punya session login
- tampilkan status `pending`
- tampilkan kode verifikasi dan QR untuk dibawa ke petugas

### Screen: Login

Endpoint:

- `POST /api/mobile/login`

Request:

```json
{
  "identifier": "email/nohp/nama",
  "password": "password"
}
```

Catatan:

- endpoint ini khusus `nasabah`

### Screen: Home / Dashboard

Endpoint:

- `GET /api/mobile/bootstrap`

Response penting:

- `user`
- `verification`
- `summary`
- `wasteCatalog`
- `rewards`
- `latestHistory`
- `notificationsPreview`

Field utama:

- `verification.status`
- `summary.balance`
- `summary.points`
- `summary.collectedKg`
- `summary.notificationsUnread`

Catatan UI:

- kalau `verification.status !== "verified"`, blok fitur transaksi dan tampilkan banner menunggu verifikasi

### Screen: History

Endpoint:

- `GET /api/mobile/history?filter=`

Filter baru:

- `all`
- `deposit`
- `withdraw`
- `reward`

Alias lama yang masih diterima backend:

- `semua`
- `setoran`
- `penarikan`

Response item:

- `id`
- `title`
- `category`
- `date`
- `amount`
- `direction`
- `subtitle`
- `weightKg`

### Screen: Submit Deposit

Endpoint:

- `POST /api/mobile/deposit`

Request:

```json
{
  "wasteTypeId": "2",
  "weightKg": 3
}
```

Catatan:

- hanya aktif kalau `verification.status = verified`

### Screen: Request Withdraw

Endpoint:

- `POST /api/mobile/withdraw`

Request:

```json
{
  "amount": 10000,
  "method": "Transfer Bank",
  "accountNumber": "1234567890"
}
```

Catatan:

- hanya aktif kalau `verification.status = verified`

### Screen: Rewards

Endpoint:

- `POST /api/mobile/rewards/redeem`

Request:

```json
{
  "rewardId": "reward-1"
}
```

### Screen: Notifications

Endpoint:

- `GET /api/mobile/notifications`

## 2. Role Petugas

### Screen: Login

Endpoint:

- `POST /api/mobile/staff/login`

Request:

```json
{
  "identifier": "email/nohp/nama petugas",
  "password": "password"
}
```

Response penting:

- `token`
- `user.id`
- `user.nama`
- `user.email`
- `user.noHp`
- `user.role`

Catatan:

- endpoint ini khusus `petugas`

### Screen: Dashboard

Endpoint:

- `GET /api/mobile/staff/bootstrap`

Response penting:

- `user`
- `dashboard.queues`
- `dashboard.performance`
- `spotlight.recentDeposits`
- `spotlight.recentWithdrawals`
- `spotlight.recentTransactions`
- `myRecentActivity`

Field dashboard yang biasanya dipakai:

- `dashboard.queues.pendingDeposits`
- `dashboard.queues.pendingWithdrawals`
- `dashboard.performance.handledDepositsToday`
- `dashboard.performance.handledWithdrawalsToday`

### Screen: Activity / Riwayat Proses

Endpoint:

- `GET /api/mobile/staff/activity?limit=20`

Response item:

- `id`
- `entityType`
- `action`
- `targetName`
- `description`
- `status`
- `createdAt`

### Screen: Antrean Verifikasi Nasabah

Endpoint:

- `GET /api/mobile/staff/members?status=pending&q=&page=&limit=`

Response item:

- `member`
- `verification`

Field utama:

- `member.nama`
- `member.email`
- `member.noHp`
- `verification.status`
- `verification.code`
- `verification.qrPayload`

### Screen: Verify by Code / Scan QR

Endpoint:

- `POST /api/mobile/staff/members/verify`

Opsi 1, manual code:

```json
{
  "code": "BSM123456"
}
```

Opsi 2, hasil scan QR:

```json
{
  "qrPayload": "bangsam://verify-member?code=BSM123456"
}
```

### Screen: Cari Semua Nasabah

Endpoint:

- `GET /api/mobile/staff/member-directory?q=&page=&limit=`

Response item:

- field anggota standar
- `verification`

Field utama:

- `id`
- `nama`
- `email`
- `noHp`
- `saldo`
- `totalSetoranKg`
- `totalSetoranRp`
- `verification.status`

### Screen: Katalog Jenis Sampah

Endpoint:

- `GET /api/mobile/staff/waste-types?q=&page=&limit=`

Response item:

- `id`
- `namaSampah`
- `hargaPerkg`
- `barcode`

### Screen: Input Setoran

Endpoint:

- `POST /api/mobile/staff/deposits`

Request:

```json
{
  "userId": 3,
  "jenisSampahId": 2,
  "berat": 4,
  "status": "verified"
}
```

Status umum:

- `verified` untuk input langsung sukses
- `pending` kalau ingin masuk antrean dulu

### Screen: Antrean Setoran

Endpoint:

- `GET /api/mobile/staff/deposits?status=&q=&userId=&page=&limit=`

### Action: Approve / Reject Setoran

Endpoint:

- `PATCH /api/mobile/staff/deposits`

Request:

```json
{
  "depositId": 1,
  "status": "verified"
}
```

Status valid:

- `pending`
- `verified`
- `rejected`

### Screen: Input Penarikan

Endpoint:

- `POST /api/mobile/staff/withdrawals`

Request:

```json
{
  "userId": 3,
  "jumlah": 10000,
  "status": "pending"
}
```

### Screen: Antrean Penarikan

Endpoint:

- `GET /api/mobile/staff/withdrawals?status=&q=&userId=&page=&limit=`

### Action: Proses Penarikan

Endpoint:

- `PATCH /api/mobile/staff/withdrawals`

Request:

```json
{
  "withdrawalId": 1,
  "status": "success"
}
```

Status valid:

- `pending`
- `success`
- `failed`

### Screen: Semua Transaksi

Endpoint:

- `GET /api/mobile/staff/transactions?tipe=&status=&q=&userId=&page=&limit=`

Filter umum:

- `tipe`
- `status`
- `q`
- `userId`

## 3. Rekomendasi Struktur Screen

### App Nasabah

1. `Register`
2. `Login`
3. `Home`
4. `Verification Status`
5. `Deposit Form`
6. `Withdraw Form`
7. `History`
8. `Rewards`
9. `Notifications`

### App Petugas

1. `Login`
2. `Dashboard`
3. `Verifikasi Nasabah`
4. `Cari Nasabah`
5. `Input Setoran`
6. `Antrean Setoran`
7. `Input Penarikan`
8. `Antrean Penarikan`
9. `Riwayat Proses`
10. `Transaksi`

## 4. Aturan Penting

- `POST /api/mobile/login` hanya untuk `nasabah`
- `POST /api/mobile/staff/login` hanya untuk `petugas`
- nasabah yang belum `verified` tetap bisa login, tapi transaksi diblok
- petugas bisa verifikasi via code manual atau QR payload
- kategori history mobile gunakan `deposit`, `withdraw`, `reward`
- untuk kompatibilitas, backend masih menerima `setoran`, `penarikan`, `semua`
