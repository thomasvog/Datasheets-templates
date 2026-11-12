import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { DatasheetDocument } from '../types/datasheet';

function addSelectableTextLayer(
  pdf: jsPDF,
  sheet: HTMLElement,
  pageX: number,
  pageY: number,
  pageW: number,
  pageH: number
): void {
  const sheetRect = sheet.getBoundingClientRect();
  const walker = window.document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const text = node.textContent;
    const parent = node.parentElement;
    if (text?.trim() && parent) {
      const style = window.getComputedStyle(parent);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        const range = window.document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
          const x = pageX + ((rect.left - sheetRect.left) / sheetRect.width) * pageW;
          const y = pageY + ((rect.bottom - sheetRect.top) / sheetRect.height) * pageH;
          const isBold = Number.parseInt(style.fontWeight, 10) >= 600;
          const fontStyle = isBold ? 'bold' : 'normal';
          const fontSize = Number.parseFloat(style.fontSize) * 0.75;

          pdf.setFont('helvetica', fontStyle);
          pdf.setFontSize(fontSize);
          pdf.text(text.replace(/\s+/g, ' '), x, y, { renderingMode: 'invisible' });
        }
      }
    }

    node = walker.nextNode();
  }
}

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
  const pageX = 7;
  const pageY = 6.5;
  const pageW = 196;
  const pageH = 284;
  pdf.addImage(image, 'PNG', pageX, pageY, pageW, pageH);
  addSelectableTextLayer(pdf, sheet, pageX, pageY, pageW, pageH);
  pdf.save(fileName);
}

export function printDatasheet(): void {
  window.print();
}
