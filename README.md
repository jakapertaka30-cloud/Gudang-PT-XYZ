# WMS Mattress

Warehouse Management System prototype untuk pengelolaan bahan baku pembuatan mattress atau kasur.

<p align="center">
  <img src="assets/logo.svg" alt="WMS Mattress Logo" width="120" />
</p>

## Overview

Aplikasi membantu tim warehouse mengelola:
- material master
- supplier master
- lokasi gudang
- receiving barang
- kualitas (QC)
- putaway
- issuing
- stock monitoring
- inventory movement
- opname
- report ringkas

## Struktur repository

```text
WMS-MATTRESS/
├── app.js
├── dashboard.js
├── data.js
├── favicon.svg
├── .gitignore
├── index.html
├── issuing.js
├── locations.js
├── logo.svg
├── materials.js
├── movement.js
├── opname.js
├── putaway.js
├── qc.js
├── receiving.js
├── reports.js
├── stock.js
├── style.css
├── suppliers.js
├── utils.js
├── .nojekyll
├── README.md
├── assets/
│   ├── favicon.svg
│   ├── landing-preview.svg
│   └── logo.svg
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── dashboard.js
│   ├── data.js
│   ├── issuing.js
│   ├── locations.js
│   ├── materials.js
│   ├── movement.js
│   ├── opname.js
│   ├── putaway.js
│   ├── qc.js
│   ├── receiving.js
│   ├── reports.js
│   ├── stock.js
│   ├── suppliers.js
│   └── utils.js
└── server.js
```

Berkas frontend di root menjadi entrypoint untuk GitHub Pages. CSS root memuat stylesheet yang sudah ada di `css/style.css`, sedangkan skrip root meneruskan pemuatan skrip sumber di `js/`. Berkas sumber asli tetap dipertahankan.

## Demo / preview

Berikut gambaran dashboard yang sudah dibuat:

![Landing Preview](assets/landing-preview.svg)

## Menjalankan dengan Supabase

Aplikasi memerlukan koneksi internet, Supabase, dan HTTP/HTTPS; jangan buka `index.html` melalui `file://`.

1. Di Supabase, buka **SQL Editor**, jalankan seluruh isi `supabase-schema.sql`. Jika skema sudah pernah dipasang, jalankan ulang file versi terbaru agar fungsi role dan peran `manager` tersedia.
2. Buka **Project Settings → API** dan salin Project URL serta anon/publishable key.
3. Isi nilai `url` dan `anonKey` di `supabase-config.js`. Key ini memang untuk frontend; jangan gunakan `service_role` key.
4. Di **Authentication → Users**, buat atau undang akun pengguna. Aplikasi hanya menyediakan login, bukan pendaftaran publik.
5. Tetapkan setiap akun ke peran `admin`, `manager`, atau `director` menggunakan SQL Editor. Ganti email contoh dengan email akun Supabase:

   ```sql
   insert into public.wms_user_roles (user_id, role)
   select id, 'admin' from auth.users where lower(email) = lower('admin@example.com')
   on conflict (user_id) do update set role = excluded.role;

   insert into public.wms_user_roles (user_id, role)
   select id, 'director' from auth.users where lower(email) = lower('director@example.com')
   on conflict (user_id) do update set role = excluded.role;

   insert into public.wms_user_roles (user_id, role)
   select id, 'manager' from auth.users where lower(email) = lower('manager@example.com')
   on conflict (user_id) do update set role = excluded.role;
   ```

   Jalankan query yang sesuai untuk setiap akun. Periksa hasil dengan `select user_id, role from public.wms_user_roles;`.
6. Tambahkan alamat aplikasi ke **Authentication → URL Configuration → Redirect URLs**.
7. Jalankan folder ini melalui server lokal, misalnya ekstensi VS Code **Live Server** atau `python -m http.server 8000`, kemudian buka alamat HTTP yang ditampilkan.
8. Login dengan akun yang perannya sudah ditetapkan. Jika database Supabase masih kosong, admin pertama yang login akan membuat database gudang kosong; akun manager dan direktur hanya dapat membaca data yang sudah ada.

`admin` dapat melihat dan mengubah semua data. `manager` dan `director` dapat melihat dashboard, master, transaksi, stok, dan laporan; form input serta aksi edit/hapus disembunyikan. Kebijakan RLS dan RPC juga menolak perubahan dari kedua peran tersebut di server. Penetapan peran dilakukan dari SQL Editor; jangan berikan akses tulis ke tabel `wms_user_roles` kepada pengguna aplikasi.

Setelah data Supabase tersedia, data cloud menjadi sumber utama dan data lokal akan diperbarui saat login. Semua akun yang dibuat untuk project ini berbagi satu gudang.

### Catatan sinkronisasi

- Data disimpan pada tabel terpisah per koleksi WMS. Setiap baris mempertahankan record aplikasi dalam kolom JSONB agar migrasi tidak membuang field yang sudah digunakan.
- Setiap perubahan dikirim sebagai snapshot transaksi agar kelompok perubahan stok dan log tetap atomik. Revision check menolak penyimpanan dari sesi lama agar perubahan pengguna lain tidak tertimpa diam-diam; setelah konflik, muat ulang aplikasi untuk mengambil data terbaru.
- Data tetap dicache di `localStorage` pada browser, tetapi cache browser bukan sumber utama setelah terhubung.
- Jangan jalankan file SQL berulang setelah aplikasi mulai digunakan tanpa memahami efek perubahan skema. Simpan backup data sebelum perubahan operasional.
- Untuk pemakaian produksi, uji dahulu alur receiving, issuing, opname, akses akun, dan backup/restore di project Supabase terpisah.

## Fitur utama

- Dashboard management
- Master material
- Master supplier
- Master lokasi gudang
- Receiving / GR
- QC
- Putaway
- Issuing
- Stock
- Movement log
- Opname
- Reports
- Ringkasan inventory aktual dan pemantauan receiving/issuing per periode
- Grafik stok aktual terhadap Minimum Stock dan Maximum Stock
- Alert dan rekomendasi rule-based berdasarkan kondisi persediaan

## Minimum–Maximum Stock

- Minimum Stock wajib berupa angka nol atau lebih; Maximum Stock dapat dikosongkan sampai batasnya diketahui.
- Status `NORMAL`, `BELOW MINIMUM`, dan `ABOVE MAXIMUM` hanya ditentukan jika kedua batas persediaan valid.
- Data material lama tanpa Maximum Stock tetap dipertahankan dan ditampilkan sebagai `PARAMETER INCOMPLETE`; aplikasi tidak mengisi batas buatan.
- Stockout dikenali dari stok aktual nol. Rekomendasi hanya memberi saran dan tidak mengubah stok atau membuat pengadaan otomatis.
- Prioritas rekomendasi: `HIGH` untuk stockout, `MEDIUM` untuk stok di luar batas atau parameter belum lengkap, dan `LOW` untuk pemantauan rutin pada stok normal.
- Filter dashboard menerapkan periode harian, mingguan, atau bulanan serta material dan kategori pada monitoring pergerakan.

## GitHub Pages / upload repo

Folder ini sudah dibuat dalam satu direktori yang siap diupload ke GitHub. Untuk GitHub Pages, cukup push folder ini ke repository dan aktifkan Pages sebagai static site.

## License

Project ini dibuat untuk kebutuhan prototype internal dan dapat dikembangkan lebih lanjut sesuai kebutuhan bisnis.
