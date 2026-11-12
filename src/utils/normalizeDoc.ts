import type {
  ApprovalSignature,
  DataRow,
  DatasheetDocument,
  DatasheetHeader,
  DatasheetNote,
  InstrumentCategory,
  PageDensity,
  ScenarioItem,
  SectionBlock,
} from '../types/datasheet';

export const MAX_NOTES = 5;
export const MAX_APPROVALS = 4;

const CATEGORIES: InstrumentCategory[] = ['valve', 'flowmeter', 'pressure', 'temperature'];
const DENSITIES: PageDensity[] = ['ultra-compact', 'compact', 'standard'];

const HEADER_KEYS: (keyof DatasheetHeader)[] = [
  'companyName',
  'project',
  'location',
  'tag',
  'documentTitle',
  'standard',
  'equipmentType',
  'equipmentFunction',
  'pidRef',
  'lineNo',
  'poNo',
  'revision',
  'revDesc',
  'date',
  'sheet',
  'status',
];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Converts any scalar into a display string; objects/arrays/null become ''. */
const str = (v: unknown, fallback = ''): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fallback;
};

const numOrStr = (v: unknown, fallback: number | string): number | string =>
  typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? v : fallback;

function normalizeRow(raw: unknown, idx: number): DataRow | null {
  if (!isObject(raw)) return null;
  const row: DataRow = {
    num: numOrStr(raw.num, idx + 1),
    label: str(raw.label),
    value: str(raw.value, '-'),
  };
  const unit = str(raw.unit);
  if (unit) row.unit = unit;
  const noteRef = str(raw.noteRef);
  if (noteRef) row.noteRef = noteRef;
  return row;
}

function normalizeScenario(raw: unknown, idx: number): ScenarioItem | null {
  if (!isObject(raw)) return null;
  return {
    num: numOrStr(raw.num, idx + 1),
    label: str(raw.label),
    unit: str(raw.unit),
    min: str(raw.min, '-'),
    norm: str(raw.norm, '-'),
    max: str(raw.max, '-'),
    ...(str(raw.noteRef) ? { noteRef: str(raw.noteRef) } : {}),
  };
}

function normalizeSections(raw: unknown, prefix: string): SectionBlock[] {
  if (!Array.isArray(raw)) return [];
  const usedIds = new Set<string>();
  const result: SectionBlock[] = [];

  raw.forEach((rawSec, sIdx) => {
    if (!isObject(rawSec)) return;

    // Guarantee unique, non-empty ids (they are used as React keys).
    let id = str(rawSec.id) || `${prefix}-sec-${sIdx + 1}`;
    while (usedIds.has(id)) id = `${id}-${sIdx + 1}`;
    usedIds.add(id);

    const scenarios = (Array.isArray(rawSec.scenarios) ? rawSec.scenarios : [])
      .map(normalizeScenario)
      .filter((s): s is ScenarioItem => s !== null);

    const rows = (Array.isArray(rawSec.rows) ? rawSec.rows : [])
      .map(normalizeRow)
      .filter((r): r is DataRow => r !== null);

    const section: SectionBlock = {
      id,
      name: str(rawSec.name, `SECCIÓN ${sIdx + 1}`),
      rows,
    };
    // A scenario table is only meaningful when it has scenarios.
    if (scenarios.length > 0) {
      section.isScenarioTable = true;
      section.scenarios = scenarios;
    }
    result.push(section);
  });

  return result;
}

function normalizeNotes(raw: unknown): DatasheetNote[] {
  if (!Array.isArray(raw)) return [];
  const notes: DatasheetNote[] = [];
  raw.forEach((n, idx) => {
    if (!isObject(n)) return;
    notes.push({ num: numOrStr(n.num, 900 + idx), text: str(n.text) });
  });
  // The printed sheet has a fixed block of MAX_NOTES rows.
  return notes.slice(0, MAX_NOTES);
}

function normalizeApprovals(raw: unknown): ApprovalSignature[] {
  if (!Array.isArray(raw)) return [];
  const approvals: ApprovalSignature[] = [];
  raw.forEach((a) => {
    if (!isObject(a)) return;
    const appr: ApprovalSignature = {
      role: str(a.role),
      name: str(a.name),
      signatureDate: str(a.signatureDate),
    };
    const company = str(a.company);
    if (company) appr.company = company;
    approvals.push(appr);
  });
  // The printed footer is a 4-column grid.
  return approvals.slice(0, MAX_APPROVALS);
}

/**
 * Turns untrusted input (AI output, imported JSON, API body) into a fully
 * populated DatasheetDocument. Throws an Error with a readable message when the
 * input cannot be a datasheet at all.
 */
export function normalizeDatasheet(raw: unknown): DatasheetDocument {
  if (!isObject(raw)) {
    throw new Error('El contenido no es un objeto JSON de datasheet válido.');
  }
  if (!isObject(raw.header)) {
    throw new Error('Falta el bloque "header" en el datasheet.');
  }
  if (!Array.isArray(raw.leftSections) || !Array.isArray(raw.rightSections)) {
    throw new Error('Faltan "leftSections" y/o "rightSections" en el datasheet.');
  }

  const rawHeader = raw.header;
  const header = {} as DatasheetHeader;
  for (const key of HEADER_KEYS) {
    header[key] = str(rawHeader[key], key === 'sheet' ? '1 / 1' : '');
  }
  const logo = str(rawHeader.companyLogo);
  if (logo) header.companyLogo = logo;

  const category = CATEGORIES.includes(raw.category as InstrumentCategory)
    ? (raw.category as InstrumentCategory)
    : 'valve';
  const density = DENSITIES.includes(raw.density as PageDensity)
    ? (raw.density as PageDensity)
    : 'compact';

  const doc: DatasheetDocument = {
    id: str(raw.id) || `custom-${Date.now()}`,
    category,
    density,
    header,
    leftSections: normalizeSections(raw.leftSections, 'left'),
    rightSections: normalizeSections(raw.rightSections, 'right'),
    notes: normalizeNotes(raw.notes),
    approvals: normalizeApprovals(raw.approvals),
  };

  if (typeof raw.showWatermark === 'boolean') doc.showWatermark = raw.showWatermark;
  const wm = str(raw.watermarkText);
  if (wm) doc.watermarkText = wm;

  return doc;
}
