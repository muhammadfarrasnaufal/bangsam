# Frontend Cheat Sheet

Base URL lokal:

```txt
http://127.0.0.1:3001
```

Semua endpoint admin web butuh login dulu agar cookie `admin_session` aktif.

## 1. Login

Endpoint:

- `POST /api/login`
- `GET /api/auth`
- `POST /api/logout`
- `GET /api/me/permissions`
- `GET /api/admin-audit?q=&action=&entityType=&actorId=&page=&limit=`

Form login:

- `username`
- `password`

User session shape:

```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "nama": "Admin Bangsam",
    "email": "admin@bangsam.local",
    "role": "admin"
  }
}
```

Permissions endpoint:

- `GET /api/me/permissions`

Response penting:

- `user`
- `permissions.canManageMembers`
- `permissions.canManageWasteTypes`
- `permissions.canDeleteDeposits`
- `permissions.canDeleteWithdrawals`
- `permissions.canViewAuditLog`

## 2. Dashboard

Endpoint:

- `GET /api/dashboard`
- `GET /api/admin-summary`
- `GET /api/admin-alerts`
- `GET /api/analytics?start=&end=`

Card utama:

- `stats.totalSetoranKg`
- `stats.saldoPoinRp`
- `stats.anggotaAktif`
- `stats.transaksiHariIni`
- `summary.pendingDeposits`
- `summary.pendingWithdrawals`

List dashboard:

- `recentTransactions`
- `activeUsers`
- `programHighlights`

Analytics tambahan:

- `operationalSummary.pendingDeposits`
- `operationalSummary.pendingWithdrawals`
- `operationalSummary.verifiedDeposits`
- `operationalSummary.successfulWithdrawals`
- `dailyTrend[]`
- `wasteBreakdown[]`
- `topMembers[]`
- `statusBreakdown[]`

Alerts operasional:

- `generatedAt`
- `items[]`
- field per item:
  - `id`
  - `level`
  - `category`
  - `title`
  - `description`
  - `count`
  - `actionLabel`
  - `actionTarget`

## 3. Anggota

List endpoint:

- `GET /api/members?q=&page=&limit=`

Detail endpoint:

- `GET /api/members/[id]`

Mutasi:

- `POST /api/members`
- `PATCH /api/members/[id]`
- `DELETE /api/members/[id]`

Kolom tabel:

- `nama`
- `email`
- `noHp`
- `alamat`
- `saldo`
- `totalSetoranKg`
- `totalSetoranRp`
- `createdAt`

Field form create/edit:

- `nama`
- `email`
- `password`
- `alamat`
- `noHp`

Catatan role:

- create/update/delete anggota: `admin only`

## 4. Jenis Sampah

List endpoint:

- `GET /api/waste-types?q=&page=&limit=`

Detail endpoint:

- `GET /api/waste-types/[id]`

Mutasi:

- `POST /api/waste-types`
- `PATCH /api/waste-types/[id]`
- `DELETE /api/waste-types/[id]`

Kolom tabel:

- `namaSampah`
- `hargaPerkg`
- `barcode`
- `createdAt`

Field form:

- `namaSampah`
- `hargaPerkg`
- `barcode`

Catatan role:

- create/update/delete jenis sampah: `admin only`

## 5. Setoran

List endpoint:

- `GET /api/deposits?status=&q=&userId=&page=&limit=`

Detail endpoint:

- `GET /api/deposits/[id]`

Mutasi:

- `POST /api/deposits`
- `PATCH /api/deposits`
- `PATCH /api/deposits/bulk`
- `DELETE /api/deposits/[id]`

Kolom tabel:

- `nasabahNama`
- `jenisSampahNama`
- `berat`
- `total`
- `status`
- `petugasNama`
- `createdAt`

Field form create:

- `userId`
- `jenisSampahId`
- `berat`
- `status`

Field approval:

- `depositId`
- `status`

Field bulk approval:

- `depositIds[]`
- `status`

Catatan role:

- create/approve/bulk approve: `admin` dan `petugas`
- delete setoran: `admin only`

Status setoran:

- `pending`
- `verified`
- `rejected`

## 6. Penarikan

List endpoint:

- `GET /api/withdrawals?status=&q=&userId=&page=&limit=`

Detail endpoint:

- `GET /api/withdrawals/[id]`

Mutasi:

- `POST /api/withdrawals`
- `PATCH /api/withdrawals`
- `PATCH /api/withdrawals/bulk`
- `DELETE /api/withdrawals/[id]`

Kolom tabel:

- `nasabahNama`
- `jumlah`
- `status`
- `createdAt`

Field form create:

- `userId`
- `jumlah`
- `status`

Field approval:

- `withdrawalId`
- `status`

Field bulk approval:

- `withdrawalIds[]`
- `status`

Catatan role:

- create/approve/bulk approve: `admin` dan `petugas`
- delete penarikan: `admin only`

Status penarikan:

- `pending`
- `success`
- `failed`

## 7. Transaksi

List endpoint:

- `GET /api/transactions?tipe=&status=&q=&userId=&page=&limit=`

Kolom tabel:

- `nasabahNama`
- `tipe`
- `jumlah`
- `keterangan`
- `status`
- `berat`
- `createdAt`

Filter yang tersedia:

- `tipe`
- `status`
- `q`
- `userId`

## 8. Pagination Response

Semua list utama pakai bentuk ini:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 1
  }
}
```

## 9. Error Handling

Unauthorized:

```json
{
  "message": "Unauthorized"
}
```

Validasi umum:

```json
{
  "message": "Pesan error"
}
```

## 10. Audit Trail Admin

Endpoint:

- `GET /api/admin-audit?q=&action=&entityType=&actorId=&page=&limit=`

Catatan role:

- audit trail hanya bisa diakses `admin`

Kolom timeline/tabel:

- `actorName`
- `actorRole`
- `action`
- `entityType`
- `entityLabel`
- `description`
- `createdAt`

Field tambahan:

- `entityId`
- `metadata`
