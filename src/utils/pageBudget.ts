import { DatasheetDocument, ValidationResult } from '../types/datasheet';

// Real rendered row pitch in mm per density (calibrated against the DOM, incl. dividers)
const MM_PER_ROW = { 'ultra-compact': 3.9, compact: 4.6, standard: 5.6 } as const;

/**
 * Validates whether the datasheet strictly fits onto a single A4 page.
 * A4 Height = 297mm
 * Margins top/bottom = 7mm * 2 = 14mm
 * Usable height = 283mm
 * Header table height = ~38mm
 * Approvals block = ~18mm
 * Notes container = ~24mm
 * Usable column height = ~203mm
 */
export function validateDatasheetFit(doc: DatasheetDocument): ValidationResult {
  // Count equivalent rows in left column
  let leftRowUnits = 0;
  for (const sec of doc.leftSections) {
    // Section border and padding overhead ~ 0.5 row unit
    leftRowUnits += 0.5;
    if (sec.isScenarioTable && sec.scenarios && sec.scenarios.length > 0) {
      leftRowUnits += 1.2; // Scenario header row (Min / Norm / Max)
      leftRowUnits += sec.scenarios.length;
    }
    leftRowUnits += sec.rows.length;
  }

  // Count equivalent rows in right column
  let rightRowUnits = 0;
  for (const sec of doc.rightSections) {
    rightRowUnits += 0.5;
    if (sec.isScenarioTable && sec.scenarios && sec.scenarios.length > 0) {
      rightRowUnits += 1.2;
      rightRowUnits += sec.scenarios.length;
    }
    rightRowUnits += sec.rows.length;
  }

  const maxColumnRows = Math.max(leftRowUnits, rightRowUnits);

  // Notes block is fixed (5 rows = 78px ~ 20.6mm), footer 26px ~ 6.9mm, header ~ 32mm
  const notesHeightMm = 20.6;
  const mmPerRow = MM_PER_ROW[doc.density] ?? MM_PER_ROW.compact;
  const headerHeightMm = 32;
  const approvalsHeightMm = doc.approvals && doc.approvals.length > 0 ? 6.9 : 0;
  const columnsHeightMm = maxColumnRows * mmPerRow;
  const totalEstimatedHeightMm = 13 + headerHeightMm + columnsHeightMm + notesHeightMm + approvalsHeightMm;
  const maxPageHeightMm = 297; // A4 standard

  const percentUtilized = Math.round((totalEstimatedHeightMm / maxPageHeightMm) * 100);

  let status: 'safe' | 'warning' | 'overflow' = 'safe';
  let message = 'El datasheet entra perfectamente en 1 página A4.';

  if (totalEstimatedHeightMm > maxPageHeightMm) {
    status = 'overflow';
    message = `Atención: Se superó la altura de 1 página A4 (${totalEstimatedHeightMm.toFixed(0)}mm / ${maxPageHeightMm}mm). Reduce filas o activa modo Ultra-Compact.`;
  } else if (percentUtilized > 94) {
    status = 'warning';
    message = `Cerca del límite de 1 página (${percentUtilized}% utilizado). Espacio muy ajustado.`;
  }

  return {
    valid: status !== 'overflow',
    totalLeftRows: Math.round(leftRowUnits),
    totalRightRows: Math.round(rightRowUnits),
    maxRecommendedRows: 38,
    estimatedHeightMm: Math.round(totalEstimatedHeightMm),
    maxPageHeightMm,
    percentUtilized,
    status,
    message,
  };
}
