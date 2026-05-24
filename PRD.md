# 📋 PRD — Product Requirements Document
# Tradiary: Sistem Informasi Jurnal Perdagangan Otomatis

**Versi:** 1.0  
**Tanggal:** Januari 2026  
**Author:** Rio Luigi Del Niery (20220040120)  
**Universitas:** Nusa Putra Sukabumi — Teknik Informatika  
**Status:** Active Development  

---

## 1. 📌 Overview

### 1.1 Latar Belakang
Para trader yang aktif berdagang di platform MetaTrader 5 selama ini mencatat hasil transaksi secara manual menggunakan spreadsheet. Proses ini memakan waktu, rawan human error, dan tidak mendukung analisis real-time. Tradiary hadir sebagai solusi sistem informasi jurnal perdagangan otomatis berbasis web yang menyinkronkan data transaksi langsung dari MetaTrader 5 menggunakan teknologi Webhook.

### 1.2 Tujuan Produk
- Mengeliminasi proses data entry manual pada pencatatan jurnal trading
- Menyediakan dashboard analitik metrik kinerja portofolio secara real-time
- Membantu trader mengevaluasi strategi berdasarkan data historis yang akurat
- Menghasilkan produk yang memenuhi standar fungsionalitas dan usability sesuai evaluasi skripsi

### 1.3 Ruang Lingkup
Sistem Tradiary adalah aplikasi web yang:
- Menerima data transaksi otomatis dari MetaTrader 5 via Webhook
- Menyimpan dan mengelola data di cloud database Supabase (PostgreSQL)
- Menyajikan dashboard analitik interaktif untuk evaluasi kinerja trading
- **TIDAK** memberikan rekomendasi strategi trading atau prediksi arah pasar

---

## 2. 👤 User Persona

### Primary User: Trader Aktif
- **Profil:** Praktisi perdagangan finansial usia 18–45 tahun
- **Pengalaman:** Minimal 6 bulan menggunakan MetaTrader 5
- **Pain Point:**
  - Capek input data transaksi manual ke spreadsheet satu per satu
  - Tidak punya visualisasi performa yang rapi dan real-time
  - Sulit menganalisis pola keberhasilan strategi dari data mentah
- **Goal:**
  - Data transaksi otomatis tersimpan tanpa effort
  - Bisa lihat win rate, profit factor, dan equity curve seketika
  - Dashboard yang mudah dipahami tanpa perlu skill teknis tinggi

---

## 3. 🗺️ User Flow

```
[Buka Web] 
    → Belum login → [Halaman Login] → Input email/password → [Dashboard]
    → Sudah login → [Dashboard] langsung

[Dashboard]
    ├── Lihat KPI Cards (Win Rate, P/L, Profit Factor, Total Trades)
    ├── Lihat Equity Curve (Line Chart)
    ├── Lihat 5 transaksi terbaru
    └── Navigasi ke halaman lain via Sidebar

[Trade History]
    ├── Lihat semua transaksi dalam tabel
    ├── Filter by: tanggal, symbol, tipe (BUY/SELL)
    ├── Export data ke CSV
    └── Navigasi antar halaman (pagination)

[Analytics]
    ├── Bar Chart: Profit per Symbol
    ├── Pie Chart: Win vs Loss
    └── Area Chart: Kumulatif Profit

[Konfigurasi Webhook]
    ├── Lihat URL Webhook unik milik user
    ├── Copy URL dengan satu klik
    └── Baca panduan instalasi EA di MetaTrader 5

[MetaTrader 5 - Background]
    Transaksi ditutup → EA MQL5 aktif → Kirim HTTP POST ke /api/webhook
    → Data masuk Supabase → Dashboard diperbarui otomatis
```

---

## 4. 🧩 Fitur Lengkap

### 4.1 Autentikasi (Supabase Auth)

