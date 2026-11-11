import { exportVectorPdf } from './vectorPdfGenerator';
import { DatasheetDocument } from '../types/datasheet';

/**
 * Exports the datasheet as a 100% vector, text-searchable, selectable PDF
 * using native PDF instructions. Text can be selected, searched (Ctrl+F),
 * copied and pasted.
 */
export async function exportDatasheetToPdf(
  docData: DatasheetDocument,
  fileName?: string
): Promise<void> {
  const cleanFileName = fileName || `${docData.header.tag || 'datasheet'}_ISA20.pdf`;
  exportVectorPdf(docData, cleanFileName);
}

/**
 * Triggers native browser print dialog, which also produces a 100% vector
 * copyable PDF using the browser's built-in PDF printer.
 */
export function printDatasheet(): void {
  window.print();
}
