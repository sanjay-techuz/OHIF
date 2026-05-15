/**
 * @author Sanjay Balai
 * @description Shared TypeScript shapes for the Lexa output renderers.
 * Mirrors the per-modality JSON schemas defined on the backend
 * (apps/api/src/modules/admin/cases/helpers/lexa/schemas.ts).
 *
 * Each modality has its own findings interface — the per-modality renderer
 * is typed against its specific shape, while the registry erases the
 * difference at the boundary so LexaReportOutput stays trivially generic.
 */

export type Side = 'right' | 'left' | 'other';

export type LexaTemplateKey =
  | 'mgScreening'
  | 'mgDiagnostic'
  | 'dbtScreening'
  | 'dbtDiagnostic'
  | 'us'
  | 'mri'
  | 'cem';

export interface ImplantFindings {
  isPresent?: boolean;
  type?: string;
  location?: string;
  description?: string;
  ruptureSigns?: string[];
  dehiscenceSigns?: string[];
  otherAbnormalities?: string[];
}

/** MG, DBT — also the Low-Energy block of CEM. */
export interface MammoFindings {
  breastDensity?: string;
  implantFindings?: ImplantFindings;
  masses?: any[];
  calcifications?: any[];
  asymmetries?: any[];
  architecturalDistortion?: any[];
  axilla?: string;
}

/** CEM = mammography fields + recombined-enhancement block. */
export interface CemFindings extends MammoFindings {
  backgroundParenchymalEnhancement?: string;
  enhancingMasses?: any[];
  enhancingNME?: any[];
}

export interface UltrasoundFindings {
  tissueComposition?: string;
  masses?: any[];
  cysts?: string;
  ductalChanges?: string;
  skinChanges?: string;
  vascularity?: string;
  axilla?: string;
}

export interface MriFindings {
  fibroglandularTissue?: string;
  backgroundParenchymalEnhancement?: string;
  masses?: any[];
  nonMassEnhancement?: any[];
  axilla?: string;
}

export interface ReportShape {
  technique?: string;
  comparison?: string;
  finalBiRads?: string;
  impression?: string;
  recommendations?: string;
  findings?: any;
}

export interface LexaOutputShape {
  mode?: string;
  templateKey?: LexaTemplateKey | string;
  templateName?: string;
  modality?: string;
  scenario?: string;
  output?: {
    analysis?: string;
    comparisonSummary?: string;
    patientSummary?: string;
    physicianSummary?: string;
    recommendations?: string;
    report?: ReportShape;
    summaryOfChanges?: any[];
    completenessCheck?: any[];
    metaSpecialistInsight?: string;
  };
  /** Correct-mode only: scorecard from SCORECARD_SCHEMA_BREAST. */
  scorecard?: ScorecardResult;
  /** Correct-mode only: FQS + composite report score. */
  qualityScore?: QualityScore;
  /** Correct-mode only: ACGME milestone insights. */
  educationalContent?: AcgmeResult;
  /** Correct-mode only: peer-reviewed references. */
  references?: ReferencesResult;
  [key: string]: unknown;
}

/** A single scorecard finding — shared by critical/major/minor/style buckets. */
export interface ScorecardItem {
  issue?: string;
  explanation?: string;
  suggestedCorrection?: string;
}

export interface ScorecardResult {
  criticalErrors?: ScorecardItem[];
  majorIssues?: ScorecardItem[];
  minorIssues?: ScorecardItem[];
  styleWarnings?: ScorecardItem[];
}

export interface DomainScore {
  score?: number;
  weight?: number;
  comment?: string;
}

export interface QualityScore {
  summary?: { strengths?: string; areasForImprovement?: string };
  foundationalQualityScore?: {
    totalFQS?: number;
    domainA?: DomainScore;
    domainB?: DomainScore;
    domainC?: DomainScore;
  };
  compositeReportScore?: number;
}

export interface AcgmeResult {
  keyFinding?: string;
  significance?: string;
  level2Differential?: string;
  level4Differential?: string;
  teachingPearls?: string;
}

export interface ReferencesResult {
  report_analysis_summary?: unknown;
  evidence_based_suggestions?: unknown;
  clinical_relevance?: unknown;
  verifiable_references?: unknown[];
}
