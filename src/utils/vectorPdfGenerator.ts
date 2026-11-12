import { jsPDF } from 'jspdf';
import { DatasheetDocument, SectionBlock, ScenarioItem } from '../types/datasheet';

type RGBColor = readonly [number, number, number];

/**
 * Renders vertical badge text perfectly centered horizontally and vertically
 * within a vertical badge rectangle without relying on jsPDF's align option
 * (which miscalculates unrotated axes when rotated).
 */
function drawVerticalBadgeText(
  pdf: jsPDF,
  text: string,
  badgeX: number,
  badgeY: number,
  badgeW: number,
  badgeH: number,
  fontSizePt = 6.2,
  color: RGBColor = [0, 0, 0]
): void {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(fontSizePt);
  pdf.setTextColor(color[0], color[1], color[2]);

  let txt = text.toUpperCase();
  let textW = pdf.getTextWidth(txt);
  const maxAllowedW = Math.max(8, badgeH - 3.5);
  if (textW > maxAllowedW) {
    while (txt.length > 2 && pdf.getTextWidth(txt + '…') > maxAllowedW) {
      txt = txt.slice(0, -1);
    }
    txt = txt + '…';
    textW = pdf.getTextWidth(txt);
  }

  // Cap-height in mm for Helvetica Bold at fontSizePt (ratio ~0.718)
  const capHeightMm = (fontSizePt * 0.718) * (25.4 / 72);

  // X coordinate: centers the glyphs within badgeW
  // Basis vector for angle 90 ascenders points LEFT, baseline is at tx
  const tx = badgeX + (badgeW + capHeightMm) / 2;

  // Y coordinate: text reads bottom-to-top, starts at ty and ends at (ty - textW)
  const ty = badgeY + badgeH / 2 + textW / 2;

  pdf.text(txt, tx, ty, { angle: 90 });
}

/**
 * Generates an authentic, 100% vector, text-searchable, copy-pasteable PDF
 * strictly guaranteed to fit on exactly 1 single A4 page.
 * Uses native PDF vector instructions (Tj/TJ operators, line & rect drawing).
 */
