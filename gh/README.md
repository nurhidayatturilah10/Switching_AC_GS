# Monitoring Switching AC – Alfamidi Branch Palu

Situs statis (HTML + JavaScript) yang langsung berjalan di **GitHub Pages**, tanpa server.

| Halaman | Pengguna | Login |
|---|---|---|
| `index.html` | AM | **NIK** yang didaftarkan admin. Melihat dashboardnya |
| `admin.html` | Admin | **Tanpa login**. Unggah Excel, kelola daftar AM & kode, pesan/pengumuman, publikasi (butuh token GitHub) |

## Pasang di GitHub (sekali saja)
1. Buat repository, unggah **seluruh isi folder ini** (Add file → Upload files). Jika sebelumnya sudah ada file `data/am-*.bin` lama, hapus (publikasi dari admin juga akan menghapusnya otomatis).
2. Settings → Pages → *Deploy from a branch* → `main` / `(root)` → Save.
3. Alamat: `https://USERNAME.github.io/NAMA-REPO/` (AM) dan `.../admin.html` (admin).
4. Token untuk admin: GitHub → Settings → Developer settings → Fine-grained tokens → hanya repository ini, izin **Contents: Read and write**.
5. Daftar login awal ada di `daftar-login-awal.txt` dan `cadangan-akun-awal.json` (**jangan diunggah**). NIK di sana hanya contoh: di halaman admin → bagian 2 → *Impor cadangan*, lalu ganti dengan NIK asli.

## Mengelola pengguna (admin)
**Daftar karyawan** ada di sheet baru **Karyawan Aktif** pada template Excel (`Template_Switching_AC_GS_v2.xlsx`): NIK, nama lengkap, posisi/jabatan, dan status *Aktif/Nonaktif*. Kolom NIK berformat teks agar angka 16 digit tidak terpotong.

`admin.html` → menu **Pengguna**: ketik atau pilih **NIK**, maka nama lengkap dan jabatan terbaca otomatis dari sheet tersebut. Klik **Tambah pengguna**, lalu **Publikasi**. Pengguna masuk di halaman utama hanya dengan memasukkan NIK; nama dan jabatannya tampil otomatis di dashboard. Tidak ada password.
- Hanya karyawan berstatus **Aktif** yang bisa didaftarkan dan bisa masuk. Kalau ada yang berhenti, ubah statusnya menjadi **Nonaktif** di Excel, unggah ulang, dan Publikasi: aksesnya otomatis dicabut (dilewati saat publikasi) dan statusnya tampil merah di daftar.
- Bila sheet Karyawan Aktif belum diisi/diunggah, nama dan jabatan bisa diisi manual.
- Daftar karyawan **tidak** ikut dikirim ke pengguna; hanya tersimpan di cadangan terenkripsi admin.
- **Catatan keamanan:** karena hanya memakai NIK, siapa pun yang mengetahui NIK terdaftar bisa masuk. Data terenkripsi dengan kunci dari NIK (PBKDF2 600.000 putaran), tetapi NIK pendek atau berpola mudah tetap lemah. Gunakan NIK asli dan nonaktifkan karyawan yang sudah tidak bertugas.

## Update data
`admin.html` → **1. Unggah** Excel → cek pratinjau → **3. Publikasi**. AM melihat data baru dalam 1–2 menit. Daftar AM, kode, dan data lengkap tersimpan terenkripsi di `data/admin.bin`, sehingga admin bisa login dari komputer mana pun tanpa mengunggah ulang.

## Pesan untuk toko / AM
Tab **Perlu Ditindaklanjuti** → ✉ Kirim (WhatsApp / salin / simpan ke dashboard AM), **Pesan rekap per AM**, dan panel **4. Pengumuman**.

