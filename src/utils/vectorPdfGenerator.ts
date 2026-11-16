import jsPDF from 'jspdf';
import { DatasheetDocument, SectionBlock } from '../types/datasheet';

type RGB = readonly [number, number, number];
type Seg = readonly [number, number, number, number];
type Weight = 'thin' | 'mid' | 'thick';

const PT_MM = 25.4 / 72; // 1 pt en mm
const CAP = 0.718; // altura de mayúscula Helvetica

// Jerarquía de bordes: se dibujan en este orden, así el más grueso queda siempre al frente
const W_THIN = 0.12; // grilla de filas y celdas
const W_MID = 0.25; // separadores de sección y subdivisiones de cabecera
const W_THICK = 0.55; // borde exterior y límites de apartados mayores

const BLACK: RGB = [0, 0, 0];
const GRAY_TEXT: RGB = [90, 90, 90];
const GRAY_FILL: RGB = [242, 244, 246];

/** jsPDF con fuentes estándar solo codifica Latin-1: normalizamos lo demás. */
function clean(s: unknown): string {
  const t = (s == null ? '' : String(s))
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/[\u03A9\u2126]/g, 'ohm')
    .replace(/\u00A0/g, ' ');
  return t.replace(/[^\u0000-\u00FF]/g, '?');
}

