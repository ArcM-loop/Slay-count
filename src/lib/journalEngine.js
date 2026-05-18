/**
 * SLAYCOUNT JOURNAL ENGINE (FRONTEND SWARM)
 * ========================================
 * Total Active Agents: 76
 */

import { SwarmOrchestrator } from './swarm/orchestrator';
import { db, auth } from '../API/GoogleGenerativeAI';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';

// 1. CORE & ROOT AGENTS
import { LedgerAgent } from './swarm/agents/ledgerAgent';
import { TaxComplianceAgent } from './swarm/agents/taxComplianceAgent';
import { InventoryAgent } from './swarm/agents/inventoryAgent';
import { RegulatoryScoutAgent } from './swarm/agents/regulatoryScout';
import { TaxExpertAgent } from './swarm/agents/taxExpertAgent';
import { RegionalTaxAgent } from './swarm/agents/regionalTaxAgent';
import { TreatyMasterAgent } from './swarm/agents/treatyMasterAgent';
import { AssetImpairmentAgent } from './swarm/agents/assetImpairmentAgent';
import { DigitalVATAgent } from './swarm/agents/digitalVATAgent';
import { BankMatchAgent } from './swarm/agents/bankMatchAgent';
import { CoreTaxAgent } from './swarm/agents/CoreTaxAgent';
import { BiyoPersonaAgent } from './swarm/agents/biyoPersonaAgent';
import { BenfordAuditAgent } from './swarm/agents/benfordAuditAgent';

import { 
  ForexRevaluationAgent, 
  PeriodLockAgent, 
  DuplicateDetectorAgent, 
  PPh21TERAgent, 
  PriorPeriodAgent, 
  CashSafetyAgent 
} from './swarm/agents/extraFinancialAgents';

// 2. TAX DIVISION
import { 
  PPh21EmployeeAgent, 
  PPh21NonEmployeeAgent, 
  PPh22ImportAgent, 
  PPh23ServiceAgent 
} from './swarm/agents/tax/pphGroup1';
import { 
  PPh25InstallmentAgent, 
  PPh26InternationalAgent, 
  PPh42FinalAgent, 
  PPh29CorporateCreditAgent 
} from './swarm/agents/tax/pphGroup2';
import { 
  PPNOutputAgent, 
  PPNInputAgent, 
  PPNWapuAgent, 
  PPNKmsAgent, 
  PPNExportAgent 
} from './swarm/agents/tax/ppnGroup';
import { 
  CoreTaxValidatorAgent, 
  MapSpecialistAgent, 
  CoreTaxApiGatewayAgent, 
  DigitalStampAgent 
} from './swarm/agents/tax/coreTaxGroup';
import { 
  FiscalReconAgent, 
  RiskScoutAgent, 
  AssetLaunderingAgent 
} from './swarm/agents/audit/forensicGroup';

// 4. GLOBAL & MULTI-STANDARD DIVISION
import { IFRSAgent } from './swarm/agents/global/ifrsAgent';

// 5. META DIVISION
import { ConsensusArbitrator } from './swarm/agents/meta/consensusArbitrator';

// 3. AUDIT & FORENSIC DIVISION
import { 
  VendorKickbackAgent, 
  GhostVendorAgent, 
  DuplicatePaymentAgent, 
  ProcurementCycleAgent 
} from './swarm/agents/audit/procurementGroup';
import { 
  SkimmingDetectorAgent, 
  LappingAuditorAgent, 
  AssetTheftScoutAgent, 
  RevenueRecognitionAgent 
} from './swarm/agents/audit/revenueGroup';
import { 
  BenfordStatAgent, 
  AnomalyPatternAgent, 
  UserBehaviorAgent, 
  OutlierDetectorAgent 
} from './swarm/agents/audit/statisticalGroup';

// 4. STRATEGIC CFO DIVISION
import { 
  RoIAnalyzerAgent, 
  EBIDTA_ScoutAgent, 
  GPM_SpecialistAgent, 
  OPEX_OptimizerAgent, 
  WorkingCapitalAgent, 
  UnitEconomicsAgent 
} from './swarm/agents/cfo/performanceGroup';
import { 
  BudgetGuardAgent, 
  VarianceForensicAgent, 
  ZeroBasedAuditorAgent, 
  RollingForecastAgent, 
  ScenarioBuilderAgent, 
  CapExPlannerAgent 
} from './swarm/agents/cfo/budgetGroup';
import { 
  MarketTrendAgent, 
  CompetitorPricingAgent, 
  IndustryBenchmarkAgent, 
  ProductLifeCycleAgent, 
  ExpansionScoutAgent,
  MnA_EvaluatorAgent
} from './swarm/agents/cfo/marketGroup';
import { 
  DividendPolicyAgent, 
  StrategicExitAgent,
  SolvencyWatchAgent,
  AltmanZScoreAgent,
  EnterpriseValueAgent,
  SensitivityAnalystAgent,
  ESG_ComplianceAgent
} from './swarm/agents/cfo/riskGroup';
import {
  RecessionSurvivorAgent,
  HypergrowthArchitectAgent,
  PriceWarStrategistAgent,
  SupplyChainDisruptorAgent,
  NewMarketScoutAgent,
  ProductPivotAnalystAgent
} from './swarm/agents/cfo/scenarioGroup';
import {
  CashOutProphetAgent,
  BurnRateWatchdogAgent,
  BadDebtDetectorAgent,
  TaxPenaltyGuardianAgent,
  FraudPatternPredictorAgent,
  SustainabilityAuditorAgent
} from './swarm/agents/cfo/guardianGroup';
import {
  RealTimeValuatorAgent,
  InvestorPitchSummarizerAgent,
  DividendOptimizerAgent,
  AcquisitionScoutAgent,
  ROIAcceleratorAgent
} from './swarm/agents/cfo/growthGroup';
import {
  InflationImpactScoutAgent,
  ForexRiskAuditorAgent,
  PolicyChangePredictorAgent,
  ConsumerTrendAnalystAgent,
  ExecutiveArbitratorCFOAgent
} from './swarm/agents/cfo/oracleGroup';

