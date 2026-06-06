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
