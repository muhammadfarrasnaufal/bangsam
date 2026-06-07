# API Admin Web

Base URL lokal:

```txt
http://127.0.0.1:3001
```

Autentikasi web admin:

- Login via `POST /api/login`
- Session disimpan di cookie `admin_session`
- Endpoint admin web lain butuh cookie session ini

## Login

### `POST /api/login`

Request:

```json
{
  "username": "admin@bangsam.local",
  "password": "admin123"
}
```

Success response:

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

### `GET /api/auth`

Response:

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

### `POST /api/logout`

Response:

```json
{
  "success": true
}
```

## Dashboard

### `GET /api/dashboard`

Response shape:

```json
{
  "stats": {
    "totalSetoranKg": 10,
    "saldoPoinRp": 15000,
    "anggotaAktif": 1,
    "transaksiHariIni": 1
  },
  "recentTransactions": [
    {
      "id": "1",
      "customer": "Nasabah Bangsam",
      "type": "Kertas Kardus",
      "amount": "10 kg",
      "status": "Berhasil",
      "createdAt": "2026-06-06T22:25:35.000Z"
    }
  ],
  "activeUsers": ["Nasabah Bangsam"],
  "activeFeatures": ["Dashboard", "Transaksi", "Setoran", "Anggota", "Laporan"],
  "programHighlights": [
    {
      "title": "Edukasi Sampah",
      "description": "Mengajak anggota memilah dan menabung sampah dengan lebih baik."
    }
  ],
  "lastUpdated": "2026-06-06T22:25:35.000Z",
  "demoMode": false
}
```

### `GET /api/admin-summary`

Response:

```json
{
  "pendingDeposits": 0,
  "pendingWithdrawals": 0,
  "totalMembers": 1,
  "totalWasteTypes": 3,
  "transactionsToday": 1
}
```

## Format Pagination

Endpoint list utama memakai format ini:

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

Query umum:

- `q`: keyword pencarian
- `page`: nomor halaman
- `limit`: jumlah item per halaman

## Anggota

### `GET /api/members?q=&page=&limit=`

Response item:

```json
{
  "id": 3,
  "nama": "Nasabah Bangsam",
  "email": "nasabah@bangsam.local",
  "role": "nasabah",
  "alamat": "Jl. Bangsam No. 1",
  "noHp": "081200000003",
  "saldo": 75000,
  "totalSetoranKg": 10,
  "totalSetoranRp": 15000,
  "createdAt": "2026-06-06T22:25:35.000Z"
}
```

### `GET /api/members/[id]`

Response:

```json
{
  "item": {
    "id": 3,
    "nama": "Nasabah Bangsam",
    "email": "nasabah@bangsam.local",
    "role": "nasabah",
    "alamat": "Jl. Bangsam No. 1",
    "noHp": "081200000003",
    "saldo": 75000,
    "totalSetoranKg": 10,
    "totalSetoranRp": 15000,
    "createdAt": "2026-06-06T22:25:35.000Z"
  }
}
```

### `POST /api/members`

Request:

```json
{
  "nama": "Nama Anggota",
  "email": "anggota@bangsam.local",
  "password": "password123",
  "alamat": "Jl. Contoh",
  "noHp": "081234567890"
}
```

Response:

```json
{
  "item": {
    "id": 4,
    "nama": "Nama Anggota",
    "email": "anggota@bangsam.local",
    "role": "nasabah",
    "alamat": "Jl. Contoh",
    "noHp": "081234567890",
    "saldo": 0,
    "totalSetoranKg": 0,
    "totalSetoranRp": 0,
    "createdAt": "2026-06-06T23:00:00.000Z"
  }
}
```

### `PATCH /api/members/[id]`

Request:

```json
{
  "nama": "Nama Baru",
  "email": "baru@bangsam.local",
  "password": "passwordBaru",
  "alamat": "Alamat Baru",
  "noHp": "081299999999"
}
```

Semua field optional.

### `DELETE /api/members/[id]`

Response:

```json
{
  "success": true
}
```

## Petugas

### `GET /api/staff?q=&page=&limit=`

Hanya `admin`.

Response item:

```json
{
  "id": 5,
  "nama": "Petugas Bangsam",
  "email": "petugas@bangsam.local",
  "role": "petugas",
  "alamat": "Jl. Operasional",
  "noHp": "081200000002",
  "saldo": 0,
  "totalSetoranKg": 0,
  "totalSetoranRp": 0,
  "createdAt": "2026-06-06T22:25:35.000Z"
}
```

### `POST /api/staff`

Hanya `admin`.

Request:

```json
{
  "nama": "Petugas Baru",
  "email": "petugasbaru@bangsam.local",
  "password": "petugas123",
  "alamat": "Jl. Operasional",
  "noHp": "081234567890"
}
```

Response:

