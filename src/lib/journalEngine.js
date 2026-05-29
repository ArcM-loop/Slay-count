/**
 * SLAYCOUNT JOURNAL ENGINE (FRONTEND SWARM)
 * ========================================
 * Total Active Agents: 76
 */

import { SwarmOrchestrator } from './swarm/orchestrator';
import { db, auth } from '../API/GoogleGenerativeAI';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { commitJournalToServer } from './secureApiClient';

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
  console.log('[JournalEngine] Delegating Journal Creation to secure Backend API...');

  const account = accounts.find(a => a.id === tx.account_id);
  const paymentAccount = accounts.find(a => a.id === paymentAccountId);

  const dpp = parseFloat(tx.dpp || tx.amount || 0);
  const ppnAmount = parseFloat(tx.ppn || 0);
  const pphAmount = parseFloat(tx.pph_amount || 0);
  const totalKas = dpp + ppnAmount - pphAmount;

  // Helper: Cari atau buat referensi akun pajak
  const findTaxAccount = (keywords, fallbackName, fallbackCode, fallbackType) => {
    const found = accounts.find(a => keywords.some(k => a.name?.toLowerCase().includes(k)));
    return found || { id: `auto_${fallbackCode}`, name: fallbackName, code: fallbackCode, type: fallbackType };
  };

  const ppnMasukanAcc = findTaxAccount(['ppn masukan', 'pajak masukan', 'vat input'], 'PPN Masukan', '1-1700', 'Aset');
  const ppnKeluaranAcc = findTaxAccount(['ppn keluaran', 'pajak keluaran', 'vat output'], 'PPN Keluaran', '2-1700', 'Kewajiban');
  const hutangPPhAcc = findTaxAccount(['hutang pph', 'pph terutang'], `Hutang PPh ${tx.pph_type || ''}`, '2-1800', 'Kewajiban');

  const debitEntries = [];
  const creditEntries = [];

  const txDesc = tx.description || tx.merchant_name || 'Journal Entry';

  if (tx.type === 'Pengeluaran') {
    // Dr. Beban .............. DPP
    debitEntries.push({
      account_id: tx.account_id,
      account_code: account?.code || '',
      account_name: account?.name || 'Beban',
      account_type: account?.type || 'Beban',
      debit: dpp,
      credit: 0,
      description: txDesc
    });

    // Dr. PPN Masukan ........ PPN (jika ada)
    if (ppnAmount > 0) {
      debitEntries.push({
        account_id: ppnMasukanAcc.id,
        account_code: ppnMasukanAcc.code || '',
        account_name: ppnMasukanAcc.name,
        account_type: ppnMasukanAcc.type || 'Aset',
        debit: ppnAmount,
        credit: 0,
        description: `PPN Masukan - ${txDesc}`
      });
    }

    // Cr. Hutang PPh ......... PPh (jika ada)
    if (pphAmount > 0) {
      creditEntries.push({
        account_id: hutangPPhAcc.id,
        account_code: hutangPPhAcc.code || '',
        account_name: hutangPPhAcc.name,
        account_type: hutangPPhAcc.type || 'Kewajiban',
        debit: 0,
        credit: pphAmount,
        description: `PPh ${tx.pph_type || ''} Dipotong - ${txDesc}`
      });
    }

    // Cr. Kas/Bank ........... Total Kas Keluar
    creditEntries.push({
      account_id: paymentAccountId,
      account_code: paymentAccount?.code || '',
      account_name: paymentAccount?.name || 'Kas/Bank',
      account_type: paymentAccount?.type || 'Aset',
      debit: 0,
      credit: totalKas,
      description: txDesc
    });

  } else {
    // Dr. Kas/Bank ........... Total Kas Masuk
    debitEntries.push({
      account_id: paymentAccountId,
      account_code: paymentAccount?.code || '',
      account_name: paymentAccount?.name || 'Kas/Bank',
      account_type: paymentAccount?.type || 'Aset',
      debit: totalKas,
      credit: 0,
      description: txDesc
    });

    // Dr. Hutang PPh ......... PPh Dipotong Pihak Lain (jika ada)
    if (pphAmount > 0) {
      debitEntries.push({
        account_id: hutangPPhAcc.id,
        account_code: hutangPPhAcc.code || '',
        account_name: hutangPPhAcc.name,
        account_type: hutangPPhAcc.type || 'Kewajiban',
        debit: pphAmount,
        credit: 0,
        description: `PPh ${tx.pph_type || ''} Dipungut - ${txDesc}`
      });
    }

    // Cr. Pendapatan ......... DPP
    creditEntries.push({
      account_id: tx.account_id,
      account_code: account?.code || '',
      account_name: account?.name || 'Pendapatan',
      account_type: account?.type || 'Pendapatan',
      debit: 0,
      credit: dpp,
      description: txDesc
    });

    // Cr. PPN Keluaran ....... PPN (jika ada)
    if (ppnAmount > 0) {
      creditEntries.push({
        account_id: ppnKeluaranAcc.id,
        account_code: ppnKeluaranAcc.code || '',
        account_name: ppnKeluaranAcc.name,
        account_type: ppnKeluaranAcc.type || 'Kewajiban',
        debit: 0,
        credit: ppnAmount,
        description: `PPN Keluaran - ${txDesc}`
      });
    }
  }

  // Panggil secure API commit ke server!
  try {
    const result = await commitJournalToServer(
      {
        id: tx.id,
        business_id: tx.business_id,
        date: tx.date,
        description: txDesc,
        amount: tx.amount,
        category: tx.account_name || account?.name || ''
      },
      debitEntries,
      creditEntries,
      { requestAdvisory: true }
    );

    if (result && result.success) {
      console.log(`[JournalEngine] Server-side Journal Committed securely via API Gateway! ✅`, result.journalIds);
      
      // Update status & journal_id transaksi di client Firestore secara terpisah (aman)
      const { GoogleGenerativeAI: apiG } = await import('@/API/GoogleGenerativeAI');
      await apiG.entities.Transaction.update(tx.id, {
        status: 'Final',
        journal_id: result.journalIds[0] || tx.id,
        account_id: tx.account_id,
        account_name: account?.name || ''
      });
      
      return true;
    } else {
      throw new Error(result?.error || 'Unknown API commit error');
    }
  } catch (error) {
    console.error('[JournalEngine] Backend Journal Commit Failed ❌:', error);
    throw new Error(`Data Integrity Error: Gagal mencatat jurnal secara aman via Server. (${error.message})`);
  }
}

