# SIMPRESMA — Sistem Informasi Manajemen Prestasi Mahasiswa
Fakultas Ilmu Komputer, Universitas Jember

SIMPRESMA adalah platform sistem informasi terpadu untuk pengajuan capaian prestasi mahasiswa, verifikasi berjenjang oleh dosen verifikator, konversi prestasi menjadi mata kuliah/SKS oleh Kaprodi, validasi berkas SK oleh Tendik, serta monitoring eksekutif oleh Wakil Dekan.

Dibangun dengan arsitektur **Laravel 12** (PHP ^8.2) sebagai backend REST API & database engine, serta **React 19 + TypeScript + Vite + Tailwind CSS v4** pada antarmuka frontend.

---

## 📋 Prasyarat Sistem (Prerequisites)

Sebelum menginstal, pastikan komputer/laptop telah terpasang:
1. **PHP >= 8.2** (bisa melalui [XAMPP](https://www.apachefriends.org/) versi terbaru atau installer standalone) dengan ekstensi aktif:
   - `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd`, `zip`, `curl`
2. **Composer >= 2.x** ([Download Composer](https://getcomposer.org/download/))
3. **Node.js >= 18.x** dan **npm** ([Download Node.js](https://nodejs.org/))
4. **MySQL / MariaDB** (bisa melalui XAMPP MySQL)
5. **Git** ([Download Git](https://git-scm.com/))

---

## 🚀 Panduan Instalasi Lengkap (Step-by-Step)

### 1. Clone / Download Repositori

Pilih salah satu cara di bawah:

- **Cara A (Download File ZIP - Paling Mudah Tanpa Git):**
  1. Buka link repositori: [https://github.com/iannnub/simfe](https://github.com/iannnub/simfe)
  2. Klik tombol hijau **`<> Code`**, lalu pilih **`Download ZIP`**.
  3. Ekstrak file `simfe-main.zip` ke folder yang diinginkan (misal di `D:\Capstone Project\simfe-main`).
  4. Buka folder tersebut di **VS Code** (atau klik kanan folder -> *Open with Code*).

- **Cara B (Menggunakan Git Clone):**
  Buka terminal (Git Bash, Command Prompt, atau PowerShell):
  ```bash
  git clone https://github.com/iannnub/simfe.git
  cd simfe
  ```

---

### 2. Pasang Dependensi Backend (PHP / Composer)
```bash
composer install
```

---

### 3. Buat File Konfigurasi Lingkungan (`.env`)
Salin file konfigurasi `.env.example` menjadi `.env`:
- **Windows (Command Prompt / PowerShell):**
  ```cmd
  copy .env.example .env
  ```
- **Linux / Git Bash / macOS:**
  ```bash
  cp .env.example .env
  ```

Lalu generate Application Encryption Key:
```bash
php artisan key:generate
```

---

### 4. Setup Database MySQL

Pastikan MySQL di **XAMPP Control Panel** sudah dalam status **Start / Running**.

Buka phpMyAdmin (`http://localhost/phpmyadmin`) atau terminal MySQL, lalu buat database baru:
```sql
CREATE DATABASE simpresma;
```

Pilih **salah satu** dari 2 cara pengisian database di bawah:

#### Opsi A: Import Langsung File `.sql` (Rekomendasi & Paling Cepat)
File dump SQL lengkap sudah tersedia di dalam folder repositori: `database/simpresma.sql`.
- Buka phpMyAdmin -> klik database `simpresma` -> pilih tab **Import** -> pilih file `database/simpresma.sql` -> klik **Import/Go**.
- **ATAU** melalui terminal:
  ```bash
  mysql -u root simpresma < database/simpresma.sql
  ```

#### Opsi B: Menggunakan Migration & Seeder Laravel
Jalankan perintah migration Laravel berikut:
```bash
php artisan migrate:fresh --seed
```
> **Tips Jika Menggunakan Opsi B:** Pastikan Anda menggunakan kode terbaru dari repositori ini karena struktur tabel foreign key dan engine InnoDB sudah dioptimasi untuk mencegah error MySQL `errno: 150`. Jika Anda pemula atau ingin langsung cepat pakai, sangat disarankan menggunakan **Opsi A** (Import file `.sql`).

---

### 5. Buat Folder Penyimpanan & Symbolic Link Storage
Pastikan folder storage dan symbolic link file bukti sertifikat terhubung:
```bash
php artisan storage:link
```

---

### 6. Pasang Dependensi Frontend (Node.js / npm)
```bash
npm install
```

---

### 7. Menjalankan Aplikasi

Buka **2 terminal terpisah** di direktori proyek:

#### Terminal 1: Jalankan Backend Laravel
```bash
php artisan serve --port=8000
```
*(Server backend akan berjalan di `http://127.0.0.1:8000`)*

#### Terminal 2: Jalankan Frontend Vite (Hot Reload)
```bash
npm run dev
```
*(Vite development server akan berjalan di `http://localhost:5173` atau terintegrasi langsung dengan `http://127.0.0.1:8000`)*

> **Catatan Produksi / Standalone:**  
> Anda juga dapat menjalankan `npm run build` sekali saja, kemudian cukup menjalankan `php artisan serve`. Seluruh tampilan React akan disajikan langsung secara otomatis melalui `http://127.0.0.1:8000`.

---

## 🔑 Akun Login Demo (Tersedia Otomatis)

Semua akun default menggunakan password: `password`

| Peran (Role) | Email / Username | NIM / NIP | Akses Fitur Utama |
| :--- | :--- | :--- | :--- |
| **Mahasiswa** | `mahasiswa@fasilkom.unej.ac.id` | `242410101079` | Dashboard Mahasiswa, Form Multi-Step Pengajuan Prestasi, Riwayat Prestasi |
| **Verifikator** | `verifikator@fasilkom.unej.ac.id` | `NIP.10004` | Verifikasi Pengajuan (Menunggu, Disetujui, Ditolak), Matriks Konversi |
| **Tendik** | `tendik@fasilkom.unej.ac.id` | `NIP.20002` | Validasi Final Dokumen, Upload & Download SK Prestasi, Export Rekap Excel/PDF |
| **Wadek (Admin)** | `wadek@fasilkom.unej.ac.id` | `NIP.99002` | Dashboard Eksekutif Fakultas, Rekap Lintas Prodi, Manajemen Master Data & Akun |
| **Kaprodi SI** | `kaprodi.si@fasilkom.unej.ac.id` | `NIP.40001` | Monitoring Capaian Mahasiswa Prodi, Konversi SKS Mata Kuliah |

---

## 🛠️ Perintah Tambahan / Troubleshooting

- **Jika tampilan blank atau aset Vite tidak muncul:**
  ```bash
  npm run build
  ```
- **Jika muncul error sesi atau cache konfigurasi:**
  ```bash
  php artisan config:clear
  php artisan route:clear
  php artisan cache:clear
  ```
- **Menjalankan Automated Unit & Feature Test:**
  ```bash
  php artisan test
  ```
- **Menjalankan Linter & Typecheck:**
  ```bash
  npm run lint
  npx tsc --noEmit
  ```

---

© 2026 Fakultas Ilmu Komputer Universitas Jember — SIMPRESMA
