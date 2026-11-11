import React from 'react';
import { DatasheetDocument, SectionBlock, DataRow, ScenarioItem } from '../types/datasheet';

interface DatasheetPreviewProps {
  document: DatasheetDocument;
  onUpdateDocument: (doc: DatasheetDocument) => void;
  scale?: number;
  inlineEdit?: boolean;
}

export const DatasheetPreview: React.FC<DatasheetPreviewProps> = ({
  document: doc,
  onUpdateDocument,
  scale = 1,
  inlineEdit = false,
}) => {
  // Helpers for direct inline editing
  const updateRowValue = (
    column: 'left' | 'right',
    sectionIndex: number,
    rowIndex: number,
    newValue: string
  ) => {
    const targetSections = column === 'left' ? [...doc.leftSections] : [...doc.rightSections];
    targetSections[sectionIndex].rows[rowIndex].value = newValue;

    if (column === 'left') {
      onUpdateDocument({ ...doc, leftSections: targetSections });
    } else {
      onUpdateDocument({ ...doc, rightSections: targetSections });
    }
  };

  const updateScenarioValue = (
    column: 'left' | 'right',
    sectionIndex: number,
    scenarioIndex: number,
    field: 'min' | 'norm' | 'max',
    newValue: string
  ) => {
    const targetSections = column === 'left' ? [...doc.leftSections] : [...doc.rightSections];
    if (targetSections[sectionIndex].scenarios) {
      targetSections[sectionIndex].scenarios![scenarioIndex][field] = newValue;
      if (column === 'left') {
        onUpdateDocument({ ...doc, leftSections: targetSections });
      } else {
        onUpdateDocument({ ...doc, rightSections: targetSections });
      }
    }
  };

  const updateNoteText = (noteIndex: number, text: string) => {
    const newNotes = [...doc.notes];
    while (newNotes.length <= noteIndex) {
      newNotes.push({ num: 900 + newNotes.length, text: '' });
    }
    newNotes[noteIndex].text = text;
    onUpdateDocument({ ...doc, notes: newNotes });
  };

  // Exactly 5 fixed rows of notes
  const fixedNoteRows = [0, 1, 2, 3, 4].map((idx) => {
    const existing = doc.notes[idx];
    return {
      num: existing?.num ?? 900 + idx,
      text: existing?.text ?? '',
    };
  });

  // Calculate row counts in left and right columns
  const countColumnRows = (sections: SectionBlock[]) => {
    let count = 0;
    sections.forEach((sec) => {
      count += sec.rows.length;
      if (sec.isScenarioTable && sec.scenarios && sec.scenarios.length > 0) {
        count += sec.scenarios.length + 1; // +1 for header
      }
    });
    return count;
  };

  const leftCount = countColumnRows(doc.leftSections);
  const rightCount = countColumnRows(doc.rightSections);
  const totalGridRows = Math.max(leftCount, rightCount, 28);
  const leftSpare = totalGridRows - leftCount;
  const rightSpare = totalGridRows - rightCount;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
      className="transition-transform duration-150 ease-out"
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
          border: '1.5px solid #000000',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          letterSpacing: '0.01em',
        }}
      >
        {/* 1. TOP HEADER TABLE */}
        <div className="w-full border-b-[1.5px] border-black text-[7pt] leading-tight shrink-0 bg-white">
          {/* Row 1: Logo/Company (30%), Title (45%), Tag & Sheet (25%) */}
          <div className="flex border-b border-black">
            {/* Company / Logo */}
            <div className="w-[30%] p-1.5 border-r border-black flex flex-col justify-center items-center text-center bg-neutral-50 overflow-hidden">
              <span className="font-extrabold text-[8.5pt] uppercase text-black leading-tight truncate max-w-full">
                {doc.header.companyName}
              </span>
              <span className="text-[5.5pt] text-neutral-600 uppercase font-semibold mt-0.5 truncate max-w-full">
                Instrumentation &amp; Control Engineering
              </span>
            </div>

            {/* Document Title */}
            <div className="w-[45%] p-1.5 border-r border-black flex flex-col justify-center items-center text-center overflow-hidden">
              <span className="text-[6.2pt] uppercase font-bold text-neutral-700 tracking-wider truncate max-w-full">
                {doc.header.standard}
              </span>
              <span className="text-[9.5pt] font-black uppercase text-black my-0.5 tracking-tight truncate max-w-full">
                {doc.header.documentTitle}
              </span>
              <span className="text-[6.7pt] font-bold text-neutral-800 truncate max-w-full">
                {doc.header.equipmentType}
              </span>
            </div>

            {/* Tag & Sheet */}
            <div className="w-[25%] p-1 flex flex-col justify-between overflow-hidden">
              <div className="text-center pb-0.5 border-b border-neutral-300">
                <div className="text-[5.5pt] uppercase text-neutral-600 font-bold">TAG NO.</div>
                <div className="text-[9.5pt] font-black text-black truncate">
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

          {/* Row 2: Project (33%), Service (33%), Date (17%), Status (17%) */}
          <div className="grid grid-cols-12 text-[6.5pt] border-b border-black divide-x divide-black bg-neutral-50/40">
            <div className="col-span-4 px-1.5 py-1 overflow-hidden">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">PROYECTO:</span>
              <span className="font-bold text-black text-[6.7pt] block truncate">{doc.header.project}</span>
            </div>
            <div className="col-span-4 px-1.5 py-1 overflow-hidden">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">SERVICIO / FUNCIÓN:</span>
              <span className="font-bold text-black text-[6.7pt] block truncate">{doc.header.equipmentFunction}</span>
            </div>
            <div className="col-span-2 px-1 py-1 text-center overflow-hidden">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">FECHA:</span>
              <span className="font-bold text-black block truncate">{doc.header.date}</span>
            </div>
            <div className="col-span-2 px-1 py-1 text-center overflow-hidden">
              <span className="text-[5.5pt] uppercase text-neutral-600 font-bold block">ESTADO:</span>
              <span className="font-bold text-[6pt] uppercase text-black block truncate">{doc.header.status}</span>
            </div>
          </div>

          {/* Row 3: P&ID (25%), Line No (25%), Location (25%), PO No (25%) */}
          <div className="grid grid-cols-12 text-[6.2pt] divide-x divide-black bg-white">
            <div className="col-span-3 px-1.5 py-0.5 overflow-hidden">
              <span className="text-neutral-600 font-semibold mr-1">P&amp;ID REF:</span>
              <span className="font-bold text-black truncate">{doc.header.pidRef}</span>
            </div>
            <div className="col-span-3 px-1.5 py-0.5 overflow-hidden">
              <span className="text-neutral-600 font-semibold mr-1">LÍNEA:</span>
              <span className="font-bold text-black truncate">{doc.header.lineNo}</span>
            </div>
            <div className="col-span-3 px-1.5 py-0.5 overflow-hidden">
              <span className="text-neutral-600 font-semibold mr-1">UBICACIÓN:</span>
              <span className="font-bold text-black truncate">{doc.header.location}</span>
            </div>
            <div className="col-span-3 px-1.5 py-0.5 overflow-hidden">
              <span className="text-neutral-600 font-semibold mr-1">O. COMPRA:</span>
              <span className="font-bold text-black truncate">{doc.header.poNo}</span>
            </div>
          </div>
        </div>

        {/* 2. MAIN BODY: 2 SYMMETRICAL COLUMNS */}
        <div className="flex flex-1 w-full border-b-[1.5px] border-black overflow-hidden bg-white">
          {/* LEFT COLUMN (Exact 50% width) */}
          <div className="w-1/2 border-r-[1.5px] border-black flex flex-col justify-start overflow-hidden divide-y divide-black">
            {doc.leftSections.map((sec, secIdx) => (
              <RenderSection
                key={sec.id || `left-${secIdx}`}
                section={sec}
                inlineEdit={inlineEdit}
                isLastSection={secIdx === doc.leftSections.length - 1}
                spareCount={secIdx === doc.leftSections.length - 1 ? leftSpare : 0}
                onUpdateRow={(rIdx, val) => updateRowValue('left', secIdx, rIdx, val)}
                onUpdateScenario={(scenIdx, field, val) =>
                  updateScenarioValue('left', secIdx, scenIdx, field, val)
                }
              />
            ))}
          </div>

          {/* RIGHT COLUMN (Exact 50% width) */}
          <div className="w-1/2 flex flex-col justify-start overflow-hidden divide-y divide-black">
            {doc.rightSections.map((sec, secIdx) => (
              <RenderSection
                key={sec.id || `right-${secIdx}`}
                section={sec}
                inlineEdit={inlineEdit}
                isLastSection={secIdx === doc.rightSections.length - 1}
                spareCount={secIdx === doc.rightSections.length - 1 ? rightSpare : 0}
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
          className="w-full flex border-b-[1.5px] border-black shrink-0 bg-white"
          style={{ height: '78px', maxHeight: '78px', minHeight: '78px' }}
        >
          {/* Vertical NOTAS label on left edge */}
          <div className="w-[20px] bg-neutral-100 border-r-[1.5px] border-black flex items-center justify-center p-0.5 select-none shrink-0 overflow-hidden">
            <span className="writing-mode-vertical text-[6.5pt] font-black tracking-widest text-neutral-900 uppercase whitespace-nowrap">
              NOTAS
            </span>
          </div>

          {/* The 5 Fixed Note Rows Table */}
          <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
            <table
              className="w-full h-full text-[6.7pt] leading-tight"
              style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}
            >
              <colgroup>
                <col style={{ width: '30px' }} />
                <col style={{ width: 'calc(100% - 30px)' }} />
              </colgroup>
              <tbody>
                {fixedNoteRows.map((note, nIdx) => (
                  <tr
                    key={nIdx}
                    className="border-b border-neutral-300 last:border-b-0 hover:bg-neutral-50/50"
                    style={{ height: '15.6px', maxHeight: '15.6px' }}
                  >
                    {/* Note Number */}
                    <td
                      className="border-r border-neutral-300 text-center font-bold font-mono text-neutral-900 bg-neutral-50/40 p-0"
                    >
                      ({note.num})
                    </td>

                    {/* Note Content */}
                    <td className="px-2 font-medium text-neutral-800 truncate">
                      {inlineEdit ? (
                        <input
                          type="text"
                          value={note.text}
                          placeholder={`Nota ${note.num}...`}
                          onChange={(e) => updateNoteText(nIdx, e.target.value)}
                          className="w-full bg-transparent border-b border-dashed border-neutral-400 text-[6.7pt] focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="truncate block">{note.text}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. FOOTER: APPROVAL SIGNATURES BLOCK */}
        {doc.approvals && doc.approvals.length > 0 && (
          <div className="w-full grid grid-cols-4 divide-x divide-black text-[5.8pt] leading-tight bg-neutral-50 shrink-0 h-[28px]">
            {doc.approvals.map((appr, aIdx) => (
              <div key={aIdx} className="px-1.5 py-0.5 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-center text-neutral-600">
                  <span className="font-bold uppercase text-black text-[5.5pt]">
                    {appr.role}
                  </span>
                  <span className="text-neutral-700 font-medium">{appr.signatureDate}</span>
                </div>
                <div className="flex justify-between items-baseline font-bold text-neutral-900 truncate">
                  <span className="truncate text-black">{appr.name}</span>
                  {appr.company && (
                    <span className="text-[5pt] text-neutral-500 font-normal ml-1 truncate">
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
  );
};

// Sub-component to render an ISA-20 section with aligned fixed-table layout
interface RenderSectionProps {
  section: SectionBlock;
  inlineEdit: boolean;
  isLastSection?: boolean;
  spareCount?: number;
  onUpdateRow: (rowIndex: number, val: string) => void;
  onUpdateScenario: (scenarioIndex: number, field: 'min' | 'norm' | 'max', val: string) => void;
}

const RenderSection: React.FC<RenderSectionProps> = ({
  section,
  inlineEdit,
  isLastSection = false,
  spareCount = 0,
  onUpdateRow,
  onUpdateScenario,
}) => {
  return (
    <div className="flex w-full overflow-hidden flex-none">
      {/* Vertical Section Badge */}
      <div className="w-[20px] bg-neutral-100 border-r-[1.5px] border-black flex items-center justify-center p-0.5 select-none shrink-0 overflow-hidden relative">
        <span className="writing-mode-vertical text-[6.2pt] font-black tracking-widest text-neutral-900 text-center uppercase whitespace-nowrap">
          {section.name}
        </span>
      </div>

      {/* Rows Container (Table Layout Fixed: 100% bounds & perfect borders) */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Optional Scenario Table (Min / Norm / Max) */}
        {section.isScenarioTable && section.scenarios && section.scenarios.length > 0 && (
          <table
            className="w-full border-b border-black text-[6.5pt]"
            style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}
          >
            {/* Perfectly aligned column widths totaling exactly 100% */}
            <colgroup>
              <col style={{ width: '22px' }} />
              <col style={{ width: '46%' }} />
              <col style={{ width: '28px' }} />
              <col style={{ width: 'calc((54% - 50px) / 3)' }} />
              <col style={{ width: 'calc((54% - 50px) / 3)' }} />
              <col style={{ width: 'calc((54% - 50px) / 3)' }} />
            </colgroup>
            <thead>
              <tr className="bg-neutral-100 border-b border-black text-[5.4pt] font-black uppercase text-neutral-800 h-[14px]">
                <th className="border-r border-neutral-300 text-center p-0">#</th>
                <th className="border-r border-neutral-300 text-left px-1.5 font-bold">CONDICIÓN DE PROCESO</th>
                <th className="border-r border-neutral-300 text-center p-0">UNIDAD</th>
                <th className="border-r border-neutral-300 text-center p-0">MÍN</th>
                <th className="border-r border-neutral-300 text-center p-0 bg-neutral-200/70 font-black">NORM</th>
                <th className="text-center p-0">MÁX</th>
              </tr>
            </thead>
            <tbody>
              {section.scenarios.map((scen, sIdx) => (
                <tr
                  key={sIdx}
                  className="border-b border-neutral-300 last:border-b-0 hover:bg-neutral-50/60"
                  style={{ height: '14.5px' }}
                >
                  {/* # */}
                  <td className="border-r border-neutral-300 text-center font-mono text-[5.6pt] text-neutral-600 p-0 font-medium">
                    {scen.num}
                  </td>
                  {/* Description */}
                  <td className="border-r border-neutral-300 px-1.5 font-semibold text-neutral-900 truncate">
                    {scen.label}
                  </td>
                  {/* Unit */}
                  <td className="border-r border-neutral-300 text-center font-mono text-[5.6pt] text-neutral-600 p-0">
                    {scen.unit}
                  </td>
                  {/* Min */}
                  <td className="border-r border-neutral-300 text-center font-mono text-neutral-800 p-0 font-medium">
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={scen.min}
                        onChange={(e) => onUpdateScenario(sIdx, 'min', e.target.value)}
                        className="w-full text-center bg-transparent text-[6pt] focus:bg-blue-50 focus:outline-none"
                      />
                    ) : (
                      scen.min
                    )}
                  </td>
                  {/* Norm */}
                  <td className="border-r border-neutral-300 text-center font-mono font-bold text-black p-0 bg-neutral-50">
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={scen.norm}
                        onChange={(e) => onUpdateScenario(sIdx, 'norm', e.target.value)}
                        className="w-full text-center bg-transparent font-bold text-[6.5pt] focus:bg-blue-50 focus:outline-none"
                      />
                    ) : (
                      scen.norm
                    )}
                  </td>
                  {/* Max */}
                  <td className="text-center font-mono text-neutral-800 p-0 font-medium">
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={scen.max}
                        onChange={(e) => onUpdateScenario(sIdx, 'max', e.target.value)}
                        className="w-full text-center bg-transparent text-[6pt] focus:bg-blue-50 focus:outline-none"
                      />
                    ) : (
                      scen.max
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Regular Property Rows Table */}
        <table
          className="w-full text-[6.8pt]"
          style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}
        >
          {/* Exactly matching width columns totaling exactly 100% */}
          <colgroup>
            <col style={{ width: '22px' }} />
            <col style={{ width: '46%' }} />
            <col style={{ width: '28px' }} />
            <col style={{ width: 'calc(54% - 50px)' }} />
          </colgroup>
          <tbody>
            {section.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="border-b border-neutral-300 last:border-b-0 hover:bg-neutral-50/60"
                style={{ height: '14.5px' }}
              >
                {/* Row Number */}
                <td className="border-r border-neutral-300 text-center font-mono text-[5.8pt] text-neutral-600 font-medium p-0">
                  {row.num}
                </td>

                {/* Parameter Label */}
                <td className="border-r border-neutral-300 px-1.5 font-semibold text-neutral-800 truncate">
                  {row.label}
                </td>

                {/* Unit */}
                <td className="border-r border-neutral-300 text-center font-mono text-[5.8pt] text-neutral-600 p-0">
                  {row.unit || ''}
                </td>

                {/* Value */}
                <td className="px-1.5 font-bold text-black truncate text-[7.2pt]">
                  {inlineEdit ? (
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => onUpdateRow(rIdx, e.target.value)}
                      className="w-full bg-transparent font-bold focus:bg-blue-50 focus:outline-none px-0.5 text-[7.2pt]"
                    />
                  ) : (
                    <span className="truncate block">{row.value}</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Spare Rows for Perfect Vertical Symmetry */}
            {isLastSection &&
              spareCount > 0 &&
              Array.from({ length: spareCount }).map((_, sIdx) => {
                const lastNum = section.rows[section.rows.length - 1]?.num;
                const numVal = typeof lastNum === 'number' ? lastNum : parseInt(String(lastNum), 10);
                const spareNum = !isNaN(numVal) ? numVal + 1 + sIdx : '';
                return (
                  <tr
                    key={`spare-${sIdx}`}
                    className="border-b border-neutral-300 last:border-b-0"
                    style={{ height: '14.5px' }}
                  >
                    <td className="border-r border-neutral-300 text-center font-mono text-[5.6pt] text-neutral-400 p-0 font-medium">
                      {spareNum}
                    </td>
                    <td className="border-r border-neutral-300 px-1.5 text-neutral-400 font-normal italic"></td>
                    <td className="border-r border-neutral-300 text-center p-0"></td>
                    <td className="px-1.5"></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