const swarm = new SwarmOrchestrator([
  // Core
  LedgerAgent, TaxComplianceAgent, InventoryAgent, RegulatoryScoutAgent,
  TaxExpertAgent, RegionalTaxAgent, TreatyMasterAgent, AssetImpairmentAgent,
  DigitalVATAgent, BankMatchAgent, BiyoPersonaAgent, BenfordAuditAgent, CoreTaxAgent,
  
  // Extra
  ForexRevaluationAgent, PeriodLockAgent, DuplicateDetectorAgent, 
  PPh21TERAgent, PriorPeriodAgent, CashSafetyAgent,

  // Tax
  PPh21EmployeeAgent, PPh21NonEmployeeAgent, PPh22ImportAgent, PPh23ServiceAgent,
  PPh25InstallmentAgent, PPh26InternationalAgent, PPh42FinalAgent, PPh29CorporateCreditAgent,
  PPNOutputAgent, PPNInputAgent, PPNWapuAgent, PPNKmsAgent, PPNExportAgent,
  CoreTaxValidatorAgent, MapSpecialistAgent, CoreTaxApiGatewayAgent, DigitalStampAgent,
  FiscalReconAgent, RiskScoutAgent,

  // Audit
  VendorKickbackAgent, GhostVendorAgent, DuplicatePaymentAgent, ProcurementCycleAgent,
  LappingAuditorAgent, SkimmingDetectorAgent, AssetTheftScoutAgent, RevenueRecognitionAgent,
  BenfordStatAgent, AnomalyPatternAgent, UserBehaviorAgent, OutlierDetectorAgent, AssetLaunderingAgent,

  // Global
  IFRSAgent,

  // Meta
  ConsensusArbitrator,

  // CFO
  RoIAnalyzerAgent, EBIDTA_ScoutAgent, GPM_SpecialistAgent, OPEX_OptimizerAgent,
  WorkingCapitalAgent, UnitEconomicsAgent, BudgetGuardAgent, VarianceForensicAgent,
  ZeroBasedAuditorAgent, RollingForecastAgent, ScenarioBuilderAgent, CapExPlannerAgent,
  MarketTrendAgent, CompetitorPricingAgent, IndustryBenchmarkAgent, ProductLifeCycleAgent,
  ExpansionScoutAgent, MnA_EvaluatorAgent, SolvencyWatchAgent, AltmanZScoreAgent,
  EnterpriseValueAgent, SensitivityAnalystAgent, ESG_ComplianceAgent, DividendPolicyAgent,
  StrategicExitAgent,
  
  // CFO Kelompok A (Scenario Planning)
  RecessionSurvivorAgent, HypergrowthArchitectAgent, PriceWarStrategistAgent,
  SupplyChainDisruptorAgent, NewMarketScoutAgent, ProductPivotAnalystAgent,
  
  // CFO Kelompok B (Guardian Health & Risk)
  CashOutProphetAgent, BurnRateWatchdogAgent, BadDebtDetectorAgent,
  TaxPenaltyGuardianAgent, FraudPatternPredictorAgent, SustainabilityAuditorAgent,
  
  // CFO Kelompok C (Growth Investment & Valuation)
  RealTimeValuatorAgent, InvestorPitchSummarizerAgent, DividendOptimizerAgent,
  AcquisitionScoutAgent, ROIAcceleratorAgent,
  
  // CFO Kelompok D (Oracle Macro & External)
  InflationImpactScoutAgent, ForexRiskAuditorAgent, PolicyChangePredictorAgent,
  ConsumerTrendAnalystAgent, ExecutiveArbitratorCFOAgent
]);

/**
 * Memproses validasi jurnal secara cerdas dengan Swarm Intelligence
 */
