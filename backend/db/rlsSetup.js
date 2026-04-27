// (3) Row Level Security (RLS) setup untuk tabel di PostgreSQL
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupRLS() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Asumsi kita memiliki tabel 'transactions'
    console.log("Mengaktifkan Row Level Security (RLS) pada tabel transactions...");
    
    // Buat tabel jika belum ada (hanya untuk demonstrasi)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT
      );
    `);

    // Mengaktifkan RLS
    await client.query(`ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;`);
    
    // Menghapus policy lama jika ada (opsional untuk menghindari error 'policy already exists')
    await client.query(`DROP POLICY IF EXISTS user_only_transactions ON transactions;`);

    // Membuat Policy: User hanya dapat SELECT, INSERT, UPDATE, DELETE data miliknya sendiri
    // Memanfaatkan parameter 'app.current_user_id' yang akan di-set oleh aplikasi sebelum query
    await client.query(`
      CREATE POLICY user_only_transactions ON transactions
      FOR ALL
      USING (user_id = current_setting('app.current_user_id', true));
    `);

    // Contoh di Express saat melakukan query nantinya:
    // await client.query("SET LOCAL app.current_user_id = $1", [req.user.uid]);
    // await client.query("SELECT * FROM transactions");

    await client.query('COMMIT');
    console.log("RLS berhasil diaktifkan pada tabel transactions!");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Gagal mengaktifkan RLS:", error);
  } finally {
    client.release();
  }
}

// Menjalankan script ini secara langsung: `node rlsSetup.js`
if (require.main === module) {
  setupRLS().then(() => pool.end());
}

module.exports = setupRLS;