```json
{
  "item": {
    "id": 5,
    "nama": "Petugas Baru",
    "email": "petugasbaru@bangsam.local",
    "role": "petugas",
    "alamat": "Jl. Operasional",
    "noHp": "081234567890",
    "saldo": 0,
    "totalSetoranKg": 0,
    "totalSetoranRp": 0,
    "createdAt": "2026-06-07T03:00:00.000Z"
  }
}
```

### `GET /api/staff/[id]`

Hanya `admin`.

### `PATCH /api/staff/[id]`

Hanya `admin`.

Semua field optional:

```json
{
  "nama": "Petugas Update",
  "email": "petugasupdate@bangsam.local",
  "password": "passwordBaru",
  "alamat": "Alamat Baru",
  "noHp": "081299999999"
}
```

### `DELETE /api/staff/[id]`

Hanya `admin`.

## Jenis Sampah

### `GET /api/waste-types?q=&page=&limit=`

Response item:

```json
{
  "id": 2,
  "namaSampah": "Kertas Kardus",
  "hargaPerkg": 1500,
  "barcode": "BSM-KERTAS",
  "createdAt": "2026-06-06T22:25:35.000Z"
}
```

### `GET /api/waste-types/[id]`

Response:

```json
{
  "item": {
    "id": 2,
    "namaSampah": "Kertas Kardus",
    "hargaPerkg": 1500,
    "barcode": "BSM-KERTAS",
    "createdAt": "2026-06-06T22:25:35.000Z"
  }
}
```

### `POST /api/waste-types`

Request:

```json
{
  "namaSampah": "Plastik PET",
  "hargaPerkg": 3000,
  "barcode": "BSM-PLASTIK"
}
```

### `PATCH /api/waste-types/[id]`

Request:

```json
{
  "namaSampah": "Plastik Baru",
  "hargaPerkg": 3500,
  "barcode": "NEW-BARCODE"
}
```

Semua field optional.

### `DELETE /api/waste-types/[id]`

Response:

```json
{
  "success": true
}
```

## Setoran

### `GET /api/deposits?status=&q=&userId=&page=&limit=`

`status`:

- `pending`
- `verified`
- `rejected`

Response item:

```json
{
  "id": 1,
  "nasabahId": 3,
  "nasabahNama": "Nasabah Bangsam",
  "jenisSampahId": 2,
  "jenisSampahNama": "Kertas Kardus",
  "berat": 10,
  "total": 15000,
  "status": "verified",
  "petugasId": 1,
  "petugasNama": "Admin Bangsam",
  "createdAt": "2026-06-06T22:25:35.000Z"
}
```

### `GET /api/deposits/[id]`

Response:

```json
{
  "item": {
    "id": 1,
    "nasabahId": 3,
    "nasabahNama": "Nasabah Bangsam",
    "jenisSampahId": 2,
    "jenisSampahNama": "Kertas Kardus",
    "berat": 10,
    "total": 15000,
    "status": "verified",
    "petugasId": 1,
    "petugasNama": "Admin Bangsam",
    "createdAt": "2026-06-06T22:25:35.000Z"
  }
}
```

### `POST /api/deposits`

Request:

```json
{
  "userId": 3,
  "jenisSampahId": 2,
  "berat": 4,
  "status": "pending"
}
```

`status` optional, default backend `verified`.

### `PATCH /api/deposits`

Request:

```json
{
  "depositId": 1,
  "status": "verified"
}
```

Perubahan status akan ikut mempengaruhi saldo dan transaksi.

### `DELETE /api/deposits/[id]`

Response:

```json
{
  "success": true
}
```

Jika setoran pernah `verified`, delete akan membalikkan efek saldo/transaksi.

## Penarikan

### `GET /api/withdrawals?status=&q=&userId=&page=&limit=`

`status`:

- `pending`
- `success`
- `failed`

Response item:

```json
{
  "id": 1,
  "nasabahId": 3,
  "nasabahNama": "Nasabah Bangsam",
  "jumlah": 5000,
  "status": "pending",
  "createdAt": "2026-06-06T23:00:00.000Z"
}
```

### `GET /api/withdrawals/[id]`

Response:

```json
{
  "item": {
    "id": 1,
    "nasabahId": 3,
    "nasabahNama": "Nasabah Bangsam",
    "jumlah": 5000,
    "status": "pending",
    "createdAt": "2026-06-06T23:00:00.000Z"
  }
}
```

### `POST /api/withdrawals`

Request:

```json
{
  "userId": 3,
  "jumlah": 5000,
  "status": "pending"
}
```

### `PATCH /api/withdrawals`

Request:

```json
{
  "withdrawalId": 1,
  "status": "success"
}
```

Perubahan status akan ikut mempengaruhi saldo dan transaksi.

### `DELETE /api/withdrawals/[id]`

Response:

```json
{
  "success": true
}
```

## Transaksi

### `GET /api/transactions?tipe=&status=&q=&userId=&page=&limit=`