export async function validateJournalWithSwarm(journalEntry, context = {}) {
  console.log('[JournalEngine] Initiating Swarm Validation for 101 Agents...');
  
  // Beritahu UI bahwa Swarm mulai bekerja
  window.dispatchEvent(new CustomEvent('swarm:start', { detail: { journalEntry } }));

  try {
    // Kita tambahkan hook ke orchestrator untuk memantau progress agen secara real-time
    const onAgentActive = (agentName) => {
      window.dispatchEvent(new CustomEvent('swarm:agent_active', { detail: { agentName } }));
    };

    const result = await swarm.execute(journalEntry, { ...context, onAgentActive });
    
    // Beritahu UI bahwa Swarm selesai
    window.dispatchEvent(new CustomEvent('swarm:complete', { detail: { result } }));
    
    return result;
  } catch (error) {
    window.dispatchEvent(new CustomEvent('swarm:error', { detail: { error: error.message } }));
    console.error('[JournalEngine] Swarm execution failed:', error);
    return {
      isFinal: false,
      confidenceScore: 0,
      objections: [`System Error: ${error.message}`],
      findings: []
    };
  }
}

/**
 * Menciptakan entri jurnal (Debit & Kredit) secara ATOMIK (ACID)
 * @param {Object} tx - Objek transaksi yang divalidasi
 * @param {Array} accounts - Daftar seluruh akun
 * @param {string} paymentAccountId - ID akun kas/bank
 */
export async function createJournalEntries(tx, accounts, paymentAccountId) {
  console.log('[JournalEngine] Creating Atomic Journal Entries (ACID)...');
  
  const batch = writeBatch(db);
  const user = auth.currentUser;
  
  if (!user) throw new Error('User not authenticated for journaling');

  // 1. Persiapkan Referensi Dokumen
  const journalRef = collection(db, 'journal_entries');
  const txRef = doc(db, 'transactions', tx.id);
  
  const debitDocRef = doc(journalRef);
  const creditDocRef = doc(journalRef);

  const amount = parseFloat(tx.amount);
  const account = accounts.find(a => a.id === tx.account_id);
  const paymentAccount = accounts.find(a => a.id === paymentAccountId);

  // 2. Tentukan sisi Debit & Kredit berdasarkan tipe transaksi
  let debitEntry, creditEntry;

  if (tx.type === 'Pengeluaran') {
    // Beban (Dr) - Kas/Bank (Cr)
    debitEntry = {
      account_id: tx.account_id,
      account_name: account?.name || 'Unknown Expense',
      debit: amount,
      credit: 0
    };
    creditEntry = {
      account_id: paymentAccountId,
      account_name: paymentAccount?.name || 'Unknown Cash/Bank',
      debit: 0,
      credit: amount
    };
  } else {
    // Kas/Bank (Dr) - Pendapatan (Cr)
    debitEntry = {
      account_id: paymentAccountId,
      account_name: paymentAccount?.name || 'Unknown Cash/Bank',
      debit: amount,
      credit: 0
    };
    creditEntry = {
      account_id: tx.account_id,
      account_name: account?.name || 'Unknown Revenue',
      debit: 0,
      credit: amount
    };
  }

  const baseEntry = {
    transaction_id: tx.id,
    business_id: tx.business_id,
    user_id: user.uid,
    date: tx.date,
    description: tx.description || tx.merchant_name || 'Journal Entry',
    created_at: serverTimestamp()
  };

  // 3. Masukkan ke Batch (Atomicity)
  batch.set(debitDocRef, { ...baseEntry, ...debitEntry });
  batch.set(creditDocRef, { ...baseEntry, ...creditEntry });
  
  // 4. Update status transaksi asli (Consistency)
  batch.update(txRef, {
    status: 'Final',
    journal_id: tx.id,
    account_id: tx.account_id,
    account_name: account?.name || ''
  });

  // 5. EKSEKUSI ATOMIK (Commit)
  try {
    await batch.commit();
    console.log('[JournalEngine] Atomic Transaction Committed Successfully ✅');
    return true;
  } catch (error) {
    console.error('[JournalEngine] Atomic Transaction Failed ❌:', error);
    throw new Error(`Data Integrity Error: Gagal mencatat jurnal secara aman. Silakan coba lagi. (${error.message})`);
  }
}

/**
 * Menghapus semua entri jurnal yang terkait dengan sebuah transaksi (ATOMIK).
 * Digunakan saat transaksi diedit atau dibatalkan.
 * @param {string} transactionId - ID transaksi yang jurnalnya akan dihapus
 */
export async function deleteJournalEntries(transactionId) {
  if (!transactionId) return;

  const { query, where, getDocs, deleteDoc } = await import('firebase/firestore');
  const journalRef = collection(db, 'journal_entries');
  const q = query(journalRef, where('transaction_id', '==', transactionId));

  try {
    const snapshot = await getDocs(q);
    const deleteBatch = writeBatch(db);
    snapshot.forEach(docSnap => deleteBatch.delete(docSnap.ref));
    await deleteBatch.commit();
    console.log(`[JournalEngine] Deleted ${snapshot.size} journal entries for tx: ${transactionId} ✅`);
  } catch (error) {
    console.error('[JournalEngine] Failed to delete journal entries:', error);
    throw new Error(`Gagal menghapus jurnal: ${error.message}`);
  }
}

export default swarm;
