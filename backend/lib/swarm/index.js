/**
 * SWARM AGENT BUNDLER (SERVER-SIDE)
 * ================================
 * Total Active Agents: 76
 */

import { SwarmOrchestrator } from './orchestrator.js';

// 1. CORE & ROOT AGENTS (19 Agents)
import { LedgerAgent } from './agents/ledgerAgent.js';
import { TaxComplianceAgent } from './agents/taxComplianceAgent.js';
import { InventoryAgent } from './agents/inventoryAgent.js';
import { RegulatoryScoutAgent } from './agents/regulatoryScout.js';
import { TaxExpertAgent } from './agents/taxExpertAgent.js';
import { RegionalTaxAgent } from './agents/regionalTaxAgent.js';
import { TreatyMasterAgent } from './agents/treatyMasterAgent.js';
import { AssetImpairmentAgent } from './agents/assetImpairmentAgent.js';
import { DigitalVATAgent } from './agents/digitalVATAgent.js';
import { BankMatchAgent } from './agents/bankMatchAgent.js';
import { CoreTaxAgent } from './agents/CoreTaxAgent.js';
import { BiyoPersonaAgent } from './agents/biyoPersonaAgent.js';
import { BenfordAuditAgent } from './agents/benfordAuditAgent.js';

import { 
  ForexRevaluationAgent, 
  PeriodLockAgent, 
  DuplicateDetectorAgent, 
  PPh21TERAgent, 
  PriorPeriodAgent, 
  CashSafetyAgent 
} from './agents/extraFinancialAgents.js';

// 2. TAX DIVISION (20 Agents)
import { 
  PPh21EmployeeAgent, 
  PPh21NonEmployeeAgent, 
  PPh22ImportAgent, 
  PPh23ServiceAgent 
} from './agents/tax/pphGroup1.js';
import { 
  PPh25InstallmentAgent, 
  PPh26InternationalAgent, 
  PPh42FinalAgent, 
  PPh29CorporateCreditAgent 
} from './agents/tax/pphGroup2.js';
import { 
  PPNOutputAgent, 
  PPNInputAgent, 
  PPNWapuAgent, 
  PPNKmsAgent, 
  PPNExportAgent 
} from './agents/tax/ppnGroup.js';
import { 
  CoreTaxValidatorAgent, 
  MapSpecialistAgent, 
  CoreTaxApiGatewayAgent, 
  DigitalStampAgent 
} from './agents/tax/coreTaxGroup.js';
import { 
  FiscalReconAgent, 
  RiskScoutAgent, 
  AssetLaunderingAgent 
} from './agents/audit/forensicGroup.js';

// 4. GLOBAL & MULTI-STANDARD DIVISION
import { IFRSAgent } from './agents/global/ifrsAgent.js';

// 5. META DIVISION
import { ConsensusArbitrator } from './agents/meta/consensusArbitrator.js';

// 3. AUDIT & FORENSIC DIVISION (12 Agents)
import { 
  VendorKickbackAgent, 
  GhostVendorAgent, 
  DuplicatePaymentAgent, 
  ProcurementCycleAgent 
} from './agents/audit/procurementGroup.js';
import { 
  SkimmingDetectorAgent, 
  LappingAuditorAgent, 
  AssetTheftScoutAgent, 
  RevenueRecognitionAgent 
} from './agents/audit/revenueGroup.js';
import { 
  BenfordStatAgent, 
  AnomalyPatternAgent, 
  UserBehaviorAgent, 
  OutlierDetectorAgent 
} from './agents/audit/statisticalGroup.js';

// 4. STRATEGIC CFO DIVISION (25 Agents)
import { 
  RoIAnalyzerAgent, 
  EBIDTA_ScoutAgent, 
  GPM_SpecialistAgent, 
  OPEX_OptimizerAgent, 
  WorkingCapitalAgent, 
  UnitEconomicsAgent 
} from './agents/cfo/performanceGroup.js';
import { 
  BudgetGuardAgent, 
  VarianceForensicAgent, 
  ZeroBasedAuditorAgent, 
  RollingForecastAgent, 
  ScenarioBuilderAgent, 
  CapExPlannerAgent 
} from './agents/cfo/budgetGroup.js';
import { 
  MarketTrendAgent, 
  CompetitorPricingAgent, 
  IndustryBenchmarkAgent, 
  ProductLifeCycleAgent, 
  ExpansionScoutAgent, 
  M&A_EvaluatorAgent 
} from './agents/cfo/marketGroup.js';
import { 
  SolvencyWatchAgent, 
  AltmanZScoreAgent, 
  EnterpriseValueAgent, 
  SensitivityAnalystAgent, 
  ESG_ComplianceAgent, 
  DividendPolicyAgent, 
  StrategicExitAgent 
} from './agents/cfo/riskGroup.js';

const agents = [
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
  FiscalReconAgent, RiskScoutAgent, AssetLaunderingAgent,

  // Audit
  VendorKickbackAgent, GhostVendorAgent, DuplicatePaymentAgent, ProcurementCycleAgent,
  SkimmingDetectorAgent, LappingAuditorAgent, AssetTheftScoutAgent, RevenueRecognitionAgent,
  BenfordStatAgent, AnomalyPatternAgent, UserBehaviorAgent, OutlierDetectorAgent,

  // Global
  IFRSAgent,

  // Meta
  ConsensusArbitrator,

  // CFO
  RoIAnalyzerAgent, EBIDTA_ScoutAgent, GPM_SpecialistAgent, OPEX_OptimizerAgent,
  WorkingCapitalAgent, UnitEconomicsAgent, BudgetGuardAgent, VarianceForensicAgent,
  ZeroBasedAuditorAgent, RollingForecastAgent, ScenarioBuilderAgent, CapExPlannerAgent,
  MarketTrendAgent, CompetitorPricingAgent, IndustryBenchmarkAgent, ProductLifeCycleAgent,
  ExpansionScoutAgent, M&A_EvaluatorAgent, SolvencyWatchAgent, AltmanZScoreAgent,
  EnterpriseValueAgent, SensitivityAnalystAgent, ESG_ComplianceAgent, DividendPolicyAgent,
  StrategicExitAgent
];

export const serverSwarm = new SwarmOrchestrator(agents);