| Fitur | Deskripsi | Prioritas |
|-------|-----------|-----------|
| Login | Form email + password, validasi client-side | 🔴 High |
| Register | Form nama + email + password + konfirmasi password | 🔴 High |
| Logout | Tombol logout di sidebar, hapus sesi | 🔴 High |
| Protected Routes | Redirect ke /login jika belum autentikasi | 🔴 High |
| Middleware | Cek sesi di setiap request via middleware.ts | 🔴 High |

**Halaman:** `/login`, `/register`  
**Redirect setelah login:** `/dashboard`  
**Redirect setelah logout:** `/login`

---

### 4.2 Dashboard Utama (`/dashboard`)

| Komponen | Deskripsi | Prioritas |
|----------|-----------|-----------|
| KPI Card: Total Profit/Loss | Jumlah total P/L semua transaksi dalam mata uang | 🔴 High |
| KPI Card: Win Rate | Persentase transaksi profit dari total transaksi | 🔴 High |
| KPI Card: Profit Factor | Rasio total profit dibagi total loss | 🔴 High |
| KPI Card: Total Trades | Jumlah total transaksi yang tercatat | 🔴 High |
| Equity Curve | Line Chart kumulatif profit dari waktu ke waktu (Recharts) | 🔴 High |
| Recent Trades | Tabel 5 transaksi terbaru dengan kolom utama | 🟡 Medium |
| Real-time Update | Data otomatis refresh saat ada transaksi baru masuk | 🟡 Medium |

**Rumus KPI:**
```
Win Rate (%) = (Jumlah transaksi profit / Total transaksi) × 100
Profit Factor = Total profit kotor / |Total loss kotor|
Total P/L = SUM(profit) semua transaksi
```

---

### 4.3 Trade History (`/dashboard/history`)

| Komponen | Deskripsi | Prioritas |
|----------|-----------|-----------|
| Tabel Transaksi | Tampilkan semua transaksi user | 🔴 High |
| Kolom Tabel | Ticket, Symbol, Type, Volume, Open Price, Close Price, Open Time, Close Time, Profit, Commission | 🔴 High |
| Filter Tanggal | Date range picker (dari tanggal - sampai tanggal) | 🔴 High |
| Filter Symbol | Dropdown pilih symbol (XAUUSD, EURUSD, dll) | 🔴 High |
| Filter Type | Dropdown BUY / SELL / Semua | 🟡 Medium |
| Export CSV | Download semua data yang sedang ditampilkan ke file .csv | 🔴 High |
| Pagination | Tampilkan 20 data per halaman | 🟡 Medium |
| Sort Kolom | Klik header kolom untuk sort ascending/descending | 🟢 Low |

---

### 4.4 Analytics (`/dashboard/analytics`)

| Chart | Tipe | Data | Prioritas |
|-------|------|------|-----------|
| Profit per Symbol | Bar Chart (Recharts BarChart) | Group by symbol, sum profit | 🔴 High |
| Win vs Loss | Pie Chart (Recharts PieChart) | Count win trades vs loss trades | 🔴 High |
| Kumulatif Profit | Area Chart (Recharts AreaChart) | Cumulative sum profit by date | 🔴 High |
| Tooltip Interaktif | Semua chart punya tooltip saat hover | Detail nilai pada titik data | 🟡 Medium |

---

### 4.5 Webhook Endpoint (`/api/webhook`)

**Method:** `POST`  
**URL:** `https://tradiary-zeta.vercel.app/api/webhook`

**Request Body (JSON dari MetaTrader 5):**
```json
{
  "user_id": "uuid-user",
  "ticket": 123456789,
  "symbol": "XAUUSD",
  "type": "BUY",
  "volume": 0.10,
  "open_price": 2345.50,
  "close_price": 2356.75,
  "open_time": "2026-01-15T08:30:00Z",
  "close_time": "2026-01-15T10:45:00Z",
  "profit": 112.50,
  "commission": -2.50
}
```

**Validasi:**
- Semua field wajib harus ada (tidak boleh null/undefined)
- `type` harus berisi "BUY" atau "SELL"
- Nilai numerik tidak boleh berisi karakter non-angka
- `close_time` harus lebih besar dari `open_time`

