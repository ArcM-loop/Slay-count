import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { formatNPWP, validateNPWP16 } from '@/lib/formatters';
import { Loader2, Download, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { generateCoreTaxXML, downloadCoreTaxXML } from '@/lib/coreTaxEngine';

export default function PPNReport() {
  const { activeBusiness } = useBusiness();
  const [exporting, setExporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [filter, setFilter] = useState('Semua'); // 'Semua', 'Masukan', 'Keluaran'
  const [exportFormat, setExportFormat] = useState('CSV'); // 'CSV' or 'XML'
  const businessNpwp = activeBusiness?.npwp || '';

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions-efaktur', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness,
  });

  // Memfilter transaksi yang ditandai sebagai e-Faktur atau memiliki nilai PPN.
  // Ini menjadi dasar data yang akan diekspor ke aplikasi DJP.
  const efakturList = useMemo(() => {
    return transactions
      .filter(t => {
        const isPPN = t.ppn > 0 || t.tax_type === 'PPN_OUT' || t.tax_type === 'PPN_IN';
        if (!isPPN) return false;
        if (filter === 'Keluaran') return t.type === 'Pemasukan' || t.tax_type === 'PPN_OUT';
        if (filter === 'Masukan') return t.type === 'Pengeluaran' || t.tax_type === 'PPN_IN';
        return true;
      })
      .map(t => {
        // Gunakan field eksplisit jika ada, jika tidak gunakan kalkulasi legacy
        const ppn = t.ppn ? parseFloat(t.ppn) : Math.round(Math.abs(t.amount) * 0.11);
        const dpp = t.dpp ? parseFloat(t.dpp) : Math.round(Math.abs(t.amount));
        
        return {
          ...t,
          dpp,
          ppn,
          isInvalid: !validateNPWP16(t.npwp || businessNpwp),
        };
      });
  }, [transactions, filter, businessNpwp]);

  /**
   * Memvalidasi kelengkapan data sebelum ekspor dilakukan.
   * Aplikasi e-Faktur DJP sangat ketat terhadap format NPWP dan Nomor Faktur.
   */
  const validatePreExport = () => {
    const errors = {};
    let isValid = true;

    efakturList.forEach(tx => {
      const txErrors = [];

      // Validasi NPWP (Wajib 16 digit untuk CoreTax)
      const npwp = (tx.npwp_lawan || '').replace(/\D/g, '');
      if (!validateNPWP16(npwp)) {
        txErrors.push('NPWP Harus 16 Digit (Standar CoreTax/NIK)');
      }

      // Validasi Nomor Faktur (13 digit format standard e-Faktur)
      const noFaktur = (tx.nomor_faktur || '').replace(/\D/g, '');
      if (noFaktur.length !== 13 && noFaktur.length !== 16) {
        txErrors.push('Nomor Faktur tidak lengkap');
      }

      // Validasi Nilai Pajak
      if (!tx.dpp || tx.dpp <= 0) txErrors.push('DPP tidak boleh 0');
      if (!tx.ppn || tx.ppn <= 0) txErrors.push('PPN tidak boleh 0');

      if (txErrors.length > 0) {
        errors[tx.id] = txErrors;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  /**
   * Menghasilkan file CSV dengan skema impor "FM" (Faktur Masukan) DJP.
   * Format ini dirancang khusus untuk diunggah ke aplikasi e-Faktur Desktop.
   */
  const handleExportCSV = () => {
    if (!validatePreExport()) return; // Hentikan jika ada data tidak valid

    setExporting(true);

    try {
      // Skema import e-Faktur DJP (Faktur Masukan)
      const fmHeaders = [
        "FM", "KD_JENIS_TRANSAKSI", "FG_PENGGANTI", "NOMOR_FAKTUR",
        "MASA_PAJAK", "TAHUN_PAJAK", "TANGGAL_FAKTUR", "NPWP",
        "NAMA", "LENGKAP_ALAMAT", "JUMLAH_DPP", "JUMLAH_PPN",
        "JUMLAH_PPNBM", "IS_CREDITABLE"
      ];

      const csvData = [fmHeaders];

      efakturList.forEach(tx => {
        if (tx.type === 'Pemasukan') return; // FM hanya untuk transaksi pembelian (Pengeluaran)

        const dateObj = new Date(tx.date);
        const masaPajak = String(dateObj.getMonth() + 1).padStart(2, '0');
        const tahunPajak = dateObj.getFullYear();
        const tanggalFaktur = `${String(dateObj.getDate()).padStart(2, '0')}/${masaPajak}/${tahunPajak}`;

        // Membersihkan dan memformat nomor faktur sesuai standar e-Faktur (XXX.XXX-XX.XXXXXXXX)
        const rawNoFaktur = (tx.nomor_faktur || '').replace(/\D/g, '');
        const formattedNoFaktur = rawNoFaktur.length >= 13
          ? `${rawNoFaktur.substring(0, 3)}.${rawNoFaktur.substring(3, 6)}-${rawNoFaktur.substring(6)}`
          : tx.nomor_faktur;

        const row = [
          "FM",
          "01", // Default: Kepada Bukan Pemungut PPN
          "0",  // Default: Faktur Normal
          formattedNoFaktur,
          masaPajak,
          tahunPajak,
          tanggalFaktur,
          (tx.npwp_lawan || '').replace(/\D/g, ''),
          tx.merchant_name || 'Vendor',
          "DKI JAKARTA", // Alamat default
          Math.floor(tx.dpp),
          Math.floor(tx.ppn),
          "0", // PPNBM
          "1"  // Dapat dikreditkan
        ];
        csvData.push(row);
      });

      // Mengonversi data ke CSV dan memicu download otomatis di browser
      const csv = Papa.unparse(csvData, { quotes: false });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Import_eFaktur_FM_${activeBusiness.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } finally {
      setExporting(false);
    }
  };

  /**
   * Menghasilkan file XML sesuai standar CoreTax DJP (SIAP).
   * Mendukung NPWP 16 digit dan NITKU.
   */
  const handleExportXML = () => {
    if (!validatePreExport()) return;

    setExporting(true);
    try {
      // Kita asumsikan ekspor batch (banyak faktur dalam satu XML jika didukung portal, 
      // atau per file. Untuk demo, kita buat per transaksi atau struktur batch sederhana)
      
      efakturList.forEach((tx, idx) => {
        // Data Bisnis (Owner)
        const businessProfile = {
          npwp16: (activeBusiness?.npwp || '').replace(/\D/g, '').padEnd(16, '0'),
          nitku: activeBusiness?.nitku || '000000',
          name: activeBusiness?.name || 'My Business',
          address: activeBusiness?.address || 'Alamat Perusahaan'
        };

        // Data Transaksi
        const coreTaxData = {
          header: {
            kodeFaktur: tx.type === 'Pemasukan' ? '010' : '010', // Default normal
            nomorFaktur: (tx.nomor_faktur || '').replace(/\D/g, ''),
            tanggalFaktur: new Date(tx.date).toISOString().split('T')[0],
            masaPajak: String(new Date(tx.date).getMonth() + 1).padStart(2, '0'),
            tahunPajak: new Date(tx.date).getFullYear()
          },
          buyer: {
            npwp16: (tx.npwp_lawan || '').replace(/\D/g, '').padEnd(16, '0'),
            nitku: '000000', // Default NITKU pusat
            name: tx.merchant_name || 'Pelanggan/Vendor',
            address: "DKI JAKARTA"
          },
          items: [
            {
              name: tx.description || 'Penyerahan BKP/JKP',
              price: tx.dpp,
              quantity: 1
            }
          ]
        };

        const xml = generateCoreTaxXML(coreTaxData, businessProfile);
        downloadCoreTaxXML(xml, `CoreTax_Faktur_${idx}_${tx.merchant_name.replace(/\s+/g, '_')}`);
      });

      toast.success("XML CoreTax berhasil diunduh!");
    } catch (e) {
      console.error('CoreTax Export Error:', e);
    } finally {
      setExporting(false);
    }
  };

  if (!activeBusiness) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu ya 🏢</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">Pusat PPN & e-Faktur <FileSpreadsheet className="w-6 h-6 text-primary" /></h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola Pajak Pertambahan Nilai (Masukan) dan export ke aplikasi DJP.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-secondary rounded-lg p-1 border border-border">
            {['CSV', 'XML'].map(fmt => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${exportFormat === fmt ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {fmt === 'CSV' ? '📄 CSV' : '⚡ XML'}
              </button>
            ))}
          </div>
          <Button 
            onClick={exportFormat === 'CSV' ? handleExportCSV : handleExportXML} 
            disabled={exporting || efakturList.length === 0} 
            className="bg-primary text-primary-foreground gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export {exportFormat}
          </Button>
        </div>
      </motion.div>

      <div className="flex gap-2 mb-2">
        {['Semua', 'Masukan', 'Keluaran'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${filter === f ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
            {f === 'Masukan' ? '📥 Faktur Masukan' : f === 'Keluaran' ? '📤 Faktur Keluaran' : '📊 Semua Faktur'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Faktur Pajak</p>
          <p className="text-2xl font-bold">{efakturList.length} <span className="text-sm font-normal text-muted-foreground">dokumen</span></p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total DPP (Dasar Pengenaan Pajak)</p>
          <p className="text-2xl font-bold text-foreground">{formatRupiah(efakturList.reduce((s, t) => s + (t.dpp || 0), 0))}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total PPN Masukan (Dapat Dikreditkan)</p>
          <p className="text-2xl font-bold text-cyber-lime">{formatRupiah(efakturList.reduce((s, t) => s + (t.ppn || 0), 0))}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : efakturList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-muted-foreground">Belum ada data Faktur Pajak.</p>
            <p className="text-xs text-muted-foreground mt-1">Scan QR e-Faktur di menu Transaksi untuk mulai mengisi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary text-muted-foreground text-xs uppercase font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">No. Faktur</th>
                  <th className="px-4 py-3">Lawan Transaksi</th>
                  <th className="px-4 py-3">NPWP</th>
                  <th className="px-4 py-3 text-right">DPP</th>
                  <th className="px-4 py-3 text-right">PPN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {efakturList.map((tx) => {
                  const hasErrors = validationErrors[tx.id] && validationErrors[tx.id].length > 0;
                  return (
                    <tr key={tx.id} className={`hover:bg-secondary/50 transition-colors ${hasErrors ? 'bg-destructive/5' : ''}`}>
                      <td className="px-4 py-3">
                        {hasErrors ? (
                          <div className="flex items-center gap-1.5 text-destructive font-medium" title={validationErrors[tx.id].join(', ')}>
                            <AlertTriangle className="w-4 h-4" /> Error
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-cyber-lime font-medium">
                            <CheckCircle className="w-4 h-4" /> Valid
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 font-mono">{tx.nomor_faktur || '-'}</td>
                      <td className="px-4 py-3 font-medium truncate max-w-[150px]" title={tx.merchant_name}>{tx.merchant_name}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${tx.npwp_lawan && !validateNPWP16(tx.npwp_lawan) ? 'text-destructive font-bold' : ''}`}>
                        {formatNPWP(tx.npwp_lawan)}
                      </td>
                      <td className="px-4 py-3 text-right">{formatRupiah(tx.dpp || 0)}</td>
                      <td className="px-4 py-3 text-right text-cyber-lime font-semibold">{formatRupiah(tx.ppn || 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validation Errors List (if any) */}
      <AnimatePresence>
        {Object.keys(validationErrors).length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
            <div className="flex items-center gap-2 text-destructive font-bold mb-2">
              <AlertTriangle className="w-5 h-5" />
              Export Dibatalkan! Terdapat {Object.keys(validationErrors).length} Faktur Tidak Valid:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-destructive/80">
              {Object.entries(validationErrors).map(([id, errors]) => {
                const tx = efakturList.find(t => t.id === id);
                return (
                  <li key={id}>
                    <strong>{tx?.merchant_name} ({tx?.nomor_faktur || 'Tanpa No. Faktur'}):</strong> {errors.join(', ')}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              * SlayCount kini mengikuti standar **CoreTax DJP**. Seluruh identitas wajib pajak (NPWP) wajib menggunakan 16 digit (NIK atau NPWP format baru).
            </p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
