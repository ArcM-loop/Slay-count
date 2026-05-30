/**
 * secureApiClient.js — Frontend Gateway ke Backend SlayCount
 * ============================================================
 * Semua operasi yang butuh AI atau database write WAJIB melewati
 * file ini — bukan memanggil Gemini langsung dari browser.
 *
 * Keamanan:
 *   - Otomatis attach Firebase ID Token ke setiap request
 *   - Token di-refresh otomatis jika kedaluwarsa
 *   - Tidak ada secret key yang tersimpan di browser
 */

import { auth } from '@/API/GoogleGenerativeAI';

const getBackendUrl = () => {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  return 'http://localhost:5000';
};
const BASE_URL = getBackendUrl();

/**
 * Ambil Firebase ID Token yang valid (refresh otomatis jika perlu)
 */
async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Tidak ada sesi login aktif. Silakan login ulang.');
  return user.getIdToken(/* forceRefresh */ false);
}

/**
 * Generic secure fetch wrapper — attach token otomatis
 * @param {string} path - Endpoint path, contoh: '/api/journal/commit'
 * @param {Object} options - Fetch options (method, body, dll)
 */
async function secureFetch(path, options = {}) {
  const token = await getIdToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

  if (!response.ok) {
    const error = new Error(data.message || data.error || `HTTP ${response.status}`);
    error.status  = response.status;
    error.code    = data.error;
    error.details = data.errors || data.details;
    throw error;
  }

  return data;
}

/**
 * Commit journal entries ke server — ACID, server-validated
 *
 * @param {Object} tx - Transaksi lengkap
 * @param {Object[]} debitEntries
 * @param {Object[]} creditEntries
 * @param {Object} options - { requestAdvisory, existingJournalIds }
 * @returns {Promise<{ success, journalIds, warnings, advisory }>}
 */
export async function commitJournalToServer(tx, debitEntries, creditEntries, options = {}) {
  console.log('[SecureApiClient] Committing journal to server...');
  return secureFetch('/api/journal/commit', {
    method: 'POST',
    body: JSON.stringify({ tx, debitEntries, creditEntries, options })
  });
}

/**
 * Hapus journal entries via server (dicatat di audit log)
 *
 * @param {string[]} journalIds - Array ID jurnal yang akan dihapus
 * @param {string} transactionId - ID transaksi terkait
 * @param {string} businessId - ID bisnis
 * @param {string} reason - Alasan penghapusan (untuk audit)
 */
export async function deleteJournalsOnServer(journalIds, transactionId, businessId, reason = '') {
  console.log('[SecureApiClient] Deleting journals on server:', journalIds);
  return secureFetch('/api/journal/entries', {
    method: 'DELETE',
    body: JSON.stringify({ journalIds, transaction_id: transactionId, business_id: businessId, reason })
  });
}
