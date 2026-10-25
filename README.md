# SIMPRESMA — Sistem Informasi Prestasi Mahasiswa

SIMPRESMA adalah aplikasi frontend untuk pengelolaan pengajuan prestasi mahasiswa dan proses konversi prestasi menjadi mata kuliah/SKS. Antarmuka dibuat dengan Laravel sebagai fondasi aplikasi dan React + TypeScript untuk halaman interaktif.

## Fitur berdasarkan role

- **Mahasiswa** — mengisi pengajuan prestasi, melengkapi dokumen pendukung, melihat riwayat/status, serta melihat detail pengajuan dan konversi mata kuliah.
- **Verifikator** — meninjau pengajuan, memeriksa dokumen, memberikan persetujuan atau penolakan beserta alasan, serta mengelola data/matriks konversi.
- **Tendik** — melihat detail konversi secara read-only, memantau status SK, dan memilih berkas SK final dalam format PDF.
- **Wadek** — memantau pengajuan lintas program studi, melihat rekap prestasi dan konversi, serta mengakses pelaporan.
- **Kaprodi** — memantau prestasi dan rekap pada program studi terkait, melihat performa, dan mengakses pelaporan.

Fitur dan hak akses yang tersedia mengikuti implementasi frontend pada repositori ini.

## Teknologi

- Laravel
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- npm

## Persyaratan

- PHP dan Composer sesuai versi Laravel yang digunakan proyek.
- Node.js dan npm.
- Dependensi PHP dan JavaScript terpasang.

## Menjalankan aplikasi

1. Buka terminal pada direktori proyek.
2. Pasang dependensi PHP:

   ```bash
   composer install
   ```

3. Salin konfigurasi lingkungan jika `.env` belum tersedia:

   ```bash
   cp .env.example .env
   ```

   Pada Windows, file `.env.example` juga dapat disalin secara manual menjadi `.env`.

4. Buat application key:

   ```bash
   php artisan key:generate
   ```

5. Atur konfigurasi database pada `.env` bila aplikasi menggunakan database lokal, kemudian jalankan migrasi bila diperlukan:

   ```bash
   php artisan migrate
   ```

6. Pasang dependensi frontend:

   ```bash
   npm install
   ```

7. Jalankan server Laravel di terminal pertama:

   ```bash
   php artisan serve
   ```

8. Jalankan Vite di terminal kedua:

   ```bash
   npm run dev
   ```

9. Buka alamat lokal yang ditampilkan oleh Laravel/Vite.

## Build frontend

Untuk membuat build frontend:

```bash
npm run build
```

Untuk menjalankan pemeriksaan lint jika script tersedia di `package.json`:

```bash
npm run lint
```

## Struktur direktori penting

```text
resources/
└── js/
    └── react/
        ├── components/   # Komponen antarmuka yang digunakan ulang
        ├── context/      # Context aplikasi
        ├── layout/       # Layout, header, dan sidebar
        └── pages/
            └── Simpresma/ # Halaman dan fitur SIMPRESMA
routes/                    # Route Laravel
public/                    # Aset publik
```

## Catatan implementasi

- Sejumlah alur pada frontend menggunakan data contoh dan `localStorage` untuk mendukung demonstrasi interaksi antarmuka.
- Pastikan konfigurasi backend, autentikasi, database, dan layanan eksternal disesuaikan dengan lingkungan pengembangan sebelum digunakan sebagai aplikasi produksi.
- Jangan memasukkan kredensial atau token rahasia ke repositori.