`tipe`:

- `setor`
- `tarik`

Response item:

```json
{
  "id": 1,
  "nasabahId": 3,
  "nasabahNama": "Nasabah Bangsam",
  "tipe": "setor",
  "jumlah": 15000,
  "keterangan": "Kertas Kardus",
  "status": "berhasil",
  "createdAt": "2026-06-06T22:25:35.000Z",
  "berat": 10
}
```

## Error Format Umum

Response error umumnya:

```json
{
  "message": "Pesan error"
}
```

Unauthorized:

```json
{
  "message": "Unauthorized"
}
```

## Mobile Petugas

### `POST /api/mobile/register`

Dipakai nasabah untuk daftar sendiri dari aplikasi.

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

Response:

```json
{
  "token": "mb-...",
  "message": "Registrasi berhasil. Silakan verifikasi akun ke petugas dengan kode atau QR Anda.",
  "user": {},
  "verification": {
    "status": "pending",
    "code": "BSM123456",
    "qrPayload": "bangsam://verify-member?code=BSM123456",
    "verifiedAt": null,
    "verifiedBy": null
  }
}
```

Catatan:

- nasabah bisa login meski belum diverifikasi
- fitur transaksi mobile nasabah akan ditahan sampai status `verified`

### `POST /api/mobile/staff/login`

Dipakai untuk login aplikasi petugas, terpisah dari `POST /api/mobile/login` yang tetap khusus `nasabah`.

Request:

```json
{
  "identifier": "petugasbaru@bangsam.local",
  "password": "petugas123"
}
```

Response:

```json
{
  "token": "mb-staff-...",
  "user": {
    "id": 5,
    "nama": "Petugas Baru",
    "email": "petugasbaru@bangsam.local",
    "noHp": "081234567890",
    "role": "petugas"
  }
}
```

### `GET /api/mobile/staff/bootstrap`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Response:

```json
{
  "user": {
    "id": "5",
    "nama": "Petugas Baru",
    "email": "petugasbaru@bangsam.local",
    "noHp": "081234567890",
    "role": "petugas",
    "alamat": "Jl. Operasional"
  },
  "dashboard": {
    "queues": {
      "pendingDeposits": 1,
      "pendingWithdrawals": 1,
      "totalMembers": 3,
      "totalWasteTypes": 3
    },
    "performance": {
      "handledDepositsToday": 2,
      "handledWithdrawalsToday": 1,
      "totalHandledDeposits": 10,
      "totalHandledWithdrawals": 4
    }
  },
  "spotlight": {
    "recentDeposits": [],
    "recentWithdrawals": [],
    "recentTransactions": []
  },
  "myRecentActivity": []
}
```

### `GET /api/mobile/staff/deposits?status=&q=&userId=&page=&limit=`

Header:

```txt
Authorization: Bearer mb-staff-...
```

### `PATCH /api/mobile/staff/deposits`

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

### `GET /api/mobile/staff/withdrawals?status=&q=&userId=&page=&limit=`

Header:

```txt
Authorization: Bearer mb-staff-...
```

### `PATCH /api/mobile/staff/withdrawals`

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

### `GET /api/mobile/staff/transactions?tipe=&status=&q=&userId=&page=&limit=`

Header:

```txt
Authorization: Bearer mb-staff-...
```

### `GET /api/mobile/staff/members?status=&q=&page=&limit=`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Contoh pakai:

- `status=pending` untuk antrean verifikasi
- `q=BSM123456` untuk cari lewat kode

### `POST /api/mobile/staff/members/verify`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Verifikasi bisa lewat kode manual:

```json
{
  "code": "BSM123456"
}
```

Atau hasil scan QR:

```json
{
  "qrPayload": "bangsam://verify-member?code=BSM123456"
}
```

### `GET /api/mobile/staff/member-directory?q=&page=&limit=`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Dipakai untuk cari semua nasabah, termasuk status verifikasinya.

### `GET /api/mobile/staff/waste-types?q=&page=&limit=`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Dipakai untuk katalog jenis sampah saat petugas input setoran.

### `POST /api/mobile/staff/deposits`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Request:

```json
{
  "userId": 3,
  "jenisSampahId": 2,
  "berat": 4,
  "status": "verified"
}
```

### `POST /api/mobile/staff/withdrawals`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Request:

```json
{
  "userId": 3,
  "jumlah": 10000,
  "status": "pending"
}
```

### `GET /api/mobile/staff/activity?limit=`

Header:

```txt
Authorization: Bearer mb-staff-...
```

Response:

```json
{
  "items": [
    {
      "id": 10,
      "entityType": "deposit",
      "action": "mobile-status-update",
      "targetName": "Nasabah Bangsam",
      "description": "Petugas mobile mengubah status setoran menjadi verified",
      "status": "verified",
      "createdAt": "2026-06-07T04:15:00.000Z"
    }
  ]
}
```