**Response:**
| Kondisi | HTTP Status | Body |
|---------|-------------|------|
| Data valid & tersimpan | `200 OK` | `{ "success": true, "id": "uuid" }` |
| Field tidak lengkap | `400 Bad Request` | `{ "error": "Missing required fields: ..." }` |
| Data tidak valid | `400 Bad Request` | `{ "error": "Invalid data format" }` |
| Error server | `500 Internal Server Error` | `{ "error": "Internal server error" }` |

---

### 4.6 Konfigurasi Webhook (`/dashboard/config`)

| Komponen | Deskripsi | Prioritas |
|----------|-----------|-----------|
| URL Webhook | Tampilkan URL endpoint webhook sistem | 🔴 High |
| Tombol Copy | Salin URL ke clipboard dengan satu klik | 🔴 High |
| Panduan Instalasi EA | Step-by-step cara pasang EA di MetaTrader 5 | 🟡 Medium |
| Status Koneksi | Indikator apakah webhook sudah pernah menerima data | 🟢 Low |

---

## 5. 🗄️ Struktur Database

### Tabel: `trades`
```sql
id           uuid         PRIMARY KEY (auto-generated)
user_id      uuid         FOREIGN KEY → auth.users(id) ON DELETE CASCADE
ticket       bigint       NOT NULL (nomor tiket unik dari MT5)
symbol       varchar(20)  NOT NULL (contoh: XAUUSD, EURUSD)
type         varchar(10)  NOT NULL (BUY atau SELL)
volume       decimal(10,2) NOT NULL
open_price   decimal(10,5) NOT NULL
close_price  decimal(10,5) NOT NULL
open_time    timestamptz  NOT NULL
close_time   timestamptz  NOT NULL
profit       decimal(12,2) NOT NULL
commission   decimal(10,2) DEFAULT 0
created_at   timestamptz  DEFAULT now()
```

### Row Level Security (RLS):
```sql
-- User hanya bisa akses data miliknya sendiri
CREATE POLICY "Users can only access own trades"
ON trades FOR ALL
USING (auth.uid() = user_id);
```

---

## 6. 🏗️ Arsitektur Teknis

### Stack Teknologi
| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Frontend Framework | Next.js | 14 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Database & Auth | Supabase (PostgreSQL) | Latest |
| Charts | Recharts | Latest |
| Icons | Lucide React | Latest |
| Deployment | Vercel | - |

### Struktur Folder
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx        ← Sidebar layout
│   │   ├── page.tsx          ← Dashboard utama
│   │   ├── history/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   └── config/
│   │       └── page.tsx
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts      ← Webhook endpoint
│   ├── layout.tsx
│   └── page.tsx              ← Redirect ke /dashboard atau /login
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   ├── layout/
│   │   └── Sidebar.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   └── RecentTrades.tsx
│   ├── charts/
│   │   ├── EquityChart.tsx
│   │   ├── ProfitBySymbol.tsx
│   │   ├── WinLossPie.tsx
│   │   └── CumulativeProfit.tsx
│   └── history/
│       ├── TradeTable.tsx
│       ├── FilterBar.tsx
│       └── ExportButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts         ← Browser client
│   │   └── server.ts         ← Server client
│   └── utils.ts              ← Helper functions (format currency, date, dll)
├── types/
│   └── trade.ts              ← TypeScript types
└── middleware.ts              ← Auth protection
```

---

## 7. 🎨 Desain UI/UX

### Identitas Visual
| Elemen | Nilai |
|--------|-------|
| Warna Utama | `#1e3a5f` (Navy Dark) |
| Warna Accent | `#2563eb` (Blue 600) |
| Warna Sukses | `#16a34a` (Green 600) |
| Warna Danger | `#dc2626` (Red 600) |
| Background | `#0f172a` (Slate 900) — Dark Mode |
| Card Background | `#1e293b` (Slate 800) |
| Text Utama | `#f1f5f9` (Slate 100) |
| Text Secondary | `#94a3b8` (Slate 400) |

