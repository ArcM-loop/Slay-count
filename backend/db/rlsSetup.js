// Row Level Security (RLS) setup untuk tabel di PostgreSQL (ES Module)
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

let poolConfig = {};

if (process.env.INSTANCE_CONNECTION_NAME) {
  // Mode Produksi: Koneksi aman via Unix Socket Cloud SQL di Cloud Run
  poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
  };
  console.log('[Database] ✅ Menggunakan koneksi Unix Socket Google Cloud SQL.');
} else {
  // Mode Development / Local TCP/IP
  poolConfig = {
    connectionString: process.env.DATABASE_URL
  };
  console.log('[Database] ℹ️ Menggunakan koneksi TCP/IP Connection String.');
}

const pool = new Pool(poolConfig);

async function setupRLS() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
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
    await client.query(`
      CREATE POLICY user_only_transactions ON transactions
      FOR ALL
      USING (user_id = current_setting('app.current_user_id', true));
    `);

    await client.query('COMMIT');
    console.log("✅ RLS berhasil diaktifkan pada tabel transactions!");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Gagal mengaktifkan RLS:", error);
  } finally {
    client.release();
  }
}

// Jalankan script ini secara langsung jika dipanggil via CLI
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('rlsSetup.js') || 
  process.argv[1].endsWith('rlsSetup')
);

if (isDirectRun) {
  setupRLS().then(() => pool.end());
}

export default setupRLS;