/**
 * Menghapus semua entri jurnal yang terkait dengan sebuah transaksi (ATOMIK).
 * Digunakan saat transaksi diedit atau dibatalkan.
 * @param {string} transactionId - ID transaksi yang jurnalnya akan dihapus
 */
export async function deleteJournalEntries(transactionId) {
  if (!transactionId) return;

  const { query, where, getDocs, collection } = await import('firebase/firestore');
  const journalRef = collection(db, 'journal_entries');
  const q = query(journalRef, where('transaction_id', '==', transactionId));

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log(`[JournalEngine] No journal entries found to delete for tx: ${transactionId}`);
      return;
    }

    const journalIds = snapshot.docs.map(docSnap => docSnap.id);
    const firstDocData = snapshot.docs[0].data();
    const businessId = firstDocData.business_id || '';

    const { deleteJournalsOnServer } = await import('./secureApiClient');
    await deleteJournalsOnServer(journalIds, transactionId, businessId, 'User requested transaction reversal/edit');
    console.log(`[JournalEngine] Server-side deleted ${snapshot.size} journal entries for tx: ${transactionId} ✅`);
  } catch (error) {
    console.error('[JournalEngine] Failed to delete journal entries:', error);
    throw new Error(`Gagal menghapus jurnal: ${error.message}`);
  }
}

export default swarm;