### Prinsip Desain
- **Dark mode** sebagai default (sesuai nuansa aplikasi finansial profesional)
- Layout sidebar di kiri, konten di kanan
- Card dengan subtle border dan shadow untuk depth
- Profit ditampilkan **hijau**, loss ditampilkan **merah**
- Tabel dengan striped rows untuk keterbacaan
- Responsive: sidebar collapse di mobile

---

## 8. ✅ Kriteria Keberhasilan (Sesuai Skripsi)

### Fungsionalitas (Black Box Testing)
| No | Skenario | Target |
|----|----------|--------|
| 1 | Login dengan kredensial valid | ✅ Pass |
| 2 | Login dengan kredensial salah | ✅ Pass (error message) |
| 3 | Webhook menerima JSON valid dari MT5 | ✅ Pass (200 OK) |
| 4 | Webhook menerima JSON tidak valid | ✅ Pass (400 Bad Request) |
| 5 | Data tersimpan akurat di Supabase | ✅ Pass (akurasi 100%) |
| 6 | Trade History menampilkan semua data | ✅ Pass |
| 7 | Kalkulasi metrik (Win Rate, PF) akurat | ✅ Pass |
| 8 | Grafik Analytics tampil dengan benar | ✅ Pass |
| 9 | Filter data berfungsi sesuai parameter | ✅ Pass |
| 10 | Export CSV berhasil dengan data lengkap | ✅ Pass |
| 11 | RLS: User hanya akses data sendiri | ✅ Pass |
| 12 | Dashboard update real-time | ✅ Pass |

### Usability Testing
| Aspek | Target Minimum |
|-------|----------------|
| Kemudahan Penggunaan | ≥ 80% |
| Kemudahan Dipelajari | ≥ 80% |
| Efisiensi Antarmuka | ≥ 80% |
| Kepuasan Pengguna | ≥ 80% |
| Kemudahan Navigasi | ≥ 80% |
| **Total Usability** | **≥ 80% (Kategori Baik)** |

### Performa Sistem
| Metrik | Target |
|--------|--------|
| Waktu muat halaman | < 3 detik |
| Waktu respons API Webhook | < 1 detik |
| Waktu simpan ke database | < 500ms |

---

## 9. ⚠️ Batasan Sistem

1. Data transaksi hanya bisa masuk dari MetaTrader 5 (bukan MT4 atau platform lain)
2. Sistem tidak memberikan sinyal atau rekomendasi trading
3. Tidak ada fitur analisis prediktif atau machine learning
4. Satu akun hanya untuk satu user (tidak ada fitur tim/sharing)
5. Data transaksi yang sudah tersimpan tidak bisa diedit manual (hanya bisa dihapus)

---

## 10. 🚀 Rencana Development

### Phase 1 — Foundation (Minggu 1)
- [ ] Setup project Next.js + TypeScript + Tailwind
- [ ] Konfigurasi Supabase client (browser & server)
- [ ] Middleware autentikasi (protected routes)
- [ ] Halaman Login & Register

### Phase 2 — Core Features (Minggu 2)
- [ ] Layout Dashboard + Sidebar
- [ ] Dashboard utama (KPI Cards + Equity Chart)
- [ ] API Endpoint Webhook (`/api/webhook`)
- [ ] Halaman Konfigurasi Webhook

### Phase 3 — Data Features (Minggu 3)
- [ ] Halaman Trade History (tabel + filter + pagination)
- [ ] Export CSV
- [ ] Halaman Analytics (3 jenis chart)

### Phase 4 — Polish & Testing (Minggu 4)
- [ ] Responsive design (mobile)
- [ ] Black Box Testing (12 skenario)
- [ ] Usability Testing (30 responden)
- [ ] Deploy ke Vercel
- [ ] Bug fixes & optimasi

---

*PRD ini disusun berdasarkan Skripsi "Pengembangan dan Evaluasi Kualitas Perangkat Lunak pada Sistem Perdagangan (Tradiary) Otomatis Menggunakan Teknologi Webhook pada Platform Web" — Rio Luigi Del Niery, Universitas Nusa Putra Sukabumi, 2026.*
