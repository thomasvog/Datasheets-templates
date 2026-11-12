import { DatasheetDocument } from '../types/datasheet';
import { exportVectorPdf } from './vectorPdfGenerator';

export async function exportDatasheetToPdf(
  document: DatasheetDocument,
  fileName: string = 'datasheet.pdf'
): Promise<void> {
  exportVectorPdf(document, fileName);
}

export function printDatasheet(): void {
  window.print();
}