export function exportVectorPdf(
  docData: DatasheetDocument,
  fileName?: string
): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // A4 Geometry: 210mm x 297mm
  const marginX = 7.0;
  const marginY = 6.5;
  const sheetW = 196.0;
  const sheetH = 284.0;
  const sheetBottomY = marginY + sheetH; // 290.5mm

  const headerH = 35.0;
  const notesH = 22.0; // Exactly 5 rows x 4.4mm
  const approvalsH = 22.5;
  const columnsH = sheetH - headerH - notesH - approvalsH; // 204.5mm

  const topY = marginY; // 6.5mm
  const columnsY = topY + headerH; // 41.5mm
  const notesY = columnsY + columnsH; // 246.0mm
  const approvalsY = notesY + notesH; // 268.0mm

  // Colors
  const black: RGBColor = [0, 0, 0];
  const borderColor: RGBColor = [0, 0, 0];
  const gridColor: RGBColor = [175, 175, 175];
  const borderWidth = 0.12;
  const majorBorderWidth = 0.42;
  const sectionBorderWidth = 0.24;
  const grayFill: RGBColor = [242, 244, 246];
  const grayText: RGBColor = [90, 90, 90];

  // Helper: Truncate string cleanly
  const truncate = (str: string | undefined | null, maxChars: number): string => {
    if (!str) return '';
    return str.length > maxChars ? str.substring(0, maxChars - 1) + '…' : str;
  };

  // Helper: Draw horizontal line
  const hLine = (x1: number, x2: number, y: number) => {
    pdf.setDrawColor(gridColor[0], gridColor[1], gridColor[2]);
    pdf.setLineWidth(borderWidth);
    pdf.line(x1, y, x2, y);
  };

  // Helper: Draw vertical line
  const vLine = (x: number, y1: number, y2: number) => {
    pdf.setDrawColor(gridColor[0], gridColor[1], gridColor[2]);
    pdf.setLineWidth(borderWidth);
    pdf.line(x, y1, x, y2);
  };

  const majorHLine = (x1: number, x2: number, y: number) => {
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(majorBorderWidth);
    pdf.line(x1, y, x2, y);
  };

  const majorVLine = (x: number, y1: number, y2: number) => {
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(majorBorderWidth);
    pdf.line(x, y1, x, y2);
  };

  // --- 1. OUTER BORDER ---
  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setLineWidth(majorBorderWidth);
  pdf.rect(marginX, marginY, sheetW, sheetH);

  // --- 2. HEADER BLOCK (Y: 6.5 -> 41.5) ---
  const hRow1H = 16.0;
  const hRow2H = 10.0;
  const hRow3H = 9.0;

  // Major horizontal lines in header
  majorHLine(marginX, marginX + sheetW, topY + hRow1H);
  majorHLine(marginX, marginX + sheetW, topY + hRow1H + hRow2H);
  majorHLine(marginX, marginX + sheetW, columnsY);

  // Row 1: Company (30%), Title (45%), Tag (25%)
  const wComp = sheetW * 0.30; // 58.8mm
  const wTitle = sheetW * 0.45; // 88.2mm
  const wTag = sheetW * 0.25; // 49.0mm
  const xTitle = marginX + wComp;
  const xTag = xTitle + wTitle;

  vLine(xTitle, topY, topY + hRow1H);
  vLine(xTag, topY, topY + hRow1H);

  // Company Box
  pdf.setFillColor(grayFill[0], grayFill[1], grayFill[2]);
  pdf.rect(marginX + 0.2, topY + 0.2, wComp - 0.4, hRow1H - 0.4, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.companyName, 32), marginX + wComp / 2, topY + 6.8, {
    align: 'center',
    maxWidth: wComp - 4,
  });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.5);
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.text('Instrumentation & Control Engineering', marginX + wComp / 2, topY + 11.5, {
    align: 'center',
  });

  // Title Box
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.2);
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.text(docData.header.standard || 'ISA-TR20.00.01 / ISA-20', xTitle + wTitle / 2, topY + 4.5, {
    align: 'center',
  });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.documentTitle, 36), xTitle + wTitle / 2, topY + 9.2, {
    align: 'center',
  });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.equipmentType, 40), xTitle + wTitle / 2, topY + 13.5, {
    align: 'center',
  });

  // Tag Box
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.5);
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.text('TAG NO.', xTag + wTag / 2, topY + 3.8, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.tag, 18), xTag + wTag / 2, topY + 8.8, {
    align: 'center',
  });
  hLine(xTag, xTag + wTag, topY + 10.8);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.2);
  pdf.text(`REV: ${docData.header.revision || '0'}`, xTag + 3, topY + 14.5);
  pdf.text(`HOJA: ${docData.header.sheet || '1 / 1'}`, xTag + wTag - 3, topY + 14.5, {
    align: 'right',
  });

  // Row 2: Project, Service, Date, Status
  const r2Y = topY + hRow1H; // 22.5mm
  const colR2_1 = sheetW * 0.333; // ~65.27mm
  const colR2_2 = sheetW * 0.333; // ~65.27mm
  const colR2_3 = sheetW * 0.167; // ~32.73mm
  const colR2_4 = sheetW - colR2_1 - colR2_2 - colR2_3;

  vLine(marginX + colR2_1, r2Y, r2Y + hRow2H);
  vLine(marginX + colR2_1 + colR2_2, r2Y, r2Y + hRow2H);
  vLine(marginX + colR2_1 + colR2_2 + colR2_3, r2Y, r2Y + hRow2H);

  // Project
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.4);
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.text('PROYECTO:', marginX + 2, r2Y + 3.6);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.6);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.project, 44), marginX + 2, r2Y + 7.4);

  // Service
  const xR2_2 = marginX + colR2_1;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.4);
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.text('SERVICIO / FUNCIÓN:', xR2_2 + 2, r2Y + 3.6);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.6);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.equipmentFunction, 44), xR2_2 + 2, r2Y + 7.4);

  // Date
  const xR2_3 = xR2_2 + colR2_2;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.4);
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.text('FECHA:', xR2_3 + colR2_3 / 2, r2Y + 3.6, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.date, 16), xR2_3 + colR2_3 / 2, r2Y + 7.4, { align: 'center' });

  // Status
  const xR2_4 = xR2_3 + colR2_3;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.4);
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.text('ESTADO:', xR2_4 + colR2_4 / 2, r2Y + 3.6, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.9);
  pdf.setTextColor(black[0], black[1], black[2]);
  pdf.text(truncate(docData.header.status, 24), xR2_4 + colR2_4 / 2, r2Y + 7.4, { align: 'center' });

  // Row 3: P&ID, Line No, Location, PO No (4 equal cols = 49mm each)
  const r3Y = r2Y + hRow2H; // 32.5mm
  const colR3W = sheetW / 4; // 49.0mm
  vLine(marginX + colR3W, r3Y, r3Y + hRow3H);
  vLine(marginX + colR3W * 2, r3Y, r3Y + hRow3H);
  vLine(marginX + colR3W * 3, r3Y, r3Y + hRow3H);

  const drawHeaderField = (x: number, label: string, val: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.6);
    pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
    pdf.text(label, x + 2, r3Y + 5.5);
    const labelW = pdf.getTextWidth(label) + 1.2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.2);
    pdf.setTextColor(black[0], black[1], black[2]);
    pdf.text(truncate(val, 28), x + 2 + labelW, r3Y + 5.5);
  };

  drawHeaderField(marginX, 'P&ID REF:', docData.header.pidRef);
  drawHeaderField(marginX + colR3W, 'LÍNEA:', docData.header.lineNo);
  drawHeaderField(marginX + colR3W * 2, 'UBICACIÓN:', docData.header.location);
  drawHeaderField(marginX + colR3W * 3, 'O. COMPRA:', docData.header.poNo);

  // --- 3. TWO SYMMETRICAL COLUMNS (Y: 41.5 -> 246.0) ---
  const colW = sheetW / 2; // 98.0mm
  const xColLeft = marginX;
  const xColRight = marginX + colW;

  // Unbroken center vertical divider between columns
  majorVLine(xColRight, columnsY, notesY);
  // Unbroken horizontal divider above notes
  majorHLine(marginX, marginX + sheetW, notesY);

  // Helper to count rows
  const countColumnRows = (sections: SectionBlock[]) => {
    let count = 0;
    sections.forEach((sec) => {
      count += sec.rows.length;
      if (sec.isScenarioTable && sec.scenarios && sec.scenarios.length > 0) {
        count += sec.scenarios.length + 1; // +1 for scenario header
      }
    });
    return count;
  };

  const leftCount = countColumnRows(docData.leftSections);
  const rightCount = countColumnRows(docData.rightSections);
  // Grid height: symmetrical row count so both columns align across center
  const totalGridRows = Math.max(leftCount, rightCount, 28);
  const rowH = columnsH / totalGridRows;

  // Function to render a column of sections
  const renderColumn = (sections: SectionBlock[], colStartX: number, spareNeeded: number) => {
    if (sections.length === 0) return;

    const badgeW = 5.2; // Width of vertical section badge
    const tableW = colW - badgeW; // 92.8mm
    const colTableX = colStartX + badgeW;

    // Column widths inside table:
    // Col 1 (#): 6.0mm
    // Col 2 (Label): 43.0mm
    // Col 3 (Unit): 7.5mm
    // Col 4 (Value): 36.3mm
    const wNum = 6.0;
    const wLabel = 43.0;
    const wUnit = 7.5;
    const wVal = tableW - wNum - wLabel - wUnit; // 36.3mm

    const xNum = colTableX;
    const xLabel = xNum + wNum; // colTableX + 6.0
    const xUnit = xLabel + wLabel; // colTableX + 49.0
    const xVal = xUnit + wUnit; // colTableX + 56.5

    // Scenario sub-columns inside right half (wUnit + wVal = 43.8mm):
    const wSUnit = 7.5;
    const wSMin = 12.1;
    const wSNorm = 12.1;
    const wSMax = 12.1;

    const xSUnit = xLabel + wLabel; // same as xUnit
    const xSMin = xSUnit + wSUnit;
    const xSNorm = xSMin + wSMin;
    const xSMax = xSNorm + wSNorm;

    let currentY = columnsY;

    sections.forEach((sec, sIdx) => {
      const isLastSection = sIdx === sections.length - 1;
      const extraRows = isLastSection ? spareNeeded : 0;
      const secRowsCount = sec.rows.length + (sec.isScenarioTable && sec.scenarios && sec.scenarios.length > 0 ? sec.scenarios.length + 1 : 0) + extraRows;
      
      const secH = secRowsCount * rowH;
      const secEndY = isLastSection ? notesY : (currentY + secH);

      // Section vertical label badge
      pdf.setFillColor(grayFill[0], grayFill[1], grayFill[2]);
      pdf.rect(colStartX, currentY, badgeW, secEndY - currentY, 'F');
      pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      pdf.setLineWidth(sectionBorderWidth);
      pdf.line(colTableX, currentY, colTableX, secEndY);

      // Rotated text for badge (centered with zero offset)
      drawVerticalBadgeText(pdf, sec.name, colStartX, currentY, badgeW, secEndY - currentY, 6.2, black);

      // Continuous vertical lines from section top to bottom:
      vLine(xLabel, currentY, secEndY);
      vLine(xUnit, currentY, secEndY);
      vLine(xVal, currentY, secEndY);

      let rowY = currentY;

      // Render Scenario Table if present
      if (sec.isScenarioTable && sec.scenarios && sec.scenarios.length > 0) {
        const scenHeaderH = rowH; // Exactly rowH for 100% mathematical grid alignment
        const scenRowsEndY = currentY + scenHeaderH + sec.scenarios.length * rowH;

        // Scenario Header background
        pdf.setFillColor(grayFill[0], grayFill[1], grayFill[2]);
        pdf.rect(colTableX, rowY, tableW, scenHeaderH, 'F');
        vLine(xLabel, rowY, rowY + scenHeaderH);
        vLine(xSUnit, rowY, rowY + scenHeaderH);
        hLine(colTableX, colTableX + tableW, rowY + scenHeaderH);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(5.3);
        pdf.setTextColor(black[0], black[1], black[2]);

        const textYOffset = scenHeaderH * 0.68;
        pdf.text('#', xNum + wNum / 2, rowY + textYOffset, { align: 'center' });
        pdf.text('CONDICIÓN DE PROCESO', xLabel + 1.5, rowY + textYOffset);
        pdf.text('MÍN', xSMin + wSMin / 2, rowY + textYOffset, { align: 'center' });
        pdf.text('NORM', xSNorm + wSNorm / 2, rowY + textYOffset, { align: 'center' });
        pdf.text('MÁX', xSMax + wSMax / 2, rowY + textYOffset, { align: 'center' });

        // Continuous vertical lines for scenario table sub-columns
        vLine(xSMin, currentY, scenRowsEndY);
        vLine(xSNorm, currentY, scenRowsEndY);
        vLine(xSMax, currentY, scenRowsEndY);

        rowY += scenHeaderH;

        // Scenario Rows
        sec.scenarios.forEach((scen, scenIdx) => {
          // Subtle shading for NORM column
          pdf.setFillColor(248, 248, 248);
          pdf.rect(xSNorm, rowY, wSNorm, rowH, 'F');
          vLine(xSNorm, rowY, rowY + rowH);
          vLine(xSMax, rowY, rowY + rowH);
          if (scenIdx < (sec.scenarios?.length ?? 0) - 1 || sec.rows.length > 0 || extraRows > 0) {
            hLine(colTableX, colTableX + tableW, rowY + rowH);
          }

          const cellTextY = rowY + rowH * 0.68;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(5.6);
          pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
          pdf.text(String(scen.num), xNum + wNum / 2, cellTextY, { align: 'center' });

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.2);
          pdf.setTextColor(black[0], black[1], black[2]);
          pdf.text(truncate(scen.label, 28), xLabel + 1.5, cellTextY);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(5.5);
          pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
          pdf.text(scen.unit || '', xSUnit + wSUnit / 2, cellTextY, { align: 'center' });

          pdf.setTextColor(black[0], black[1], black[2]);
          pdf.text(scen.min || '-', xSMin + wSMin / 2, cellTextY, { align: 'center' });

          pdf.setFont('helvetica', 'bold');
          pdf.text(scen.norm || '-', xSNorm + wSNorm / 2, cellTextY, { align: 'center' });

          pdf.setFont('helvetica', 'normal');
          pdf.text(scen.max || '-', xSMax + wSMax / 2, cellTextY, { align: 'center' });

          rowY += rowH;
        });
      }

      // Regular Property Rows
      let lastRowNum = 0;
      sec.rows.forEach((row, rowIdx) => {
        if (rowIdx < sec.rows.length - 1 || extraRows > 0) {
          hLine(colTableX, colTableX + tableW, rowY + rowH);
        }

        const cellTextY = rowY + rowH * 0.68;
        const numVal = typeof row.num === 'number' ? row.num : parseInt(String(row.num), 10);
        if (!isNaN(numVal) && numVal > lastRowNum) lastRowNum = numVal;

        // Row #
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(5.6);
        pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
        pdf.text(String(row.num), xNum + wNum / 2, cellTextY, { align: 'center' });

        // Parameter Label
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.4);
        pdf.setTextColor(black[0], black[1], black[2]);
        pdf.text(truncate(row.label, 30), xLabel + 1.5, cellTextY);

        // Unit
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(5.5);
        pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
        pdf.text(row.unit || '', xUnit + wUnit / 2, cellTextY, { align: 'center' });

        // Value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.7);
        pdf.setTextColor(black[0], black[1], black[2]);
        pdf.text(truncate(row.value, 26), xVal + 1.5, cellTextY);

        rowY += rowH;
      });

      // Render Spare Rows in last section to maintain full grid closure
      if (isLastSection && spareNeeded > 0) {
        for (let sp = 0; sp < spareNeeded; sp++) {
          const spNum = lastRowNum ? lastRowNum + 1 + sp : '';
          if (sp < spareNeeded - 1) {
            hLine(colTableX, colTableX + tableW, rowY + rowH);
          }

          if (spNum) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(5.4);
            pdf.setTextColor(170, 170, 170);
            pdf.text(String(spNum), xNum + wNum / 2, rowY + rowH * 0.68, { align: 'center' });
          }

          rowY += rowH;
        }
      }

      // Section boundary bottom line
      if (!isLastSection) {
        pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        pdf.setLineWidth(sectionBorderWidth);
        pdf.line(colStartX, secEndY, colStartX + colW, secEndY);
      }
      currentY = secEndY;
    });
  };

  // Render Left and Right Columns with spare padding so both columns perfectly hit notesY
  const leftSpare = totalGridRows - leftCount;
  const rightSpare = totalGridRows - rightCount;
  renderColumn(docData.leftSections, xColLeft, leftSpare);
  renderColumn(docData.rightSections, xColRight, rightSpare);

  // --- 4. NOTES TABLE: EXACTLY 5 FIXED ROWS (Y: 246.0 -> 268.0) ---
  const badgeNotesW = 5.2;
  const noteRowH = notesH / 5; // Exactly 4.4mm per row

  // Vertical NOTAS Badge
  pdf.setFillColor(grayFill[0], grayFill[1], grayFill[2]);
  pdf.rect(marginX, notesY, badgeNotesW, notesH, 'F');
  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setLineWidth(sectionBorderWidth);
  pdf.line(marginX + badgeNotesW, notesY, marginX + badgeNotesW, notesY + notesH);

  // Exact vertical NOTAS text
  drawVerticalBadgeText(pdf, 'NOTAS', marginX, notesY, badgeNotesW, notesH, 6.5, black);

  // 5 Fixed Note Rows
  const xNoteNum = marginX + badgeNotesW; // 12.2mm
  const wNoteNum = 8.5; // 8.5mm
  const xNoteText = xNoteNum + wNoteNum; // 20.7mm

  // Continuous vertical line dividing number from note text
  vLine(xNoteText, notesY, notesY + notesH);
  majorHLine(marginX, marginX + sheetW, approvalsY);

  for (let i = 0; i < 5; i++) {
    const rowTopY = notesY + i * noteRowH;
    if (i > 0) {
      hLine(xNoteNum, marginX + sheetW, rowTopY);
    }

    const note = docData.notes[i];
    const noteNum = note?.num ?? 900 + i;
    const noteContent = note?.text ?? '';

    // Number (900) centered vertically and horizontally
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(black[0], black[1], black[2]);
    pdf.text(`(${noteNum})`, xNoteNum + wNoteNum / 2, rowTopY + noteRowH * 0.68, { align: 'center' });

    // Note Text
    if (noteContent) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.4);
      pdf.setTextColor(black[0], black[1], black[2]);
      pdf.text(truncate(noteContent, 125), xNoteText + 2, rowTopY + noteRowH * 0.68);
    }
  }

  // --- 5. APPROVALS FOOTER (Y: 268.0 -> 290.5) ---
  const colApprW = sheetW / 4; // 49.0mm each
  vLine(marginX + colApprW, approvalsY, sheetBottomY);
  vLine(marginX + colApprW * 2, approvalsY, sheetBottomY);
  vLine(marginX + colApprW * 3, approvalsY, sheetBottomY);

  const approvalsList = docData.approvals && docData.approvals.length > 0
    ? docData.approvals
    : [
        { role: 'PREPARED BY', name: '', signatureDate: '' },
        { role: 'CHECKED BY', name: '', signatureDate: '' },
        { role: 'APPROVED BY', name: '', signatureDate: '' },
        { role: 'CLIENT APPROVAL', name: '', signatureDate: '' },
      ];

  approvalsList.slice(0, 4).forEach((appr, idx) => {
    const boxX = marginX + idx * colApprW;
    // Role & Date
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.6);
    pdf.setTextColor(black[0], black[1], black[2]);
    pdf.text(appr.role, boxX + 2, approvalsY + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.6);
    pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
    pdf.text(appr.signatureDate || '', boxX + colApprW - 2.5, approvalsY + 4.5, { align: 'right' });

    // Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(black[0], black[1], black[2]);
    pdf.text(truncate(appr.name, 28), boxX + 2, approvalsY + 11.5);

    // Company
    if (appr.company) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5.4);
      pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
      pdf.text(truncate(appr.company, 30), boxX + 2, approvalsY + 16.5);
    }
  });

  // Save the vector PDF
  const cleanName = fileName ? (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`) : `${docData.header.tag || 'datasheet'}_ISA20.pdf`;
  pdf.save(cleanName);
}
