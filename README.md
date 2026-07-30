# Derma Nusantara

## PostgreSQL lokal

Pastikan Docker Desktop sudah aktif, lalu jalankan PostgreSQL:

```bash
docker compose up -d
```

Periksa status dan healthcheck:

```bash
docker compose ps
```

Lihat log PostgreSQL:

```bash
docker compose logs postgres
```

Masuk ke PostgreSQL:

```bash
docker compose exec postgres psql -U postgres -d derma_nusantara
```

Hentikan container tanpa menghapus data:

```bash
docker compose down
```

Hapus container beserta seluruh data database lokal:

```bash
docker compose down -v
```

Koneksi aplikasi tersedia melalui `DATABASE_URL` di `.env`:

```text
postgresql://postgres:postgres@localhost:5432/derma_nusantara?schema=public
```

Kredensial ini hanya untuk local development dan tidak boleh digunakan di
staging atau production.

## Menjalankan API

Install dependency, apply migration, seed data awal, dan mulai development
server:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

API tersedia di `http://localhost:3000/api/v1`. Dokumentasi Swagger tersedia
di `http://localhost:3000/api/docs`.

Endpoint Public MVP:

```text
GET  /api/v1/campaigns
GET  /api/v1/campaigns/:slug
POST /api/v1/donations
GET  /api/v1/invoices/:publicId
GET  /api/v1/health
```

Request `POST /api/v1/donations` wajib menyertakan header UUID:

```text
Idempotency-Key: <UUID>
```

Menjalankan database dan API sekaligus menggunakan Docker:

```bash
docker compose --profile api up -d --build
```

Container API menjalankan migration yang belum diterapkan sebelum aplikasi
dimulai. Seed hanya dijalankan secara eksplisit:

```bash
docker compose --profile api exec api npm run prisma:seed
```

## Pemeriksaan kualitas

```bash
npm test
npm run test:e2e
npm run build
```

Target runtime proyek adalah Node.js 22 LTS.

## Admin API

Admin API tersedia di prefix `/api/v1/admin` dan terdokumentasi di Swagger.
Akun lokal pertama dibuat oleh seed:

```text
email: admin@dermanusantara.local
password: AdminLocal123!
```

Ganti `ADMIN_JWT_SECRET` dan kredensial seed untuk staging/production. Login
menggunakan cookie `httpOnly`; setiap request mutasi setelah login wajib
mengirim nilai cookie `admin_csrf` melalui header `X-CSRF-Token`.

Upload cover campaign disimpan pada named volume
`derma-nusantara-admin-uploads` dan tersedia melalui `/uploads/:filename`.
