/**
 * SLAYCOUNT IMMUTABLE AUDIT TRAIL
 * ===============================
 * Menjamin integritas data dengan mencatat setiap perubahan
 * secara append-only (hanya bisa tambah, tidak bisa hapus/edit).
 */

import { db, auth } from './firebaseConfig'; // [CVE-10 Fixed by Herta] Path yang benar
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  REJECT: 'REJECT_BY_SWARM',
  RESTORE: 'RESTORE'
};

/**
 * Mencatat log audit ke Firestore
 * @param {Object} params - { action, entityType, entityId, before, after, reason }
 */
export async function logAudit({ action, entityType, entityId, before = null, after = null, reason = '' }) {
  const user = auth.currentUser;
  
  if (!user) {
    console.warn('[AuditTrail] Attempted to log without authenticated user.');
  }

  const auditData = {
    timestamp: serverTimestamp(),
    userId: user?.uid || 'SYSTEM',
    userEmail: user?.email || 'system@slaycount.ai',
    action: action,            // CREATE, UPDATE, DELETE
    entityType: entityType,    // 'JOURNAL', 'TAX_CONFIG', 'ASSET'
    entityId: entityId,        // ID dokumen yang diubah
    changes: {
      before: before,          // State sebelum perubahan
      after: after             // State sesudah perubahan
    },
    reason: reason,            // Mengapa data ini diubah/dihapus?
    clientIp: 'logged-by-client' // Bisa ditingkatkan dengan IP server di backend
  };

  try {
    const docRef = await addDoc(collection(db, 'audit_logs'), auditData);
    console.log(`[AuditTrail] Log created: ${docRef.id} for ${action} on ${entityType}`);
    return docRef.id;
  } catch (error) {
    console.error('[AuditTrail] Failed to write audit log:', error);
    // PENTING: Dalam sistem audit-grade, kegagalan log harus menghentikan transaksi utama.
    throw new Error('Audit Logging Failed. Transaction aborted for security.');
  }
}
