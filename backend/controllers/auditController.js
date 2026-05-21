import admin from '../lib/firebaseAdmin.js';
import { runDeterministicValidation } from '../lib/ruleEngine.js';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

/**
 * Gate 1: Deterministic Pre-Filter
 */
export async function preFilter(req, res) {
  try {
    const { tx, debitEntries = [], creditEntries = [] } = req.body;

    if (!tx) {
      return res.status(400).json({ success: false, error: 'Data transaksi (tx) wajib disertakan.' });
    }

    // 1. Jalankan Rule Engine Deterministik (Debit/Kredit balance, metadata check)
    const ruleResult = runDeterministicValidation({ tx, debitEntries, creditEntries });

    // 2. Cek Duplikat di Database (Firestore)
    let isDuplicate = false;
    let duplicateTxDetails = null;

    if (admin.apps.length && tx.business_id) {
      const db = admin.firestore();
      const duplicateQuery = await db.collection('transactions')
        .where('business_id', '==', tx.business_id)
        .where('amount', '==', Number(tx.amount || 0))
        .where('date', '==', tx.date)
        .get();

      // Cek apakah ada kecocokan selain dirinya sendiri (jika update)
      const matches = duplicateQuery.docs.filter(doc => doc.id !== tx.id && doc.data().status !== 'Deleted');
      if (matches.length > 0) {
        isDuplicate = true;
        duplicateTxDetails = matches.map(d => ({ id: d.id, ...d.data() }));
      }
    }

    // 3. Kalkulasi Dasar Pajak Lokal
    const taxCheck = {
      warnings: [],
      info: []
    };

    // Deteksi Pajak Restoran/Pembangunan Daerah (PB1) vs PPN
    // Di Indonesia, makanan/minuman restoran biasanya kena PB1 10%, bukan PPN 11%
    const isRestaurantOrFood = tx.description?.toLowerCase().includes('makan') || 
                               tx.description?.toLowerCase().includes('resto') ||
                               tx.merchant_name?.toLowerCase().includes('cafe') || 
                               tx.merchant_name?.toLowerCase().includes('restoran');
    
    const hasPPN = debitEntries.some(e => e.account_name?.toLowerCase().includes('ppn') || e.description?.toLowerCase().includes('ppn')) ||
                    creditEntries.some(e => e.account_name?.toLowerCase().includes('ppn') || e.description?.toLowerCase().includes('ppn'));

    if (isRestaurantOrFood && hasPPN) {
      taxCheck.warnings.push('Potensi kesalahan pemetaan: Transaksi Restoran/Makanan seharusnya menggunakan pajak PB1 (10%), bukan PPN (11%).');
    }

    // Check PPN 11% rate compliance
    const ppnEntry = [...debitEntries, ...creditEntries].find(e => e.account_name?.toLowerCase().includes('ppn masukan') || e.account_name?.toLowerCase().includes('ppn keluaran'));
    if (ppnEntry) {
      const ppnAmount = ppnEntry.debit || ppnEntry.credit || 0;
      const baseAmount = tx.amount - ppnAmount;
      const calculatedPpn = Math.round(baseAmount * 0.11);
      const diff = Math.abs(ppnAmount - calculatedPpn);
      if (diff > 100) {
        taxCheck.warnings.push(`Kalkulasi PPN Masukan/Keluaran tidak sesuai tarif 11%. Terdeteksi Rp ${ppnAmount.toLocaleString('id-ID')} (seharusnya Rp ${calculatedPpn.toLocaleString('id-ID')}).`);
      }
    }

    // 4. Rancang format data anomali jika terdeteksi ketidaksesuaian
    const hasIssues = !ruleResult.isValid || isDuplicate || taxCheck.warnings.length > 0;
    const anomalies = [];

    if (!ruleResult.isValid) {
      anomalies.push(...ruleResult.errors);
    }
    if (isDuplicate) {
      anomalies.push(`[DUPLICATE_DETECTED] Transaksi serupa terdeteksi di database dengan ID: ${duplicateTxDetails.map(d => d.id).join(', ')}.`);
    }
    if (taxCheck.warnings.length > 0) {
      anomalies.push(...taxCheck.warnings);
    }

    return res.json({
      success: true,
      isValid: !hasIssues,
      ruleResult,
      isDuplicate,
      duplicateTxDetails,
      taxCheck,
      anomalies
    });

  } catch (error) {
    console.error('[AuditController] Pre-filter error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

/**
 * Gate 3: KKA PDF Generator (PwC/EY standard)
 */
export async function generateKKA(req, res) {
  try {
    const { tx, debitEntries = [], creditEntries = [], swarmResult = {}, taxCitations = [] } = req.body;

    if (!tx) {
      return res.status(400).json({ success: false, error: 'Data transaksi wajib disertakan untuk generate KKA.' });
    }

    // Buat document PDF baru
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Stream ke response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=KKA_${tx.id || 'Draft'}.pdf`);
    doc.pipe(res);

    // KOP SURAT (Big Four / Madam Herta Auditing Division 🛡️)
    doc.fillColor('#1e293b').rect(0, 0, 595.28, 120).fill(); // Navy background for header

    doc.fillColor('#00f3ff').fontSize(24).font('Helvetica-Bold').text('SLAYCOUNT SWARM AUDITORS', 50, 35);
    doc.fillColor('#e2e8f0').fontSize(10).font('Helvetica').text('MADAM HERTA AUDITING DIVISION • MULTI-AGENT LEDGER SIMULATION', 50, 65);
    doc.fillColor('#94a3b8').fontSize(8).text('STRICT CONFORMITY PROTOCOL • AUTO-GENERATED WORKING PAPER (KKA)', 50, 80);

    // ID KERTAS KERJA (Top Right)
    const kkaId = `KKA-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${(tx.id || 'DRAFT').slice(0,6).toUpperCase()}`;
    doc.fillColor('#00f3ff').fontSize(12).font('Helvetica-Bold').text(kkaId, 420, 35, { align: 'right', width: 125 });
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`Issued: ${new Date().toLocaleString('id-ID')}`, 420, 55, { align: 'right', width: 125 });
    doc.text(`Status: ${swarmResult.isFinal ? 'PASSED' : 'FLAGGED'}`, 420, 70, { align: 'right', width: 125 });

    // Jarak dari header
    doc.y = 150;

    // DETAIL TRANSAKSI
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('1. Detail Transaksi (Audit Object)', 50, doc.y);
    doc.moveDown(0.5);

    const details = [
      ['Merchant/Vendor', tx.merchant_name || tx.vendor_name || 'N/A'],
      ['Tanggal', tx.date || 'N/A'],
      ['Jumlah Transaksi', `Rp ${(tx.amount || 0).toLocaleString('id-ID')}`],
      ['Deskripsi', tx.description || 'N/A'],
      ['Metode/Tipe', tx.type || 'N/A'],
      ['Kategori Pajak', tx.category || 'Umum']
    ];

    let currentY = doc.y;
    details.forEach(([label, val]) => {
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text(label, 60, currentY);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica').text(`:  ${val}`, 180, currentY);
      currentY += 15;
    });

    doc.y = currentY + 15;

    // DOUBLE-ENTRY VERIFICATION
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('2. Verifikasi Pembukuan Jurnal (Double-Entry)', 50, doc.y);
    doc.moveDown(0.5);

    // Tabel Jurnal
    const tableTop = doc.y;
    doc.fillColor('#f8fafc').rect(50, tableTop, 495.28, 20).fill();
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
    doc.text('Akun', 60, tableTop + 5);
    doc.text('Tipe', 300, tableTop + 5);
    doc.text('Debit (Rp)', 380, tableTop + 5, { align: 'right', width: 70 });
    doc.text('Kredit (Rp)', 465, tableTop + 5, { align: 'right', width: 70 });

    let rowY = tableTop + 20;
    doc.font('Helvetica').fontSize(9).fillColor('#0f172a');

    const hasPPN = debitEntries.some(e => e.account_name?.toLowerCase().includes('ppn') || e.description?.toLowerCase().includes('ppn')) ||
                    creditEntries.some(e => e.account_name?.toLowerCase().includes('ppn') || e.description?.toLowerCase().includes('ppn'));

    const allEntries = [
      ...debitEntries.map(e => ({ ...e, type: 'DEBIT' })),
      ...creditEntries.map(e => ({ ...e, type: 'CREDIT' }))
    ];

    allEntries.forEach(entry => {
      doc.fillColor('#f8fafc').rect(50, rowY, 495.28, 18).fill();
      doc.fillColor('#0f172a');
      doc.text(entry.account_name || entry.account_id || 'N/A', 60, rowY + 4);
      doc.text(entry.type, 300, rowY + 4);
      
      const debitValue = entry.debit || 0;
      const creditValue = entry.credit || 0;
      
      const debitText = debitValue ? debitValue.toLocaleString('id-ID') : '0';
      const creditText = creditValue ? creditValue.toLocaleString('id-ID') : '0';
      
      doc.text(debitText, 380, rowY + 4, { align: 'right', width: 70 });
      doc.text(creditText, 465, rowY + 4, { align: 'right', width: 70 });
      rowY += 18;
    });

    doc.y = rowY + 20;

    // SWARM AI CONSENSUS RESULTS
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('3. Temuan Swarm AI (101 Auditor)', 50, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#0f172a').text(`Tingkat Keyakinan Konsensus: `).font('Helvetica-Bold').text(`${swarmResult.confidenceScore || 0}%`, 180, doc.y - 12);
    doc.font('Helvetica').fillColor('#0f172a');

    const findings = swarmResult.findings || [];
    const objections = swarmResult.objections || [];

    if (objections.length > 0) {
      doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(9).text('🚨 Keberatan & Anomali Terdeteksi:', 50, doc.y);
      doc.font('Helvetica').fontSize(9);
      objections.forEach(obj => {
        doc.text(`- ${obj}`, 60, doc.y);
      });
      doc.moveDown(1);
    } else {
      doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(9).text('✅ Semua Agen Menyetujui (No Objections)', 50, doc.y);
      doc.moveDown(1);
    }

    if (findings.length > 0) {
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('Catatan Temuan Individu Agen:', 50, doc.y);
      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      findings.slice(0, 8).forEach(find => { // Limit 8 findings to prevent page overflow
        doc.text(`• ${find}`, 60, doc.y);
      });
      if (findings.length > 8) {
        doc.text(`• ...dan ${findings.length - 8} temuan lainnya tercatat dalam Audit Trail.`, 60, doc.y);
      }
      doc.moveDown(1);
    }

    // TAX REGULATION CITATIONS
    doc.y = doc.y + 10;
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('4. Analisis & Kutipan Regulasi Pajak', 50, doc.y);
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    if (taxCitations.length > 0) {
      taxCitations.forEach(citation => {
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(citation.law || 'Undang-Undang Pajak', 50, doc.y);
        doc.font('Helvetica').fillColor('#334155').text(citation.description || '', 60, doc.y);
        doc.moveDown(0.5);
      });
    } else {
      // Default citations based on transaction properties
      if (hasPPN) {
        doc.font('Helvetica-Bold').fillColor('#0f172a').text('UU HPP No. 7 Tahun 2021 — Pajak Pertambahan Nilai (PPN)', 50, doc.y);
        doc.font('Helvetica').fillColor('#334155').text('Mulai 1 April 2022, tarif PPN yang berlaku di Indonesia disesuaikan menjadi 11%. Faktur pajak masukan wajib dicocokkan dengan SPT PPN.', 60, doc.y);
        doc.moveDown(0.5);
      }
      if (tx.isForeignResident) {
        doc.font('Helvetica-Bold').fillColor('#0f172a').text('UU PPh Pasal 26 — Pajak Internasional', 50, doc.y);
        doc.font('Helvetica').fillColor('#334155').text('Transaksi jasa atau pembayaran ke wajib pajak luar negeri wajib dikenakan pemotongan PPh Pasal 26 sebesar 20%, kecuali ada Tax Treaty (P3B) yang berlaku.', 60, doc.y);
        doc.moveDown(0.5);
      }
      doc.font('Helvetica-Bold').fillColor('#0f172a').text('UU Ketentuan Umum dan Tata Cara Perpajakan (KUP)', 50, doc.y);
      doc.font('Helvetica').fillColor('#334155').text('Setiap entri jurnal akuntansi wajib didukung dengan bukti transaksi (nota/faktur) yang sah dan disimpan minimal 10 tahun untuk kebutuhan pemeriksaan pajak.', 60, doc.y);
    }

    doc.moveDown(1);

    // CRYPTOGRAPHIC SHA-256 SIGNATURE FOR IMMUTABILITY
    const rawContentForHash = JSON.stringify({ tx, debitEntries, creditEntries, swarmResult });
    const hash = crypto.createHash('sha256').update(rawContentForHash).digest('hex');

    doc.y = 720; // Force to bottom of page
    doc.fillColor('#e2e8f0').rect(50, doc.y, 495.28, 40).fill();
    
    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('🔒 CRYPTOGRAPHIC IMMUTABILITY HASH SIGNATURE (SHA-256)', 60, doc.y + 8);
    doc.fillColor('#475569').fontSize(7).font('Courier-Bold').text(hash, 60, doc.y + 20);

    // Selesai menulis PDF
    doc.end();

  } catch (error) {
    console.error('[AuditController] PDF generation error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
