/**
 * auditLogger.js
 * Utility untuk mencatat setiap aktivitas sensitif dalam sistem untuk kebutuhan audit profesional.
 */
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';

export const auditLogger = {
  /**
   * Log aktivitas user
   * @param {string} businessId 
   * @param {string} action - Contoh: 'VOID_TRANSACTION', 'UPDATE_LOCK_DATE', 'MANUAL_JOURNAL'
   * @param {string} details - Deskripsi detail perubahan
   */
  log: async (businessId, action, details) => {
    try {
      const user = await GoogleGenerativeAI.auth.me();
      await GoogleGenerativeAI.entities.AuditLog.create({
        business_id: businessId,
        user_email: user?.email || 'unknown',
        action,
        details,
        timestamp: new Date().toISOString()
      });
      console.log(`[AuditLog] ${action}: ${details}`);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
};