function truncateToWidth(pdf: jsPDF, text: string, maxW: number): string {
  if (pdf.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && pdf.getTextWidth(t + '...') > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '...';
}

interface CellOpts {
  size: number;
  color: RGB;
  bold?: boolean;
  align?: 'left' | 'center';
}

/**
 * Dibuja texto dentro de una celda (top, h), centrado verticalmente.
 * Si no entra: reduce la fuente (hasta 78%), luego parte en 2 líneas si hay alto, y como último recurso trunca.
 */
function drawCell(
  pdf: jsPDF,
  raw: unknown,
  x: number,
  top: number,
  h: number,
  maxW: number,
  o: CellOpts
): void {
  const text = clean(raw);
  if (!text) return;
  pdf.setFont('helvetica', o.bold ? 'bold' : 'normal');

  let size = o.size;
  const minSize = o.size * 0.78;
  pdf.setFontSize(size);
  while (pdf.getTextWidth(text) > maxW && size > minSize) {
    size = Math.max(minSize, size - 0.2);
    pdf.setFontSize(size);
  }

  let lines = [text];
  if (pdf.getTextWidth(text) > maxW) {
    const lineH = size * PT_MM * 1.18;
    const wrapped = pdf.splitTextToSize(text, maxW) as string[];
    if (wrapped.length >= 2 && lineH * 2 <= h - 0.4) {
      lines = wrapped.slice(0, 2);
      if (wrapped.length > 2) lines[1] = wrapped.slice(1).join(' ');
    }
    lines = lines.map((l) => truncateToWidth(pdf, l, maxW));
  }

  const cap = size * PT_MM * CAP;
  const lineH = size * PT_MM * 1.18;
  const block = cap + (lines.length - 1) * lineH;
  let y = top + h / 2 - block / 2 + cap;

  pdf.setTextColor(o.color[0], o.color[1], o.color[2]);
  for (const l of lines) {
    if (o.align === 'center') pdf.text(l, x, y, { align: 'center' });
    else pdf.text(l, x, y);
    y += lineH;
  }
}

/** Texto vertical (lee de abajo hacia arriba) centrado en un badge. */
function drawVerticalBadgeText(
  pdf: jsPDF,
  raw: string,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  baseSize = 6.2
): void {
  let txt = clean(raw).toUpperCase();
  pdf.setFont('helvetica', 'bold');
  const maxW = Math.max(8, bh - 3);
  let size = baseSize;
  pdf.setFontSize(size);
  while (pdf.getTextWidth(txt) > maxW && size > baseSize * 0.75) {
    size -= 0.2;
    pdf.setFontSize(size);
  }
  txt = truncateToWidth(pdf, txt, maxW);
  const textW = pdf.getTextWidth(txt);
  const cap = size * PT_MM * CAP;
  pdf.setTextColor(0, 0, 0);
  pdf.text(txt, bx + (bw + cap) / 2, by + bh / 2 + textW / 2, { angle: 90 });
}

/**
 * PDF 100% vectorial, con texto seleccionable/copiable, en exactamente 1 página A4.
 * Los bordes se acumulan por grosor y se dibujan al final (fino -> medio -> grueso),
 * por eso los gruesos siempre quedan por encima de los finos.
 */
export function exportVectorPdf(docData: DatasheetDocument, fileName?: string): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: `${docData.header.tag} - ${docData.header.documentTitle}`,
    subject: 'ISA-TR20.00.01 / ISA-20 Datasheet',
  });

  // Geometría A4 (210 x 297)
  const marginX = 7.0;
  const marginY = 6.5;
  const sheetW = 196.0;
  const sheetH = 284.0;
  const left = marginX;
  const right = marginX + sheetW;
  const sheetBottomY = marginY + sheetH;

  const headerH = 35.0;
  const notesH = 22.0;
  const approvalsH = 22.5;
  const columnsH = sheetH - headerH - notesH - approvalsH;

  const topY = marginY;
  const columnsY = topY + headerH;
  const notesY = columnsY + columnsH;
  const approvalsY = notesY + notesH;

  // ---- Cola de líneas (se dibujan al final, por grosor) ----
  const queue: Record<Weight, Seg[]> = { thin: [], mid: [], thick: [] };
  const H = (w: Weight, x1: number, x2: number, y: number) => queue[w].push([x1, y, x2, y]);
  const V = (w: Weight, x: number, y1: number, y2: number) => queue[w].push([x, y1, x, y2]);

  const fillRect = (x: number, y: number, w: number, h: number, c: RGB) => {
    pdf.setFillColor(c[0], c[1], c[2]);
    pdf.rect(x, y, w, h, 'F');
  };

  // ================= 1. CABECERA =================
  const hRow1H = 16.0;
  const hRow2H = 10.0;
  const hRow3H = 9.0;
  const r2Y = topY + hRow1H;
  const r3Y = r2Y + hRow2H;

  H('mid', left, right, r2Y);
  H('mid', left, right, r3Y);
  H('thick', left, right, columnsY);

  const wComp = sheetW * 0.3;
  const wTitle = sheetW * 0.45;
  const wTag = sheetW * 0.25;
  const xTitle = left + wComp;
  const xTag = xTitle + wTitle;
  V('mid', xTitle, topY, r2Y);
  V('mid', xTag, topY, r2Y);

  // Empresa
  fillRect(left, topY, wComp, hRow1H, GRAY_FILL);
  drawCell(pdf, docData.header.companyName, left + wComp / 2, topY + 1.5, 8, wComp - 4, {
    size: 8.5, bold: true, color: BLACK, align: 'center',
  });
  drawCell(pdf, 'Instrumentation & Control Engineering', left + wComp / 2, topY + 9.5, 4.5, wComp - 4, {
    size: 5.5, color: GRAY_TEXT, align: 'center',
  });

  // Título
  drawCell(pdf, docData.header.standard || 'ISA-TR20.00.01 / ISA-20', xTitle + wTitle / 2, topY + 1, 4.2, wTitle - 4, {
    size: 6.2, bold: true, color: GRAY_TEXT, align: 'center',
  });
  drawCell(pdf, docData.header.documentTitle, xTitle + wTitle / 2, topY + 5.2, 5.4, wTitle - 4, {
    size: 9.5, bold: true, color: BLACK, align: 'center',
  });
  drawCell(pdf, docData.header.equipmentType, xTitle + wTitle / 2, topY + 10.6, 4.6, wTitle - 4, {
    size: 6.8, bold: true, color: BLACK, align: 'center',
  });

  // Tag / Rev / Hoja
  drawCell(pdf, 'TAG NO.', xTag + wTag / 2, topY + 0.8, 3.4, wTag - 4, {
    size: 5.5, bold: true, color: GRAY_TEXT, align: 'center',
  });
  drawCell(pdf, docData.header.tag, xTag + wTag / 2, topY + 4.2, 6.4, wTag - 4, {
    size: 9.5, bold: true, color: BLACK, align: 'center',
  });
  H('thin', xTag, right, topY + 10.8);
  drawCell(pdf, `REV: ${docData.header.revision || '0'}`, xTag + 2, topY + 10.8, 5.2, wTag / 2 - 3, {
    size: 6.2, bold: true, color: BLACK,
  });
  drawCell(pdf, `HOJA: ${docData.header.sheet || '1 / 1'}`, xTag + wTag / 2 + 2, topY + 10.8, 5.2, wTag / 2 - 3, {
    size: 6.2, bold: true, color: BLACK,
  });

  // Fila 2
  const c1 = sheetW * 0.333;
  const c2 = sheetW * 0.333;
  const c3 = sheetW * 0.167;
  const c4 = sheetW - c1 - c2 - c3;
  const x2 = left + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;
  V('thin', x2, r2Y, r3Y);
  V('thin', x3, r2Y, r3Y);
  V('thin', x4, r2Y, r3Y);

  const r2Cell = (x: number, w: number, label: string, value: string, center: boolean, vSize: number) => {
    const cx = center ? x + w / 2 : x + 2;
    const al = center ? 'center' : 'left';
    drawCell(pdf, label, cx, r2Y + 0.6, 3.4, w - 4, { size: 5.4, bold: true, color: GRAY_TEXT, align: al });
    drawCell(pdf, value, cx, r2Y + 4, 5.4, w - 4, { size: vSize, bold: true, color: BLACK, align: al });
  };
  r2Cell(left, c1, 'PROYECTO:', docData.header.project, false, 6.6);
  r2Cell(x2, c2, 'SERVICIO / FUNCIÓN:', docData.header.equipmentFunction, false, 6.6);
  r2Cell(x3, c3, 'FECHA:', docData.header.date, true, 6.5);
  r2Cell(x4, c4, 'ESTADO:', docData.header.status, true, 5.9);

  // Fila 3
  const c3w = sheetW / 4;
  V('thin', left + c3w, r3Y, columnsY);
  V('thin', left + c3w * 2, r3Y, columnsY);
  V('thin', left + c3w * 3, r3Y, columnsY);
  const r3Field = (x: number, label: string, val: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.6);
    const lw = pdf.getTextWidth(clean(label)) + 1.2;
    drawCell(pdf, label, x + 2, r3Y, hRow3H, lw, { size: 5.6, color: GRAY_TEXT });
    drawCell(pdf, val, x + 2 + lw, r3Y, hRow3H, c3w - 4 - lw, { size: 6.2, bold: true, color: BLACK });
  };
  r3Field(left, 'P&ID REF:', docData.header.pidRef);
  r3Field(left + c3w, 'LÍNEA:', docData.header.lineNo);
  r3Field(left + c3w * 2, 'UBICACIÓN:', docData.header.location);
  r3Field(left + c3w * 3, 'O. COMPRA:', docData.header.poNo);

  // ================= 2. COLUMNAS =================
  const colW = sheetW / 2;
  const xColRight = left + colW;

  V('thick', xColRight, columnsY, notesY);
  H('thick', left, right, notesY);

  const countRows = (sections: SectionBlock[]) =>
    sections.reduce((n, s) => {
      n += s.rows.length;
      if (s.isScenarioTable && s.scenarios && s.scenarios.length > 0) n += s.scenarios.length + 1;
      return n;
    }, 0);

  const leftCount = countRows(docData.leftSections);
  const rightCount = countRows(docData.rightSections);
  const totalGridRows = Math.max(leftCount, rightCount, 28);
  const rowH = columnsH / totalGridRows;

  const renderColumn = (sections: SectionBlock[], colX: number, spare: number) => {
    if (sections.length === 0) return;

    const badgeW = 5.2;
    const tableW = colW - badgeW;
    const tx = colX + badgeW;
    const xEnd = colX + colW;

    // Mismas columnas para TODAS las secciones (incluida Conditions)
    const wNum = 6.0;
    const wLabel = 43.0;
    const wUnit = 7.5;
    const wVal = tableW - wNum - wLabel - wUnit;
    const xNum = tx;
    const xLabel = xNum + wNum;
    const xUnit = xLabel + wLabel;
    const xVal = xUnit + wUnit;
    const wS = wVal / 3; // MÍN / NORM / MÁX reparten la columna de valor
    const xS1 = xVal + wS;
    const xS2 = xVal + wS * 2;

    let y = columnsY;

    sections.forEach((sec, sIdx) => {
      const isLast = sIdx === sections.length - 1;
      const hasScen = !!(sec.isScenarioTable && sec.scenarios && sec.scenarios.length > 0);
      const scenRows = hasScen ? sec.scenarios!.length + 1 : 0;
      const rowsCount = scenRows + sec.rows.length + (isLast ? spare : 0);
      const secEnd = isLast ? notesY : y + rowsCount * rowH;

      // Badge vertical
      fillRect(colX, y, badgeW, secEnd - y, GRAY_FILL);
      drawVerticalBadgeText(pdf, sec.name, colX, y, badgeW, secEnd - y, 6.2);
      V('mid', xNum, y, secEnd);

      // Separador de sección (medio) y divisiones de columnas (finas), continuas
      if (!isLast) H('mid', colX, xEnd, secEnd);
      V('thin', xLabel, y, secEnd);
      V('thin', xUnit, y, secEnd);
      V('thin', xVal, y, secEnd);

      let rowY = y;

      // ---- Tabla de escenarios (alineada con el resto: # | etiqueta | unidad | MÍN NORM MÁX) ----
      if (hasScen) {
        // Encabezado: la columna de unidad queda SIN encabezado
        fillRect(tx, rowY, tableW, rowH, GRAY_FILL);
        const hdr = (t: string, cx: number, w: number) =>
          drawCell(pdf, t, cx, rowY, rowH, w - 1, { size: 5.3, bold: true, color: BLACK, align: 'center' });
        hdr('#', xNum + wNum / 2, wNum);
        drawCell(pdf, 'CONDICIÓN DE PROCESO', xLabel + 1.5, rowY, rowH, wLabel - 2.5, {
          size: 5.3, bold: true, color: BLACK,
        });
        hdr('MÍN', xVal + wS / 2, wS);
        hdr('NORM', xS1 + wS / 2, wS);
        hdr('MÁX', xS2 + wS / 2, wS);
        H('thin', tx, xEnd, rowY + rowH);
        V('thin', xS1, y, y + scenRows * rowH);
        V('thin', xS2, y, y + scenRows * rowH);
        rowY += rowH;

        sec.scenarios!.forEach((sc) => {
          fillRect(xS1, rowY, wS, rowH, [248, 248, 248]);
          H('thin', tx, xEnd, rowY + rowH);

          drawCell(pdf, sc.num, xNum + wNum / 2, rowY, rowH, wNum - 1, {
            size: 5.6, color: GRAY_TEXT, align: 'center',
          });
          drawCell(pdf, sc.label, xLabel + 1.5, rowY, rowH, wLabel - 2.5, { size: 6.4, bold: true, color: BLACK });
          drawCell(pdf, sc.unit, xUnit + wUnit / 2, rowY, rowH, wUnit - 1, {
            size: 5.5, color: GRAY_TEXT, align: 'center',
          });
          drawCell(pdf, sc.min || '-', xVal + wS / 2, rowY, rowH, wS - 1.2, { size: 6.2, color: BLACK, align: 'center' });
          drawCell(pdf, sc.norm || '-', xS1 + wS / 2, rowY, rowH, wS - 1.2, {
            size: 6.2, bold: true, color: BLACK, align: 'center',
          });
          drawCell(pdf, sc.max || '-', xS2 + wS / 2, rowY, rowH, wS - 1.2, { size: 6.2, color: BLACK, align: 'center' });
          rowY += rowH;
        });
      }

      // ---- Filas normales ----
      sec.rows.forEach((row) => {
        H('thin', tx, xEnd, rowY + rowH);
        drawCell(pdf, row.num, xNum + wNum / 2, rowY, rowH, wNum - 1, {
          size: 5.6, color: GRAY_TEXT, align: 'center',
        });
        drawCell(pdf, row.label, xLabel + 1.5, rowY, rowH, wLabel - 2.5, { size: 6.4, bold: true, color: BLACK });
        drawCell(pdf, row.unit || '', xUnit + wUnit / 2, rowY, rowH, wUnit - 1, {
          size: 5.5, color: GRAY_TEXT, align: 'center',
        });
        drawCell(pdf, row.value, xVal + 1.5, rowY, rowH, wVal - 2.5, { size: 6.7, bold: true, color: BLACK });
        rowY += rowH;
      });

      // ---- Filas vacías para cerrar la grilla en la última sección ----
      if (isLast) {
        for (let i = 0; i < spare; i++) {
          H('thin', tx, xEnd, rowY + rowH);
          rowY += rowH;
        }
      }

      y = secEnd;
    });
  };

  renderColumn(docData.leftSections, left, totalGridRows - leftCount);
  renderColumn(docData.rightSections, xColRight, totalGridRows - rightCount);

  // ================= 3. NOTAS (5 filas fijas) =================
  const badgeNotesW = 5.2;
  const noteRowH = notesH / 5;
  const xNoteNum = left + badgeNotesW;
  const wNoteNum = 8.5;
  const xNoteText = xNoteNum + wNoteNum;

  fillRect(left, notesY, badgeNotesW, notesH, GRAY_FILL);
  drawVerticalBadgeText(pdf, 'NOTAS', left, notesY, badgeNotesW, notesH, 6.5);
  V('mid', xNoteNum, notesY, approvalsY);
  V('thin', xNoteText, notesY, approvalsY);
  H('thick', left, right, approvalsY);

  for (let i = 0; i < 5; i++) {
    const rowTop = notesY + i * noteRowH;
    if (i > 0) H('thin', xNoteNum, right, rowTop);
    const note = docData.notes[i];
    drawCell(pdf, `(${note?.num ?? 900 + i})`, xNoteNum + wNoteNum / 2, rowTop, noteRowH, wNoteNum - 1, {
      size: 6.5, bold: true, color: BLACK, align: 'center',
    });
    if (note?.text) {
      drawCell(pdf, note.text, xNoteText + 2, rowTop, noteRowH, right - xNoteText - 3.5, { size: 6.4, color: BLACK });
    }
  }

  // ================= 4. APROBACIONES =================
  const colApprW = sheetW / 4;
  V('thin', left + colApprW, approvalsY, sheetBottomY);
  V('thin', left + colApprW * 2, approvalsY, sheetBottomY);
  V('thin', left + colApprW * 3, approvalsY, sheetBottomY);

  const approvals: { role: string; name: string; signatureDate: string; company?: string }[] =
    docData.approvals && docData.approvals.length > 0
      ? docData.approvals
      : [
          { role: 'PREPARED BY', name: '', signatureDate: '' },
          { role: 'CHECKED BY', name: '', signatureDate: '' },
          { role: 'APPROVED BY', name: '', signatureDate: '' },
          { role: 'CLIENT APPROVAL', name: '', signatureDate: '' },
        ];

  approvals.slice(0, 4).forEach((a, i) => {
    const bx = left + i * colApprW;
    drawCell(pdf, a.role, bx + 2, approvalsY + 1, 5, colApprW * 0.55 - 2.5, { size: 5.6, bold: true, color: BLACK });
    drawCell(pdf, a.signatureDate, bx + colApprW * 0.58, approvalsY + 1, 5, colApprW * 0.42 - 2.5, {
      size: 5.6, color: GRAY_TEXT,
    });
    drawCell(pdf, a.name, bx + 2, approvalsY + 7, 7, colApprW - 4, { size: 6.8, bold: true, color: BLACK });
    if (a.company) {
      drawCell(pdf, a.company, bx + 2, approvalsY + 14.5, 6, colApprW - 4, { size: 5.4, color: GRAY_TEXT });
    }
  });

  // ================= 5. BORDE EXTERIOR =================
  H('thick', left, right, marginY);
  H('thick', left, right, sheetBottomY);
  V('thick', left, marginY, sheetBottomY);
  V('thick', right, marginY, sheetBottomY);

  // ================= 6. DIBUJO DE LÍNEAS: fino -> medio -> grueso =================
  pdf.setLineJoin(0);
  const flush = (w: Weight, width: number, cap: number, color: RGB) => {
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(width);
    pdf.setLineCap(cap); // 0 = butt, 2 = projecting (esquinas limpias en las líneas gruesas)
    queue[w].forEach(([x1, y1, x2, y2]) => pdf.line(x1, y1, x2, y2));
  };
  flush('thin', W_THIN, 0, [90, 90, 90]);
  flush('mid', W_MID, 2, BLACK);
  flush('thick', W_THICK, 2, BLACK);

  const cleanName = fileName
    ? fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
    : `${docData.header.tag || 'datasheet'}_ISA20.pdf`;
  pdf.save(cleanName);
}
