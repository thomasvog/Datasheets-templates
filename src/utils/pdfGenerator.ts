import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export async function exportDatasheetToPdf(
  elementId: string,
  fileName: string = 'datasheet.pdf'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} not found`);
  }

  // Temporarily reset any scale transform so capture is 1:1
  const originalTransform = element.style.transform;
  element.style.transform = 'none';

  try {
    // skipFonts: true prevents html-to-image from accessing document.styleSheets
    // which avoids the cross-origin SecurityError: Failed to read 'cssRules'
    const dataUrl = await toPng(element, {
      pixelRatio: 3, // 300 DPI high-definition rendering
      quality: 0.98,
      backgroundColor: '#ffffff',
      skipFonts: true,
      fontEmbedCSS: '',
      cacheBust: false,
    });

    // A4 dimensions: 210mm x 297mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // The inner container is 196mm x 284mm, centered with 7mm margins
    pdf.addImage(dataUrl, 'PNG', 7, 6.5, 196, 284, undefined, 'FAST');

    const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(cleanFileName);
  } finally {
    element.style.transform = originalTransform;
  }
}

export function printDatasheet(): void {
  window.print();
}
