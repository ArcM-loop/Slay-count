/**
 * DigitalVATBadge.jsx
 * Badge ringkas yang ditampilkan di form transaksi saat vendor teridentifikasi
 * sebagai layanan digital asing — memberi tahu pengguna perlakuan PPN yang benar.
 */

import { DJP_PMSE_VENDORS } from '@/lib/swarm/agents/digitalVATAgent';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Globe } from 'lucide-react';

/**
 * @param {string} merchantName - Nama vendor/merchant dari form input
 * @param {boolean} isForeignResident - Apakah transaksi dengan vendor asing
 */
export default function DigitalVATBadge({ merchantName = '', isForeignResident = false }) {
  if (!merchantName && !isForeignResident) return null;

  const nameLower = merchantName.toLowerCase();

  // Lookup vendor di database PMSE
  let vendorInfo = null;
  for (const [key, info] of Object.entries(DJP_PMSE_VENDORS)) {
    if (nameLower.includes(key)) {
      vendorInfo = info;
      break;
    }
  }

  // Bukan transaksi asing / tidak dikenal → tidak tampil
  if (!vendorInfo && !isForeignResident) return null;

  // PMSE: PPN sudah dipungut vendor
  if (vendorInfo?.isPMSE) {
    return (
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-emerald-400">
            PMSE Resmi DJP — PPN dipungut oleh vendor
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {vendorInfo.name} memungut PPN 11%. Catat DPP dan PPN Masukan secara terpisah. PKP bisa kreditkan.
          </p>
        </div>
      </div>
    );
  }

  // Self-Assessed: Harus setor sendiri
  if (vendorInfo?.selfAssessed || isForeignResident) {
    return (
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-amber-400">
            Self-Assessed VAT — Wajib setor sendiri ke DJP
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Vendor ini TIDAK ditunjuk DJP sebagai pemungut PMSE. Setor PPN 11% via kode billing{' '}
            <span className="font-mono text-amber-300">KAP 411211 / KJS 507</span> paling lambat tgl 15 bulan depan.
          </p>
        </div>
      </div>
    );
  }

  // Vendor asing tidak dikenal
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
      <Globe className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] font-bold text-sky-400">Vendor Asing Terdeteksi</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Cek apakah vendor ini termasuk PMSE DJP. Jika tidak, Anda wajib self-assessed PPN 11%.
        </p>
      </div>
    </div>
  );
}
