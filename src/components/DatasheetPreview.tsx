import React, { useLayoutEffect, useRef } from 'react';
import { DatasheetDocument, SectionBlock, PageDensity } from '../types/datasheet';

interface DatasheetPreviewProps {
  document: DatasheetDocument;
  onUpdateDocument: (doc: DatasheetDocument) => void;
  scale?: number;
  inlineEdit?: boolean;
  /** Reports whether the real rendered content is clipped (columns taller than the page). */
  onFitChange?: (overflowing: boolean) => void;
}

// Row geometry per density (px at 96dpi). Shared with the page-budget estimator.
export const DENSITY_ROW: Record<PageDensity, { minH: number; padY: number }> = {
  'ultra-compact': { minH: 12, padY: 0.5 },
  compact: { minH: 14, padY: 1.5 },
  standard: { minH: 17, padY: 2.5 },
};

export const DatasheetPreview: React.FC<DatasheetPreviewProps> = ({
  document: doc,
  onUpdateDocument,
  scale = 1,
  inlineEdit = false,
  onFitChange,
}) => {
  const columnsRef = useRef<HTMLDivElement>(null);
  const density = DENSITY_ROW[doc.density] ?? DENSITY_ROW.compact;

  // Measure the REAL layout: the columns area clips (overflow-hidden) when content is too tall.
  useLayoutEffect(() => {
    const body = columnsRef.current;
    if (!body || !onFitChange) return;
    const overflowing = [...body.children].some(
      (col) => (col as HTMLElement).scrollHeight > (col as HTMLElement).clientHeight + 1
    );
    onFitChange(overflowing);
  });

  // Helpers for direct inline editing
  const updateHeader = (field: keyof typeof doc.header, value: string) => {
    onUpdateDocument({
      ...doc,
      header: {
        ...doc.header,
        [field]: value,
      },
    });
  };

  const updateSections = (
    column: 'left' | 'right',
    sectionIndex: number,
    updater: (sec: SectionBlock) => SectionBlock
  ) => {
    const key = column === 'left' ? 'leftSections' : 'rightSections';
    onUpdateDocument({
      ...doc,
      [key]: doc[key].map((sec, i) => (i === sectionIndex ? updater(sec) : sec)),
    });
  };

  const updateRowValue = (
    column: 'left' | 'right',
    sectionIndex: number,
    rowIndex: number,
    newValue: string
  ) => {
    updateSections(column, sectionIndex, (sec) => ({
      ...sec,
      rows: sec.rows.map((r, i) => (i === rowIndex ? { ...r, value: newValue } : r)),
    }));
  };

  const updateScenarioValue = (
    column: 'left' | 'right',
    sectionIndex: number,
    scenarioIndex: number,
    field: 'min' | 'norm' | 'max',
    newValue: string
  ) => {
    updateSections(column, sectionIndex, (sec) => ({
      ...sec,
      scenarios: sec.scenarios?.map((sc, i) =>
        i === scenarioIndex ? { ...sc, [field]: newValue } : sc
      ),
    }));
  };

  const updateNoteText = (noteIndex: number, text: string) => {
    const newNotes = [...doc.notes];
    while (newNotes.length <= noteIndex) {
      newNotes.push({ num: 900 + newNotes.length, text: '' });
    }
    newNotes[noteIndex] = { ...newNotes[noteIndex], text };
    onUpdateDocument({ ...doc, notes: newNotes });
  };

  // Fixed 5 notes rows configuration
  const fixedNoteRows = [0, 1, 2, 3, 4].map((idx) => {
    const existing = doc.notes[idx];
    return {
      num: existing?.num ?? 900 + idx,
      text: existing?.text ?? '',
    };
  });

  return (
    <div
      className="sheet-scale-wrapper"
      style={{
        width: `calc(196mm * ${scale})`,
        height: `calc(284mm * ${scale})`,
        margin: '0 auto',
        flexShrink: 0,
      }}
    >
     <div
      className="sheet-scale-inner"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '196mm' }}
     >
      {/* Exactly A4 Dimensions: 210mm x 297mm (Container 196mm x 284mm with 7mm margins) */}
      <div
        id="datasheet-a4-canvas"
        className="print-page-container bg-white text-black shadow-2xl relative select-text"
        style={{
          width: '196mm',
          height: '284mm',
          maxWidth: '196mm',
          maxHeight: '284mm',
          border: '0.68mm solid #000000',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          wordSpacing: '0.04em',
        }}
      >
        {/* 1. TOP HEADER TABLE (Height: ~37mm) */}
        <div className="w-full border-b border-neutral-500 text-[7pt] leading-tight shrink-0 bg-white">
          {/* Row 1: Logo/Company, Title, Tag & Sheet */}
          <div className="flex border-b border-neutral-500">
            {/* Company / Logo */}
            <div className="w-[30%] p-1.5 border-r border-neutral-500 flex flex-col justify-center items-center text-center bg-neutral-50/60">
              <span className="font-extrabold text-[8.5pt] uppercase text-black">
                {doc.header.companyName}
              </span>
              <span className="text-[5.5pt] text-neutral-600 uppercase font-semibold mt-0.5">
                Instrumentation &amp; Control Engineering
              </span>
            </div>

            {/* Document Title */}
            <div className="w-[45%] p-1.5 border-r border-neutral-500 flex flex-col justify-center items-center text-center">
              <span className="text-[6.2pt] uppercase font-bold text-neutral-700">
                {doc.header.standard}
              </span>
              <span className="text-[9.5pt] font-black uppercase text-black my-0.5">
                {doc.header.documentTitle}
              </span>
              <span className="text-[6.7pt] font-bold text-neutral-800">
                {doc.header.equipmentType}
              </span>
            </div>

            {/* Tag & Sheet */}
            <div className="w-[25%] p-1 flex flex-col justify-between">
              <div className="text-center pb-0.5 border-b border-neutral-300">
                <div className="text-[5.5pt] uppercase text-neutral-600 font-bold">TAG NO.</div>
                <div className="text-[9.5pt] font-black text-black">
                  {doc.header.tag}
                </div>
              </div>
              <div className="flex text-[6.2pt] justify-between px-1.5 pt-0.5">
                <span>
                  <strong className="text-neutral-700 font-bold">REV: </strong>
                  <span className="font-bold">{doc.header.revision}</span>
                </span>
                <span>
                  <strong className="text-neutral-700 font-bold">HOJA: </strong>
                  <span className="font-bold">{doc.header.sheet}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Project, Location, Function, Date & Status */}
          <div className="grid grid-cols-12 text-[6.5pt] border-b border-neutral-500 divide-x divide-neutral-500 bg-neutral-50/30">
            <div className="col-span-4 px-1.5 py-1">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">PROYECTO:</span>
              <span className="font-bold text-black text-[6.7pt]">{doc.header.project}</span>
            </div>
            <div className="col-span-4 px-1.5 py-1">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">SERVICIO / FUNCIÓN:</span>
              <span className="font-bold text-black text-[6.7pt]">{doc.header.equipmentFunction}</span>
            </div>
            <div className="col-span-2 px-1 py-1 text-center">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">FECHA:</span>
              <span className="font-bold text-black">{doc.header.date}</span>
            </div>
            <div className="col-span-2 px-1 py-1 text-center">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">ESTADO:</span>
              <span className="font-bold text-[6pt] uppercase text-black">{doc.header.status}</span>
            </div>
          </div>

          {/* Row 3: P&ID, Line No, PO No, Location */}
          <div className="grid grid-cols-12 text-[6.2pt] divide-x divide-neutral-500 bg-white">
            <div className="col-span-3 px-1.5 py-0.5">
              <span className="text-neutral-600 font-semibold mr-1">P&amp;ID REF:</span>
              <span className="font-bold text-black">{doc.header.pidRef}</span>
            </div>
            <div className="col-span-3 px-1.5 py-0.5">
              <span className="text-neutral-600 font-semibold mr-1">LÍNEA:</span>
              <span className="font-bold text-black">{doc.header.lineNo}</span>
            </div>
            <div className="col-span-3 px-1.5 py-0.5">
              <span className="text-neutral-600 font-semibold mr-1">UBICACIÓN:</span>
              <span className="font-bold text-black">{doc.header.location}</span>
            </div>
            <div className="col-span-3 px-1.5 py-0.5">
              <span className="text-neutral-600 font-semibold mr-1">O. COMPRA:</span>
              <span className="font-bold text-black">{doc.header.poNo}</span>
            </div>
          </div>
        </div>

        {/* 2. MAIN BODY: 2 SYMMETRICAL COLUMNS (Fills all available height down to Notes) */}
        <div ref={columnsRef} className="flex flex-1 min-h-0 w-full border-b-[0.5px] border-neutral-500 overflow-hidden">
          {/* LEFT COLUMN */}
          <div className="w-1/2 min-w-0 border-r-[0.5px] border-neutral-500 flex flex-col justify-start divide-y divide-neutral-500">
            {doc.leftSections.map((sec, secIdx) => (
              <RenderSection
                key={sec.id || `left-${secIdx}`}
                section={sec}
                inlineEdit={inlineEdit}
                density={density}
                onUpdateRow={(rIdx, val) => updateRowValue('left', secIdx, rIdx, val)}
                onUpdateScenario={(scenIdx, field, val) =>
                  updateScenarioValue('left', secIdx, scenIdx, field, val)
                }
              />
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-1/2 min-w-0 flex flex-col justify-start divide-y divide-neutral-500">
            {doc.rightSections.map((sec, secIdx) => (
              <RenderSection
                key={sec.id || `right-${secIdx}`}
                section={sec}
                inlineEdit={inlineEdit}
                density={density}
                onUpdateRow={(rIdx, val) => updateRowValue('right', secIdx, rIdx, val)}
                onUpdateScenario={(scenIdx, field, val) =>
                  updateScenarioValue('right', secIdx, scenIdx, field, val)
                }
              />
            ))}
          </div>
        </div>

        {/* 3. BOTTOM SECTION: EXACTLY 5 FIXED ROWS OF NOTES */}
        <div
          className="w-full flex border-b-[0.5px] border-neutral-500 shrink-0 bg-white"
          style={{ height: '78px', maxHeight: '78px', minHeight: '78px' }}
        >
          {/* Vertical NOTAS label on left edge */}
          <div className="w-[18px] bg-neutral-100 border-r border-neutral-500 flex items-center justify-center p-0.5 select-none shrink-0">
            <span className="writing-mode-vertical text-[6.5pt] font-black tracking-widest text-neutral-900 uppercase">
              NOTAS
            </span>
          </div>

          {/* The 5 Fixed Note Rows */}
          <div className="flex-1 flex flex-col divide-y divide-neutral-200">
            {fixedNoteRows.map((note, nIdx) => (
              <div
                key={nIdx}
                className="flex items-center px-2 text-[6.7pt] leading-tight"
                style={{ height: '15.6px', minHeight: '15.6px' }}
              >
                {/* Note Number */}
                <span className="w-[28px] text-neutral-900 font-bold font-mono shrink-0">
                  ({note.num})
                </span>

                {/* Note Text */}
                <div className="flex-1 text-neutral-800 font-medium truncate">
                  {inlineEdit ? (
                    <input
                      type="text"
                      value={note.text}
                      placeholder={`Nota ${note.num}...`}
                      onChange={(e) => updateNoteText(nIdx, e.target.value)}
                      className="w-full bg-transparent border-b border-dashed border-neutral-400 text-[6.7pt] focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span title={note.text}>{note.text}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. FOOTER: APPROVAL SIGNATURES BLOCK (Height: ~26px) */}
        {doc.approvals && doc.approvals.length > 0 && (
          <div className="w-full grid grid-cols-4 divide-x divide-neutral-500 text-[5.8pt] leading-tight bg-neutral-50 shrink-0 h-[26px]">
            {doc.approvals.map((appr, aIdx) => (
              <div key={aIdx} className="px-1.5 py-0.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-neutral-600">
                  <span className="font-bold uppercase text-black text-[5.5pt]">
                    {appr.role}
                  </span>
                  <span className="text-neutral-700 font-medium">{appr.signatureDate}</span>
                </div>
                <div className="flex justify-between items-baseline font-bold text-neutral-900">
                  <span className="truncate text-black">{appr.name}</span>
                  {appr.company && (
                    <span className="text-[5pt] text-neutral-500 font-normal ml-1">
                      {appr.company}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
     </div>
    </div>
  );
};

// Sub-component to render a section with vertical label
interface RenderSectionProps {
  section: SectionBlock;
  density: { minH: number; padY: number };
  inlineEdit: boolean;
  onUpdateRow: (rowIndex: number, val: string) => void;
  onUpdateScenario: (scenarioIndex: number, field: 'min' | 'norm' | 'max', val: string) => void;
}

const RenderSection: React.FC<RenderSectionProps> = ({
  section,
  density,
  inlineEdit,
  onUpdateRow,
  onUpdateScenario,
}) => {
  return (
    <div className="flex w-full min-w-0 flex-grow-0">
      {/* Vertical Section Label on left edge */}
      <div className="w-[18px] bg-neutral-100 border-r border-neutral-500 flex items-center justify-center p-0.5 select-none shrink-0">
        <span className="writing-mode-vertical text-[6.5pt] font-black tracking-widest text-neutral-900 text-center uppercase">
          {section.name}
        </span>
      </div>

      {/* Rows Container */}
      <div className="flex-1 min-w-0 flex flex-col divide-y divide-neutral-200">
        {/* Optional Scenario Table (Min / Norm / Max) */}
        {section.isScenarioTable && section.scenarios && section.scenarios.length > 0 && (
          <div className="w-full flex flex-col">
            {/* Scenario Header */}
            <div className="flex px-[3px] bg-neutral-100 border-b border-neutral-300 text-[5.6pt] font-black uppercase text-neutral-800">
              <div className="w-[20px] text-center shrink-0">#</div>
              <div className="flex-1 min-w-0 px-1.5 border-l border-neutral-200">CONDICIÓN DE PROCESO</div>
              <div className="w-[28px] text-center border-l border-neutral-200 shrink-0" />
              <div className="w-[48%] shrink-0 flex border-l border-neutral-200">
                <div className="flex-1 min-w-0 text-center">MÍN</div>
                <div className="flex-1 min-w-0 text-center border-l border-neutral-200 bg-neutral-200/60 font-black">NORM</div>
                <div className="flex-1 min-w-0 text-center border-l border-neutral-200">MÁX</div>
              </div>
            </div>

            {/* Scenario Rows */}
            {section.scenarios.map((scen, sIdx) => (
              <div
                key={sIdx}
                className="flex items-center px-[3px] text-[6.6pt] border-b border-neutral-100 last:border-b-0"
                style={{ minHeight: density.minH, paddingTop: density.padY, paddingBottom: density.padY }}
              >
                <div className="w-[20px] text-right pr-1 text-neutral-500 font-mono text-[5.8pt] shrink-0 font-medium">
                  {scen.num}
                </div>
                <div className="flex-1 min-w-0 self-stretch flex items-center px-1.5 font-semibold text-neutral-900 break-words border-l border-neutral-200 text-[6.7pt] leading-[1.15]">
                  {scen.label}
                </div>
                <div className="w-[28px] shrink-0 text-center text-[5.8pt] text-neutral-600 font-mono border-l border-neutral-200">
                  {scen.unit}
                </div>
                <div className="w-[48%] shrink-0 self-stretch flex border-l border-neutral-200">
                  <div className="flex-1 min-w-0 flex items-center justify-center">
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={scen.min}
                        onChange={(e) => onUpdateScenario(sIdx, 'min', e.target.value)}
                        className="w-full text-center bg-transparent text-[6pt] focus:bg-blue-50 focus:outline-none"
                      />
                    ) : (
                      <span className="text-neutral-800 font-mono font-medium">{scen.min}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-center border-l border-neutral-200 font-bold bg-neutral-50">
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={scen.norm}
                        onChange={(e) => onUpdateScenario(sIdx, 'norm', e.target.value)}
                        className="w-full text-center bg-transparent font-bold text-[6.6pt] focus:bg-blue-50 focus:outline-none"
                      />
                    ) : (
                      <span className="text-black font-mono font-bold">{scen.norm}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-center border-l border-neutral-200">
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={scen.max}
                        onChange={(e) => onUpdateScenario(sIdx, 'max', e.target.value)}
                        className="w-full text-center bg-transparent text-[6pt] focus:bg-blue-50 focus:outline-none"
                      />
                    ) : (
                      <span className="text-neutral-800 font-mono font-medium">{scen.max}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Regular Property Rows */}
        {section.rows.map((row, rIdx) => (
          <div
            key={rIdx}
            className="flex items-center px-[3px] hover:bg-neutral-50"
            style={{ minHeight: density.minH, paddingTop: density.padY, paddingBottom: density.padY }}
          >
            {/* Row Number */}
            <span className="w-[20px] text-right pr-1 text-neutral-500 font-mono text-[5.8pt] shrink-0 font-medium">
              {row.num}
            </span>

            {/* Parameter Label */}
            <span className="flex-1 min-w-0 self-stretch flex items-center px-1.5 font-semibold text-neutral-800 break-words border-l border-neutral-200 text-[6.7pt] leading-[1.15]">
              {row.label}
            </span>

            {/* Unit Column (always consistent) */}
            <span className="w-[28px] text-center text-neutral-600 font-mono text-[5.8pt] border-l border-neutral-200 shrink-0">
              {row.unit || ''}
            </span>

            {/* Value Column */}
            <div className="w-[48%] shrink-0 min-w-0 self-stretch flex items-center px-1.5 text-left font-bold text-black border-l border-neutral-200 break-words text-[7.2pt] leading-[1.15]">
              {inlineEdit ? (
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => onUpdateRow(rIdx, e.target.value)}
                  className="w-full min-w-0 bg-transparent font-bold focus:bg-blue-50 focus:outline-none px-0.5"
                />
              ) : (
                <span>{row.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
