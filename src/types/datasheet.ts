export type InstrumentCategory = 'valve' | 'flowmeter' | 'pressure' | 'temperature';

export interface DatasheetHeader {
  companyName: string;
  companyLogo?: string;
  project: string;
  location: string;
  tag: string;
  documentTitle: string;
  standard: string;
  equipmentType: string;
  equipmentFunction: string;
  pidRef: string;
  lineNo: string;
  poNo: string;
  revision: string;
  revDesc: string;
  date: string;
  sheet: string;
  status: string;
}

export interface DataRow {
  num: number | string;
  label: string;
  unit?: string;
  value: string;
  noteRef?: string;
}

export interface ScenarioItem {
  num: number | string;
  label: string;
  unit: string;
  min: string;
  norm: string;
  max: string;
  noteRef?: string;
}

export interface SectionBlock {
  id: string;
  name: string;
  isScenarioTable?: boolean;
  scenarios?: ScenarioItem[];
  rows: DataRow[];
}

export interface DatasheetNote {
  num: number | string;
  text: string;
}

export interface ApprovalSignature {
  role: string;
  name: string;
  signatureDate: string;
  company?: string;
}

export type PageDensity = 'ultra-compact' | 'compact' | 'standard';

export interface DatasheetDocument {
  id: string;
  category: InstrumentCategory;
  header: DatasheetHeader;
  leftSections: SectionBlock[];
  rightSections: SectionBlock[];
  notes: DatasheetNote[];
  approvals: ApprovalSignature[];
  density: PageDensity;
  showWatermark?: boolean;
  watermarkText?: string;
}

export interface ValidationResult {
  valid: boolean;
  totalLeftRows: number;
  totalRightRows: number;
  maxRecommendedRows: number;
  estimatedHeightMm: number;
  maxPageHeightMm: number;
  percentUtilized: number;
  status: 'safe' | 'warning' | 'overflow';
  message: string;
}
