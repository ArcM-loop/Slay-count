/**
 * SlayCount — Tax Center Page
 * PPN Recap, PPh Recap, Fiscal Check, Deadline Tracker, Export CSV
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah } from '@/lib/formatters';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { calculateNetPPN, calculatePPhSummary, getTaxDeadlines, calculateCorporateTax, TAX_RULES } from '../../logic/tax/calculator.js';
import { calculateFiscalCorrection } from '../../logic/tax/fiscalRules.js';
import { exportTaxCSV } from '../../logic/tax/exportFormatter';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, Shield, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import PPNReport from './PPNReport.jsx';

const TABS = [
  { id: 'ppn', label: '📤 Rekap PPN' },
  { id: 'pph', label: '👨‍💼 Rekap PPh' },
  { id: 'fiscal', label: '🔍 Fiscal Check' },
  { id: 'estimate', label: '📊 Estimasi PPh Badan' },
];

export default function TaxCenterPage() {
  const { activeBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState('ppn');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id, status: 'Final' }),
    enabled: !!activeBusiness,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness,
  });

  const deadlines = getTaxDeadlines();

  const ppnData = useMemo(() => calculateNetPPN(transactions), [transactions]);
  const pphData = useMemo(() => calculatePPhSummary(transactions), [transactions]);
  const fiscalData = useMemo(() => calculateFiscalCorrection(transactions, accounts), [transactions, accounts]);

  const pnlSummary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    return { income, expense, profit: income - expense };
  }, [transactions]);

  const corporateTax = calculateCorporateTax(pnlSummary.profit, fiscalData.totalCorrection);

  return (
    <div className="tax-center">
      {/* Deadline Cards Row */}
      <div className="deadline-cards">
        {deadlines.map(d => (
          <motion.div
            key={d.id}
            className={`deadline-card glass-card ${d.isOverdue ? 'overdue' : d.daysLeft <= 5 ? 'urgent' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="dc-emoji">{d.emoji}</span>
            <div className="dc-info">
              <span className="dc-name">{d.name}</span>
              <span className={`dc-days ${d.isOverdue ? 'overdue-text' : d.daysLeft <= 5 ? 'urgent-text' : ''}`}>
                {d.isOverdue ? '⚠️ TERLAMBAT' : d.daysLeft <= 0 ? '🔥 HARI INI' : `${d.daysLeft} hari lagi`}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="report-tabs">
        {TABS.map(tab => (
          <button key={tab.id} className={`filter-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* PPN Tab */}
      {activeTab === 'ppn' && (
        <div className="mt-4">
           <PPNReport />
        </div>
      )}

      {/* PPh Tab */}
      {activeTab === 'pph' && (
        <motion.div className="tax-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {Object.keys(pphData).length > 0 ? (
            <div className="pph-grid">
              {Object.entries(pphData).map(([code, data]) => (
                <div key={code} className="pph-card glass-card">
                  <div className="pph-card-header">
                    <span>{data.emoji} {data.label}</span>
                    <span className="badge badge-pending">{data.count} transaksi</span>
                  </div>
                  <div className="pph-card-body">
                    <div className="pph-row">
                      <span>DPP (Dasar Pengenaan Pajak)</span>
                      <span>{formatRupiah(data.totalBase)}</span>
                    </div>
                    <div className="pph-row">
                      <span>Pajak Dipotong ({(data.rate * 100)}%)</span>
                      <span className="glow-cyan" style={{ color: '#00f3ff', fontWeight: 700 }}>{formatRupiah(data.totalTax)}</span>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportTaxCSV(transactions, accounts, code)}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state glass-card" style={{ padding: '48px' }}>
              <span className="empty-emoji">👨‍💼</span>
              <h4>Belum ada transaksi ber-PPh</h4>
              <p>Tandai pajak di akun atau transaksi untuk melihat rekap di sini</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Fiscal Check Tab */}
      {activeTab === 'fiscal' && (
        <motion.div className="tax-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="fiscal-summary glass-card">
            <div className="fiscal-header">
              <AlertTriangle size={20} color="#fb923c" />
              <h3>Koreksi Fiskal Positif</h3>
            </div>
            <p className="fiscal-desc">
              Beban-beban berikut <strong>tidak boleh dikurangkan</strong> dari penghasilan bruto menurut UU PPh.
              Total koreksi akan ditambahkan ke laba komersial untuk menghitung PKP.
            </p>
            <div className="fiscal-total">
              <span>Total Koreksi Fiskal:</span>
              <span className="glow-cyan" style={{ color: '#00f3ff', fontWeight: 800, fontSize: '1.5rem' }}>
                {formatRupiah(fiscalData.totalCorrection)}
              </span>
            </div>
          </div>

          {fiscalData.corrections.length > 0 ? (
            <div className="fiscal-table glass-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Akun</th>
                    <th>Nominal</th>
                    <th>Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {fiscalData.corrections.map((c, i) => (
                    <tr key={i}>
                      <td>{c.accountName}</td>
                      <td className="expense-value">{formatRupiah(c.amount)}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              ✅ Tidak ada koreksi fiskal yang terdeteksi
            </div>
          )}
        </motion.div>
      )}

      {/* Corporate Tax Estimate */}
      {activeTab === 'estimate' && (
        <motion.div className="tax-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="estimate-card glass-card">
            <h3>📊 Estimasi PPh Badan (22%)</h3>
            <div className="estimate-rows">
              <div className="estimate-row"><span>Laba Komersial</span><span>{formatRupiah(pnlSummary.profit)}</span></div>
              <div className="estimate-row"><span>(+) Koreksi Fiskal Positif</span><span className="expense-value">{formatRupiah(fiscalData.totalCorrection)}</span></div>
              <div className="estimate-row total"><span>Penghasilan Kena Pajak (PKP)</span><span>{formatRupiah(pnlSummary.profit + fiscalData.totalCorrection)}</span></div>
              <div className="estimate-row"><span>Tarif PPh Badan</span><span>22%</span></div>
              <div className="estimate-row highlight">
                <span>💰 Estimasi PPh Badan Terutang</span>
                <span className="glow-cyan" style={{ color: '#00f3ff', fontWeight: 800, fontSize: '1.5rem' }}>
                  {formatRupiah(corporateTax)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
