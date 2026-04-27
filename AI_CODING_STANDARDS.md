# 📜 SlayCount - AI Coding Standards & Guidelines

Dokumen ini berisi instruksi dan standar koding wajib bagi AI (dan developer lain) yang berkontribusi pada proyek SlayCount. Tujuannya adalah memastikan kode tidak "hardcore" (terlalu rumit/clever tapi sulit dibaca), mudah di-scale, dan gampang di-maintenance di masa depan.

## 1. 🧩 Pendekatan Modular (Separation of Concerns)
Pisahkan antara UI (tampilan), State Management, dan Business Logic.
- **Components (`/src/components`)**: Hanya berisi UI murni dan integrasi hooks. Jangan menaruh logic perhitungan yang rumit di sini.
- **Custom Hooks (`/src/hooks`)**: Gunakan hooks untuk memisahkan logic React (state, useEffect, fetching) dari komponen UI.
- **Services/Logic (`/src/services` atau `/src/logic`)**: Berisi logic bisnis murni, kalkulasi akuntansi/pajak, atau pemanggilan API (fetch/axios) yang tidak bergantung pada React.

## 2. 🧱 Prinsip SOLID (Fokus pada Penerapan Praktis)
- **Single Responsibility Principle (SRP)**: Satu fungsi / satu komponen hanya boleh melakukan **satu hal**. Jika sebuah komponen melakukan fetching data, memformat data, dan me-render UI sekaligus, pecah menjadi bagian-bagian kecil.
- **Open/Closed Principle**: Buat fungsi/komponen yang mudah diekstensi (misal dengan melempar `props` atau callback) tanpa harus mengubah kode intinya.
- **Modularity**: Logic perhitungan akuntansi/pajak WAJIB dipisah ke `/src/logic/` dan tidak boleh tercampur di dalam file JSX.
- Hindari "God Object" atau file raksasa yang menangani segala hal.

## 3. 💼 Prinsip Output Profesional (The "Slay but Professional" Rule)
Meskipun SlayCount menggunakan UI/UX yang kekinian (Neon, Dark Mode, Casual Language), **hasil keluaran (Output)** seperti laporan Excel dan PDF **WAJIB** terlihat profesional:
- **Excel Export**: Harus menggunakan template bersih, latar belakang putih, format angka akuntansi (ribuan dipisah titik/koma), dan header entitas yang formal. Lihat `src/lib/excelExporter.js`.
- **Standar Akuntansi**: Semua perhitungan harus mematuhi PSAK Indonesia.
- **No Emojis in Reports**: Laporan yang ditujukan untuk auditor tidak boleh mengandung emoji atau bahasa gaul.

## 4. 🔒 Keamanan & Verifikasi Identitas (Server-Side Auth)
Keamanan data adalah prioritas utama. Validasi di sisi client hanya untuk UX, validasi sesungguhnya harus di server:
- **Server-Side Verification**: Setiap permintaan data sensitif **WAJIB** memanggil fungsi verifikasi identitas (seperti `auth.getUser()` atau `verifyIdToken()`) di sisi server untuk memastikan pengguna adalah pemilik sah dari data tersebut.
- **Jangan Percaya Client**: Jangan pernah mengirimkan `userId` dari client dan langsung menggunakannya untuk query database tanpa verifikasi token di server.
- **Role-Based Access Control (RBAC)**: Pastikan setiap endpoint memeriksa apakah user memiliki hak akses terhadap entitas yang diminta.

## 5. 📚 Dokumentasi Standar (JSDoc)
Setiap fungsi, hooks, atau service **wajib** memiliki dokumentasi JSDoc singkat di atasnya agar developer selanjutnya langsung paham tanpa perlu membaca baris per baris kode.

**Contoh JSDoc Wajib:**
```javascript
/**
 * Menghitung total pajak berdasarkan daftar transaksi.
 * @param {Array<Object>} transactions - Array of transaction objects.
 * @param {number} taxRate - Persentase pajak dalam desimal (contoh: 0.11 untuk 11%).
 * @returns {number} Total pajak yang harus dibayar.
 */
export const calculateTotalTax = (transactions, taxRate) => {
  // implementation...
}
```

## 5. 🚫 Anti "Hardcore" Code
- **Readability > Cleverness**: Jangan gunakan one-liner code (seperti ternary operator bersarang/nested ternaries) yang membuat pusing.
- Lebih baik menulis 5 baris `if-else` yang sangat jelas daripada 1 baris *short-circuit logic* yang butuh 5 menit untuk dipahami.
- Hindari *Magic Numbers*. Simpan angka-angka penting ke dalam variabel konstan (misal: `const DEFAULT_TAX_RATE = 0.11`).

---
*Catatan untuk AI: Patuhi aturan ini dan referensi di `.cursorrules` di setiap interaksi, refactoring, atau pembuatan fitur baru untuk SlayCount. Jaga agar setiap file tetap modular dan kecil.*