## Keamanan
- GitHub Pages bersifat publik, jadi semua data **dienkripsi AES-256-GCM**. Kunci enkripsi dan nama file diturunkan dari NIK + password (PBKDF2), sehingga password tidak pernah disimpan atau dikirim dan daftar user tidak terlihat dari luar.
- NIK relatif mudah diketahui orang lain, jadi keamanan bergantung pada **password**: pakai password acak ≥ 8 karakter (otomatis 10), jangan tanggal lahir atau angka urut.
- `admin.html` terbuka tanpa login, tetapi tidak memuat data apa pun dan tidak bisa mengubah repository tanpa token GitHub. Jaga token; bila token diganti, cadangan `admin.bin` lama tidak bisa dibuka (gunakan cadangan .json atau unggah ulang Excel).

## Jika AM tidak bisa masuk
1. Buka lewat `https://…github.io/…` dengan browser terbaru.
2. NIK dan password harus yang terakhir dipublikasikan; cek di admin bagian 2 (huruf besar/kecil password berpengaruh). Tunggu 1–2 menit setelah publikasi lalu Ctrl+F5.

## Uji coba login AM tanpa internet
1. Di `admin.html` (bagian 3) klik **⬇ Paket uji offline** → file `offline.js`. Simpan ke folder `data/` pada salinan situs di komputer.
2. Klik dua kali `index.html`. Muncul label "Mode uji coba offline"; masukkan kode AM seperti biasa.
3. Paket `uji-coba-offline.zip` sudah berisi semuanya (siap diekstrak). **Jangan diunggah ke GitHub** bersama file kode.
Catatan: unggah Excel dan Publikasi di halaman admin tetap butuh internet (pustaka pembaca Excel dan GitHub). Cukup `offline.js` bila hanya menguji login.

## Berjalan online maupun offline (PWA)
- Setelah dibuka **sekali** lewat `https://…github.io/…`, aplikasi menyimpan berkas situs dan data **terenkripsi** di perangkat (service worker `sw.js`). Berikutnya bisa dibuka tanpa internet, juga saat sinyal lemah (jaringan dicoba maks. 3,5 detik, lalu dipakai salinan tersimpan).
- Saat ada internet, data selalu diambil yang terbaru; saat mati, tampil data terakhir yang tersimpan. Lencana **● Online / ● Offline** di header menunjukkan kondisinya.
- User harus login **sekali saat online** di tiap perangkat (agar datanya tersimpan). Setelah itu NIK dan password tetap diminta, tetapi data terbuka tanpa internet. Bila akses AM dicabut admin, salinan tersimpan terhapus pada kunjungan online berikutnya.
- Bisa dipasang seperti aplikasi (tombol **⬇ Pasang** / "Add to Home Screen"), tampil layar penuh di HP.
- Admin: pembaca Excel (CDN) ikut tersimpan setelah halaman admin dibuka sekali online, sehingga unggah Excel & pratinjau bisa offline. **Publikasi** tetap butuh internet; data admin tetap aman di browser sampai dipublikasikan.
- Hanya berkas terenkripsi yang disimpan di perangkat; data asli tidak pernah ditulis ke cache.
- Tampilan menyesuaikan HP (kartu), tablet, laptop, layar lebar, mode landscape, dan cetak. Jika memperbarui situs, cukup unggah file baru; pengguna mendapat versi baru pada kunjungan online berikutnya.
- Dibuka langsung dari file (tanpa https) tidak bisa memakai service worker; gunakan paket uji offline (`data/offline.js`).

## Panel admin & pencarian
- `admin.html` memakai menu: **Unggah Data** (tarik-lepas file), **User Login**, **Publikasi** (dengan daftar periksa kesiapan), **Pengumuman**, dan **Pratinjau Dashboard**, plus ringkasan sumber data, jumlah baris, toko, dan user di bagian atas.
- Semua dashboard (admin dan user) punya filter global: **Cari toko (kode/nama)**, AM, Area, Tipe toko, dan Area Coordinator, serta tombol Reset. Filter berlaku ke semua tab; tab **Daftar Toko** menampilkan seluruh toko wajib cek beserta statusnya.
