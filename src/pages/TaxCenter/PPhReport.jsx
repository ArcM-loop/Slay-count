import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
// 1. Import base44 diganti jadi GoogleGenerativeAI
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDate } from '@/lib/formatters';
import TaxSummaryCard from '@/components/tax/TaxSummaryCard';
import EbupotExportButton from '@/components/tax/EbupotExportButton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PPH_GROUPS = [
  { key: 'PPH_21', label: 'PPh 21', sub: 'Gaji & Upah', color: '#a855f7', colorClass: 'text-neon-purple' },
  { key: 'PPH_23_JASA', label: 'PPh 23 Jasa', sub: 'Imbalan jasa', color: '#00f3ff', colorClass: 'text-[#00f3ff]' },
  { key: 'PPH_23_DIVIDEN', label: 'PPh 23 Dividen', sub: 'Pembagian dividen', color: '#00f3ff', colorClass: 'text-[#00f3ff]' },
  { key: 'PPH_4_2_SEWA', label: 'PPh 4(2) Sewa', sub: 'Sewa bangunan (10%)', color: '#f59e0b', colorClass: 'text-warm-amber' },
  { key: 'PPH_4_2_KONSTRUKSI', label: 'PPh 4(2) Konstruksi', sub: 'Jasa konstruksi (2%)', color: '#f59e0b', colorClass: 'text-warm-amber' },
];

export default function PPhReport() {
  const { activeBusiness } = useBusiness();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', activeBusiness?.id],
    // 2. base44 diganti jadi GoogleGenerativeAI di sini
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id }, '-date', 500),
    enabled: !!activeBusiness,
  });

  const pphData = useMemo(() => {
    const monthTx = transactions.filter(t =>
      t.status === 'Final' &&
      t.date?.startsWith(selectedMonth) &&
      ['PPH_21', 'PPH_23_JASA', 'PPH_23_DIVIDEN', 'PPH_4_2_SEWA', 'PPH_4_2_KONSTRUKSI'].includes(t.tax_type)
    );

    const byGroup = {};
    PPH_GROUPS.forEach(g => {
      byGroup[g.key] = monthTx.filter(t => t.tax_type === g.key);
    });

    const total21 = byGroup.PPH_21.reduce((s, t) => s + (t.tax_amount || 0), 0);
    const total23 = [...byGroup.PPH_23_JASA, ...byGroup.PPH_23_DIVIDEN].reduce((s, t) => s + (t.tax_amount || 0), 0);
    const total42 = [...byGroup.PPH_4_2_SEWA, ...byGroup.PPH_4_2_KONSTRUKSI].reduce((s, t) => s + (t.tax_amount || 0), 0);
    const totalAll = total21 + total23 + total42;

    return { byGroup, total21, total23, total42, totalAll, allPPh: monthTx };
  }, [transactions, selectedMonth]);

  if (!activeBusiness) return null;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Link to="/tax" className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Rekap PPh Pot/Put 📋</h1>
          <p className="text-xs text-muted-foreground mt-0.5">PPh 21, PPh 23, dan PPh 4 Ayat 2</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-sm text-foreground"
          />
          <EbupotExportButton
            data={pphData.allPPh}
            filename={`eBupot_PPh_${selectedMonth}_${activeBusiness?.name}.csv`}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TaxSummaryCard label="PPh 21 Dipotong" amount={pphData.total21} sub="Potongan gaji" color="purple" delay={0.1} />
        <TaxSummaryCard label="PPh 23 Dipotong" amount={pphData.total23} sub="Jasa & dividen" color="cyan" delay={0.15} />
        <TaxSummaryCard label="PPh 4(2) Dipotong" amount={pphData.total42} sub="Sewa & konstruksi" color="lime" delay={0.2} />
        <TaxSummaryCard label="Total PPh Terpotong" amount={pphData.totalAll} sub="Semua jenis PPh" color="red" delay={0.25} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {PPH_GROUPS.map((group, gi) => {
            const txList = pphData.byGroup[group.key] || [];
            if (txList.length === 0) return null;
            const total = txList.reduce((s, t) => s + (t.tax_amount || 0), 0);

            return (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + gi * 0.05 }}
                className="bento-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className={`font-semibold ${group.colorClass}`}>{group.label}</h3>
                    <p className="text-xs text-muted-foreground">{group.sub}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${group.colorClass}`}>{formatRupiah(total)}</p>
                    <p className="text-xs text-muted-foreground">{txList.length} transaksi</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {txList.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/40 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{tx.merchant_name || tx.description || 'Tanpa keterangan'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)} · DPP: {formatRupiah(tx.amount)}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className={`font-bold text-sm ${group.colorClass}`}>{formatRupiah(tx.tax_amount || 0)}</p>
                        <p className="text-xs text-muted-foreground">dipotong</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {pphData.allPPh.length === 0 && (
            <div className="text-center py-16 bento-card">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-muted-foreground">Belum ada transaksi PPh bulan {selectedMonth}</p>
              <p className="text-xs text-muted-foreground mt-1">Tambahkan transaksi dengan jenis pajak PPh pada form transaksi</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}