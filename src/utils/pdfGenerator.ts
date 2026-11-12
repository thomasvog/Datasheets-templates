import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { DatasheetDocument } from '../types/datasheet';

export async function exportDatasheetToPdf(
  _document: DatasheetDocument,
  fileName: string = 'datasheet.pdf'
): Promise<void> {
  const sheet = window.document.getElementById('datasheet-a4-canvas');
  if (!sheet) {
    throw new Error('No se encontró la vista previa del datasheet para exportar.');
  }

  await window.document.fonts.ready;

  const image = await toPng(sheet, {
    width: sheet.offsetWidth,
    height: sheet.offsetHeight,
    pixelRatio: 3,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  pdf.addImage(image, 'PNG', 7, 6.5, 196, 284);
  pdf.save(fileName);
}

export function printDatasheet(): void {
  window.print();
}
