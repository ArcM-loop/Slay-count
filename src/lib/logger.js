/**
 * [CVE-6 Fixed by Herta] — Secure Logger Utility
 * ================================================
 * Logger yang cerdas: berbicara di Development, diam di Production.
 *
 * Di mode Development (npm run dev):
 *   → Semua log tampil normal di console.
 *
 * Di mode Production (npm run build → deploy):
 *   → Semua log DIBLOKIR secara otomatis.
 *   → Tidak ada informasi arsitektur Swarm yang bocor ke browser.
 *
 * Cara pakai:
 *   import { log, warn, error } from '@/lib/logger';
 *   log('[MyAgent] Doing something...');   // Menggantikan console.log
 *   warn('[MyAgent] Something odd...');   // Menggantikan console.warn
 *   error('[MyAgent] Failed!', err);      // Menggantikan console.error
 */

const IS_DEV = import.meta.env.DEV === true;

export const log = (...args) => {
  if (IS_DEV) console.log(...args);
};

export const warn = (...args) => {
  if (IS_DEV) console.warn(...args);
};

export const error = (...args) => {
  // Error tetap muncul di development, tapi DIAM di production
  if (IS_DEV) console.error(...args);
};

export const debug = (...args) => {
  if (IS_DEV) console.debug('[DEBUG]', ...args);
};

// Default export untuk kemudahan import
export default { log, warn, error, debug };
