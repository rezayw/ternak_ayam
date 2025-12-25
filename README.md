# 🐔 Ternak Ayam - Sistem Manajemen Peternakan Ayam

## Tugas Besar IF5161: Mini Secure Web Application

Aplikasi ini dikembangkan sebagai bagian dari tugas besar IF5161 untuk membangun aplikasi web kecil yang aman, dengan penerapan praktik keamanan relevan dari OWASP Top 10.

### Nama dan Anggota Kelompok

- Reza Yuzron Wardana — NIM 23525008
- Muhammad Haikal Rahman — NIM 23525043
- Muhammad Rafi Haidar — NIM 23525052

Aplikasi modern untuk mengelola peternakan ayam dengan efisien dan produktif. Dibangun dengan teknologi terkini menggunakan Astro, Node.js, Prisma, dan SQLite.

## 📋 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Penggunaan](#penggunaan)
- [Struktur Proyek](#struktur-proyek)
- [Panduan Keamanan](#panduan-keamanan)
- [OWASP Mapping](#owasp-mapping)
- [Deploy](#deploy)
- [Teknologi](#teknologi)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## 🎯 Ruang Lingkup Tugas

Fitur inti sesuai penugasan:

- Autentikasi: Halaman `login` + `register` dengan validasi ketat.
- Proteksi CSRF: Token berbasis cookie + validasi di middleware.
- Captcha: Tantangan sederhana berbasis salted-hash untuk mencegah bot login.
- Manajemen sesi: Cookie `httpOnly`, `secure`, `sameSite=strict`.
- Upload file: Validasi tipe berkas, penyimpanan per pengguna.
- Dashboard: Ringkasan statistik dan navigasi dasar.
- Admin (sederhana): Endpoint daftar pengguna (perlu role `ADMIN`).

Semua fitur berjalan di atas Astro API routes + Prisma ORM (SQLite untuk development).

## ✨ Fitur Utama

### 🔐 Autentikasi & Keamanan
- Registrasi pengguna dengan validasi lengkap
- Login aman dengan enkripsi password menggunakan Argon2
- Validasi password dengan standar NIST SP 800-63B
- Pengecekan kecocokan email dan password
- Proteksi CSRF pada semua form
- Session management yang aman

### 📊 Dashboard Interaktif
- Statistik real-time peternakan
- Monitor stok ayam
- Tracking produksi telur
- Analisis produktivitas
- Aktivitas terbaru

### 📁 Manajemen File
- Upload dokumen peternakan (gambar, laporan)
- Penyimpanan file terorganisir per user
- Dukungan format: PNG, JPEG, WebP
- Manajemen akses file

### 👥 Manajemen User (Admin)
- Kontrol role berbeda (Admin, User)
- Manajemen akses pengguna
- View daftar pengguna sistem

### 🎨 Interface Responsif
- Design modern dan colorful
- Mobile-friendly
- Dark mode support
- Animasi smooth

## 🖥️ Persyaratan Sistem

- **Node.js**: 18+ 
- **npm** atau **yarn**
- **Database**: SQLite (default) atau PostgreSQL (production)

## 📦 Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ternak_ayam.git
cd ternak_ayam
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` dan sesuaikan konfigurasi:
```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="ganti-dengan-string-random-panjang-minimal-32-karakter"
```

### 4. Jalankan Database Migration
```bash
npx prisma migrate dev --name init
```

Ini akan membuat database dan table yang diperlukan.

### 5. (Opsional) Seed Database dengan Data Awal
```bash
npx prisma db seed
```

## ⚙️ Konfigurasi

### Environment Variables

Buat file `.env.local` dengan isi berikut:

```env
# Database
DATABASE_URL="file:./dev.db"

# Session
SESSION_SECRET="minimal-32-karakter-random-string-untuk-session"

# Upload
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_DIR="./uploads"
```

### Konfigurasi Database

**Untuk Development (SQLite - Default):**
```
DATABASE_URL="file:./dev.db"
```

**Untuk Production (PostgreSQL):**
1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Set DATABASE_URL:
```
DATABASE_URL="postgresql://user:password@host:5432/ternak_ayam"
```

3. Jalankan migration:
```bash
npx prisma migrate deploy
```

## 🚀 Penggunaan

### Development Mode
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:3000`

### Pengujian (Unit & Fungsional)

Test menggunakan Vitest:

```bash
npm test
```

Yang diuji:
- Captcha util: [src/lib/captcha.test.ts](src/lib/captcha.test.ts)
- Login route (fungsional, mock DB): [src/pages/api/auth/login.test.ts](src/pages/api/auth/login.test.ts)

### Production Build
```bash
npm run build
```

### Run Production Server
```bash
npm start
```

### View Database dengan Prisma Studio
```bash
npx prisma studio
```

## 📁 Struktur Proyek

```
ternak_ayam/
├── src/
│   ├── pages/                    # Halaman Astro
│   │   ├── index.astro          # Home/Landing page
│   │   ├── login.astro          # Login page
│   │   ├── register.astro       # Register page
│   │   ├── dashboard.astro      # Dashboard
│   │   ├── upload.astro         # Upload file
│   │   └── api/                 # API routes
│   │       ├── auth/            # Authentication
│   │       │   ├── login.ts
│   │       │   ├── register.ts
│   │       │   └── logout.ts
│   │       ├── upload.ts        # File upload
│   │       ├── admin/           # Admin routes
│   │       │   └── users.ts
│   │       └── download/        # File download
│   │           └── [id].ts
│   ├── lib/                      # Utility & helper
│   │   ├── auth.ts              # Password hashing
│   │   ├── db.ts                # Database client
│   │   ├── session.ts           # Session management
│   │   ├── csrf.ts              # CSRF protection
│   │   ├── upload.ts            # Upload utilities
│   │   └── validation.ts        # Input validation
│   └── middleware.ts            # Request middleware
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── public/                       # Static assets
├── dist/                         # Build output
├── .env.example                  # Environment template
├── astro.config.mjs             # Astro config
├── package.json                  # Dependencies
├── tsconfig.json                # TypeScript config
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # This file
```

## 🔒 Panduan Keamanan

### Password Requirements (NIST SP 800-63B)
- Minimum 8 karakter (12+ sangat disarankan)
- Kombinasi huruf besar, kecil, angka, dan karakter spesial
- Pengecekan terhadap common weak passwords
- Tidak ada enforced periodic change

### Protecting Your Data
1. **Selalu gunakan HTTPS di production**
   ```bash
   # Setup SSL/TLS dengan Let's Encrypt
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Set SESSION_SECRET yang kuat**
   ```bash
   # Generate random string
   openssl rand -base64 32
   ```

3. **Backup database secara regular**
   ```bash
   # Daily backup
   sqlite3 dev.db ".backup '/path/to/backup/db-$(date +%Y%m%d).db'"
   ```

4. **Update dependencies**
   ```bash
   npm audit fix
   npm update
   ```

## 🛡️ OWASP Mapping

Ringkasan penerapan terhadap OWASP Top 10 (yang relevan untuk scope aplikasi ini):

- A01 Broken Access Control: Gate pada `dashboard` (cek sesi), endpoint admin memerlukan role `ADMIN` via `requireAdmin()`.
- A02 Cryptographic Failures: Hash password dengan `argon2id`; cookie sesi `httpOnly`, `secure`, `sameSite=strict`.
- A03 Injection: Prisma menggunakan query terparametrisasi; tidak ada string concatenation untuk query DB.
- A05 Security Misconfiguration: CSRF di middleware (cek header `x-csrf-token` atau field form), strict cookie options, tipe upload dibatasi.
- A07 Identification and Authentication Failures: Login verifikasi password dengan Argon2; captcha untuk mencegah brute/bot; sesi aman.
- A08 Software and Data Integrity Failures: Dependensi dikelola via npm; jalankan `npm audit` dan update rutin.
- A09 Security Logging and Monitoring Failures: Minimal; disarankan menambah audit log (opsional, belum diterapkan).
- A10 Server-Side Request Forgery: Tidak ada fitur SSRF (tidak relevan dalam scope saat ini).

Catatan: Rate limiting dan account lockout belum diterapkan; direkomendasikan untuk menambahkannya pada production.

## 🌍 Deploy

### Deploy ke Vercel (Tidak Recommended untuk app ini)
App ini menggunakan Node.js adapter, silakan pilih platform lain.

### Deploy ke Railway.app

1. Push ke GitHub
2. Connect repository di Railway
3. Set environment variables di Railway dashboard
4. Deploy!

```bash
# Database migration otomatis
DATABASE_URL="postgresql://..." npm run build
```

### Deploy ke VPS/Server Sendiri

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan lengkap setup production server, PM2, Nginx, SSL, dan database.

Quick setup:
```bash
# 1. SSH ke server
ssh user@yourserver.com

# 2. Clone dan setup
git clone https://github.com/yourusername/ternak_ayam.git
cd ternak_ayam
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local dengan nilai yang sesuai

# 4. Database
npx prisma migrate deploy

# 5. Build
npm run build

# 6. Run dengan PM2
npm install -g pm2
pm2 start "npm start" --name "ternak-ayam"
pm2 save
pm2 startup

# 7. Setup Nginx sebagai reverse proxy
# (Lihat DEPLOYMENT.md untuk config Nginx)
```

## 🛠️ Teknologi

### Frontend
- **Astro 4.x** - Static site generator
- **HTML5 & CSS3** - Semantic markup & modern styling
- **JavaScript (TypeScript)** - Type-safe frontend logic

### Backend
- **Node.js** - JavaScript runtime
- **Astro API Routes** - Serverless functions
- **Express-like routing** - API endpoints

### Database & ORM
- **Prisma** - Modern ORM
- **SQLite** - Default development database
- **PostgreSQL** - Recommended for production

### Keamanan
- **Argon2id** - Password hashing algorithm
- **CSRF Protection** - Token-based CSRF validation
- **NIST SP 800-63B** - Password guidelines
- **Captcha** - Tantangan salted-hash untuk mencegah bot

### Deployment
- **Docker** - Containerization
- **PM2** - Process manager
- **Nginx** - Reverse proxy

## 🤝 Kontribusi

Kami menerima kontribusi! Untuk berkontribusi:

1. Fork repository
2. Buat branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

## 📝 Lisensi

Project ini dilisensikan di bawah MIT License - lihat [LICENSE](LICENSE) file untuk detail.

## 📞 Support & Contact

- 📧 Email: support@ternak-ayam.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/ternak_ayam/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/ternak_ayam/discussions)

---

Dibuat dengan ❤️ untuk komunitas peternakan modern Indonesia
