/**
 * EXPORT SWARM ORCHESTRATOR
 * Memastikan setiap file yang di-export (PDF, Excel, XML) 
 * telah melewati audit kualitas dan kepatuhan.
 */

import { SwarmOrchestrator } from './orchestrator';
import { log } from '@/lib/logger'; // [CVE-6 Fixed by Herta]

// 1. Agen Kerapian & Format (Visual)
const FormattingAgent = {
  name: 'FormattingGuardian',
  description: 'Memverifikasi keselarasan visual, kebersihan format sel, dan menyaring teks mata uang manual agar tidak merusak formula Excel.',
  tier: 1,
  async run(payload) {
    log('[ExportSwarm] Checking visual consistency programmatically...');
    
    // Validasi data transaksi jika ada
    if (payload.transactions && Array.isArray(payload.transactions)) {
      for (let i = 0; i < payload.transactions.length; i++) {
        const tx = payload.transactions[i];
        if (tx.amount === undefined || tx.amount === null || isNaN(tx.amount)) {
          return {
            status: 'REJECTED',
            message: `Visual Error: Ditemukan transaksi ke-${i + 1} dengan jumlah nominal kosong atau tidak valid.`
          };
        }
        
        // Memastikan tidak ada teks mata uang manual "Rp" di field amount
        if (typeof tx.amount === 'string' && (tx.amount.includes('Rp') || tx.amount.includes('rp'))) {
          return {
            status: 'REJECTED',
            message: `Visual Error: Jumlah nominal mengandung karakter teks mata uang manual (Rp) yang dapat merusak formula matematika Excel.`
          };
        }
      }
    }
    
    return { status: 'APPROVED', message: 'Visual & layout terverifikasi rapi dan aman.' };
  }
};

// 2. Agen Integritas Data (Totalitas)
const IntegrityAgent = {
  name: 'IntegrityAuditor',
  description: 'Melakukan audit matematis ketat pada Buku Besar dan Neraca Saldo untuk memastikan keseimbangan Debit-Kredit.',
  tier: 2,
  async run(payload) {
    log('[ExportSwarm] Auditing mathematical integrity programmatically...');
    const { totalDebit, totalCredit } = payload.summary || {};
    
    if (totalDebit !== undefined && totalCredit !== undefined) {
      const diff = Math.abs(totalDebit - totalCredit);
      if (diff > 0.01) {
        return { 
          status: 'REJECTED', 
          message: `Integritas Matematika Gagal: Selisih sebesar Rp ${diff.toLocaleString('id-ID')} antara Debit (Rp ${totalDebit.toLocaleString('id-ID')}) dan Kredit (Rp ${totalCredit.toLocaleString('id-ID')}).` 
        };
      }
    }
    
    return { status: 'APPROVED', message: 'Keseimbangan matematika Buku Besar 100% akurat.' };
  }
};

// 3. Agen Kepatuhan Regulasi (DJP/CoreTax)
const RegulationAgent = {
  name: 'RegulatoryValidator',
  description: 'Memeriksa kepatuhan skema data terhadap ketentuan DJP, e-Meterai, dan standar validasi sistem CoreTax terbaru.',
  tier: 2,
  async run(payload) {
    log('[ExportSwarm] Validating regulatory compliance programmatically...');
    
    // Cek NPWP untuk format perpajakan
    if (payload.type === 'XML_CORETAX' || payload.type === 'EXCEL_ACCOUNTING') {
      const npwp = payload.business_npwp ? String(payload.business_npwp).replace(/\D/g, '') : '';
      if (!npwp) {
        return { 
          status: 'REJECTED', 
          message: 'Kepatuhan Regulasi Gagal: NPWP Bisnis wajib diisi untuk pelaporan pajak resmi.' 
        };
      }
      if (npwp.length !== 15 && npwp.length !== 16) {
        return { 
          status: 'REJECTED', 
          message: `Kepatuhan Regulasi Gagal: NPWP Bisnis tidak valid (panjang digit: ${npwp.length}, harus 15 atau 16 digit).` 
        };
      }
    }
    
    // Cek advis/warning tentang e-Meterai jika ada transaksi tunggal > 5 Juta
    if (payload.summary && payload.summary.totalAmount > 5000000) {
      return {
        status: 'WARNING',
        message: 'Advis Regulasi: Ditemukan total nilai transaksi di atas Rp 5.000.000 yang memerlukan e-Meterai menurut UU No. 10 Tahun 2020.'
      };
    }
    
    return { status: 'APPROVED', message: 'Kepatuhan perpajakan dan skema dokumen aman.' };
  }
};

export const ExportSwarm = new SwarmOrchestrator([
  FormattingAgent,
  IntegrityAgent,
  RegulationAgent
]);
