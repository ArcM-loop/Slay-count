/**
 * useBenfordAudit — React Hook untuk Audit Forensik Benford
 * ===========================================================
 * Hook ini mengorkestrasi pemanggilan BenfordAuditAgent
 * sebagai audit forensik on-demand dari halaman manapun.
 *
 * Cara pakai:
 *   const { runAudit, result, isRunning } = useBenfordAudit();
 *   await runAudit(); // Akan otomatis ambil semua transaksi bisnis aktif
 */

import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { BenfordAuditAgent } from '@/lib/swarm/agents/benfordAuditAgent';

export function useBenfordAudit() {
  const { activeBusiness } = useBusiness();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runAudit = useCallback(async (options = {}) => {
    if (!activeBusiness) {
      setError('Pilih bisnis terlebih dahulu.');
      return null;
    }

    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      // 1. Ambil semua transaksi bisnis aktif (max 1000 untuk analisis)
      const transactions = await GoogleGenerativeAI.entities.Transaction.filter(
        { business_id: activeBusiness.id },
        '-date',
        options.limit || 1000
      );

      console.log(`[BenfordHook] Loaded ${transactions.length} transactions for analysis.`);

      // 2. Jalankan BenfordAuditAgent langsung (standalone, bukan lewat SwarmOrchestrator)
      const agentResult = await BenfordAuditAgent.run(
        { transactions },
        {} // Context kosong — agen ini tidak butuh AI call
      );

      setResult(agentResult);
      return agentResult;

    } catch (err) {
      console.error('[BenfordHook] Audit failed:', err);
      setError(err.message);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [activeBusiness]);

  /**
   * Shorthand: Ambil hanya transaksi dari rentang tanggal tertentu
   */
  const runAuditForPeriod = useCallback(async (startDate, endDate) => {
    if (!activeBusiness) return null;

    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const allTransactions = await GoogleGenerativeAI.entities.Transaction.filter(
        { business_id: activeBusiness.id },
        '-date',
        2000
      );

      // Filter berdasarkan periode
      const filtered = allTransactions.filter(tx => {
        const d = tx.date;
        return d >= startDate && d <= endDate;
      });

      const agentResult = await BenfordAuditAgent.run(
        { transactions: filtered },
        {}
      );

      setResult(agentResult);
      return agentResult;

    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [activeBusiness]);

  return {
    runAudit,
    runAuditForPeriod,
    result,
    isRunning,
    error,
    /**
     * Data siap pakai untuk render chart:
     * Array of { digit, expected, actual } untuk 9 digit
     */
    chartData: result?.benford?.distribution
      ? Object.entries(result.benford.distribution).map(([digit, actual]) => ({
          digit: `Digit ${digit}`,
          'Aktual (%)': parseFloat((actual * 100).toFixed(2)),
          'Harapan Benford (%)': parseFloat(((result.benford.expected?.[digit] || 0) * 100).toFixed(2)),
        }))
      : [],
  };
}
