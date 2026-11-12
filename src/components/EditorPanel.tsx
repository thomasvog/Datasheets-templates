import React, { useState } from 'react';
import {
  DatasheetDocument,
  SectionBlock,
  DataRow,
  ScenarioItem,
  DatasheetNote,
  ApprovalSignature,
} from '../types/datasheet';
import {
  Plus,
  Trash2,
  FileCheck2,
} from 'lucide-react';
import { validateDatasheetFit } from '../utils/pageBudget';
import { MAX_NOTES } from '../utils/normalizeDoc';

interface EditorPanelProps {
  document: DatasheetDocument;
  onUpdateDocument: (doc: DatasheetDocument) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  document: doc,
  onUpdateDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'header' | 'left' | 'right' | 'notes'>('header');
  const validation = validateDatasheetFit(doc);

  // Update Header field
  const handleHeaderChange = (field: keyof typeof doc.header, value: string) => {
    onUpdateDocument({
      ...doc,
      header: {
        ...doc.header,
        [field]: value,
      },
    });
  };

  // Immutable helper: replace one section without touching the original objects
  const updateSection = (
    column: 'left' | 'right',
    sectionIdx: number,
    updater: (sec: SectionBlock) => SectionBlock
  ) => {
    const key = column === 'left' ? 'leftSections' : 'rightSections';
    onUpdateDocument({
      ...doc,
      [key]: doc[key].map((sec, i) => (i === sectionIdx ? updater(sec) : sec)),
    });
  };

  const handleAddRow = (column: 'left' | 'right', sectionIdx: number) => {
    updateSection(column, sectionIdx, (sec) => {
      const last = sec.rows.length > 0 ? Number(sec.rows[sec.rows.length - 1].num) : NaN;
      const nextNum = Number.isNaN(last) ? (sec.rows.length > 0 ? 'NEW' : 100) : last + 1;
      return {
        ...sec,
        rows: [...sec.rows, { num: nextNum, label: 'Nuevo Parámetro', value: '-', unit: '' }],
      };
    });
  };

  const handleRemoveRow = (column: 'left' | 'right', sectionIdx: number, rowIdx: number) => {
    updateSection(column, sectionIdx, (sec) => ({
      ...sec,
      rows: sec.rows.filter((_, i) => i !== rowIdx),
    }));
  };

  const handleRowChange = (
    column: 'left' | 'right',
    sectionIdx: number,
    rowIdx: number,
    field: keyof DataRow,
    value: string
  ) => {
    updateSection(column, sectionIdx, (sec) => ({
      ...sec,
      rows: sec.rows.map((r, i) => (i === rowIdx ? { ...r, [field]: value } : r)),
    }));
  };

  const handleScenarioChange = (
    column: 'left' | 'right',
    sectionIdx: number,
    scenIdx: number,
    field: keyof ScenarioItem,
    value: string
  ) => {
    updateSection(column, sectionIdx, (sec) => ({
      ...sec,
      scenarios: sec.scenarios?.map((sc, i) => (i === scenIdx ? { ...sc, [field]: value } : sc)),
    }));
  };

  // Notes (the printed sheet has a fixed block of MAX_NOTES rows)
  const handleAddNote = () => {
    if (doc.notes.length >= MAX_NOTES) return;
    const last = doc.notes.length > 0 ? Number(doc.notes[doc.notes.length - 1].num) : NaN;
    const nextNum = Number.isNaN(last) ? 900 + doc.notes.length : last + 1;
    onUpdateDocument({ ...doc, notes: [...doc.notes, { num: nextNum, text: '' }] });
  };

  const handleRemoveNote = (idx: number) => {
    onUpdateDocument({ ...doc, notes: doc.notes.filter((_, i) => i !== idx) });
  };

  const handleNoteChange = (idx: number, text: string) => {
    onUpdateDocument({
      ...doc,
      notes: doc.notes.map((n, i) => (i === idx ? { ...n, text } : n)),
    });
  };

  // Signatures
  const handleSignatureChange = (idx: number, field: keyof ApprovalSignature, value: string) => {
    const updated = [...doc.approvals];
    updated[idx] = { ...updated[idx], [field]: value };
    onUpdateDocument({ ...doc, approvals: updated });
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900 border-r border-neutral-800 text-neutral-200">
      {/* Tab navigation */}
      <div className="flex border-b border-neutral-800 bg-neutral-950 text-xs font-medium">
        <button
          onClick={() => setActiveTab('header')}
          className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 ${
            activeTab === 'header'
              ? 'border-blue-500 text-blue-400 bg-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Cabecera
        </button>
        <button
          onClick={() => setActiveTab('left')}
          className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 ${
            activeTab === 'left'
              ? 'border-blue-500 text-blue-400 bg-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Columna Izq ({doc.leftSections.length})
        </button>
        <button
          onClick={() => setActiveTab('right')}
          className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 ${
            activeTab === 'right'
              ? 'border-blue-500 text-blue-400 bg-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Columna Der ({doc.rightSections.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 ${
            activeTab === 'notes'
              ? 'border-blue-500 text-blue-400 bg-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Notas & Firmas
        </button>
      </div>

      {/* Page fit alert strip */}
      <div
        className={`px-3 py-1.5 text-[11px] flex items-center justify-between border-b ${
          validation.status === 'safe'
            ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
            : validation.status === 'warning'
            ? 'bg-amber-950/40 border-amber-900/60 text-amber-300'
            : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>
            Filas: Izq ({validation.totalLeftRows}) · Der ({validation.totalRightRows})
          </span>
        </div>
        <span className="font-mono">{validation.percentUtilized}% Altura A4</span>
      </div>

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* TAB 1: HEADER */}
        {activeTab === 'header' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider">
              Identificación del Instrumento
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">TAG Number *</label>
                <input
                  type="text"
                  value={doc.header.tag}
                  onChange={(e) => handleHeaderChange('tag', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Tipo de Equipo *</label>
                <input
                  type="text"
                  value={doc.header.equipmentType}
                  onChange={(e) => handleHeaderChange('equipmentType', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Título Documento</label>
                <input
                  type="text"
                  value={doc.header.documentTitle}
                  onChange={(e) => handleHeaderChange('documentTitle', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Norma Estándar</label>
                <input
                  type="text"
                  value={doc.header.standard}
                  onChange={(e) => handleHeaderChange('standard', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Función / Servicio</label>
              <input
                type="text"
                value={doc.header.equipmentFunction}
                onChange={(e) => handleHeaderChange('equipmentFunction', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider pt-2">
              Datos del Proyecto & Planta
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Empresa / Cliente</label>
                <input
                  type="text"
                  value={doc.header.companyName}
                  onChange={(e) => handleHeaderChange('companyName', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Proyecto</label>
                <input
                  type="text"
                  value={doc.header.project}
                  onChange={(e) => handleHeaderChange('project', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Área / Ubicación</label>
                <input
                  type="text"
                  value={doc.header.location}
                  onChange={(e) => handleHeaderChange('location', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">P&ID Referencia</label>
                <input
                  type="text"
                  value={doc.header.pidRef}
                  onChange={(e) => handleHeaderChange('pidRef', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Línea No.</label>
                <input
                  type="text"
                  value={doc.header.lineNo}
                  onChange={(e) => handleHeaderChange('lineNo', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Revisión</label>
                <input
                  type="text"
                  value={doc.header.revision}
                  onChange={(e) => handleHeaderChange('revision', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Fecha</label>
                <input
                  type="text"
                  value={doc.header.date}
                  onChange={(e) => handleHeaderChange('date', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Orden de Compra</label>
                <input
                  type="text"
                  value={doc.header.poNo}
                  onChange={(e) => handleHeaderChange('poNo', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Estado de Aprobación</label>
                <input
                  type="text"
                  value={doc.header.status}
                  onChange={(e) => handleHeaderChange('status', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 & 3: COLUMN SECTIONS */}
        {(activeTab === 'left' || activeTab === 'right') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-neutral-400">
                Secciones ({activeTab === 'left' ? 'Columna Izquierda' : 'Columna Derecha'})
              </span>
            </div>

            {(activeTab === 'left' ? doc.leftSections : doc.rightSections).map((sec, sIdx) => (
              <div
                key={sec.id || sIdx}
                className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-3"
              >
                {/* Section header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-neutral-800 font-mono text-[10px] text-blue-400 font-bold rounded">
                      SEC {sIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={sec.name}
                      onChange={(e) =>
                        updateSection(activeTab as 'left' | 'right', sIdx, (sec) => ({
                          ...sec,
                          name: e.target.value,
                        }))
                      }
                      className="bg-transparent font-bold text-white text-xs border-b border-neutral-700 focus:border-blue-500 focus:outline-none px-1"
                    />
                  </div>
                  <button
                    onClick={() => handleAddRow(activeTab, sIdx)}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar Fila</span>
                  </button>
                </div>

                {/* Scenario items if present */}
                {sec.isScenarioTable && sec.scenarios && (
                  <div className="space-y-2 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">
                      Tabla de Escenarios (Mín / Norm / Máx)
                    </span>
                    <div className="space-y-1.5">
                      {sec.scenarios.map((scen, scenIdx) => (
                        <div key={scenIdx} className="grid grid-cols-12 gap-1.5 items-center text-[11px]">
                          <span className="col-span-1 text-neutral-500 font-mono text-[10px]">
                            {scen.num}
                          </span>
                          <input
                            type="text"
                            value={scen.label}
                            onChange={(e) =>
                              handleScenarioChange(activeTab, sIdx, scenIdx, 'label', e.target.value)
                            }
                            className="col-span-4 bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-white text-[11px]"
                          />
                          <input
                            type="text"
                            value={scen.unit}
                            placeholder="Unit"
                            onChange={(e) =>
                              handleScenarioChange(activeTab, sIdx, scenIdx, 'unit', e.target.value)
                            }
                            className="col-span-2 bg-neutral-800 border border-neutral-700 rounded px-1 text-center text-neutral-300 font-mono text-[10px] py-1"
                          />
                          <input
                            type="text"
                            value={scen.min}
                            placeholder="Min"
                            onChange={(e) =>
                              handleScenarioChange(activeTab, sIdx, scenIdx, 'min', e.target.value)
                            }
                            className="col-span-1 bg-neutral-800 border border-neutral-700 rounded px-1 text-center text-neutral-300 text-[10px] py-1"
                          />
                          <input
                            type="text"
                            value={scen.norm}
                            placeholder="Norm"
                            onChange={(e) =>
                              handleScenarioChange(activeTab, sIdx, scenIdx, 'norm', e.target.value)
                            }
                            className="col-span-2 bg-neutral-800 border border-neutral-600 font-bold rounded px-1 text-center text-white text-[10px] py-1"
                          />
                          <input
                            type="text"
                            value={scen.max}
                            placeholder="Max"
                            onChange={(e) =>
                              handleScenarioChange(activeTab, sIdx, scenIdx, 'max', e.target.value)
                            }
                            className="col-span-2 bg-neutral-800 border border-neutral-700 rounded px-1 text-center text-neutral-300 text-[10px] py-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular rows list */}
                <div className="space-y-1.5">
                  {sec.rows.map((r, rIdx) => (
                    <div key={rIdx} className="flex items-center gap-1.5 text-[11px]">
                      {/* Num */}
                      <input
                        type="text"
                        value={r.num}
                        onChange={(e) =>
                          handleRowChange(activeTab, sIdx, rIdx, 'num', e.target.value)
                        }
                        className="w-10 bg-neutral-800 border border-neutral-700 rounded px-1 py-1 text-center text-neutral-400 font-mono text-[10px]"
                      />
                      {/* Label */}
                      <input
                        type="text"
                        value={r.label}
                        onChange={(e) =>
                          handleRowChange(activeTab, sIdx, rIdx, 'label', e.target.value)
                        }
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white text-[11px]"
                      />
                      {/* Unit */}
                      <input
                        type="text"
                        value={r.unit || ''}
                        placeholder="Unidad"
                        onChange={(e) =>
                          handleRowChange(activeTab, sIdx, rIdx, 'unit', e.target.value)
                        }
                        className="w-14 bg-neutral-800 border border-neutral-700 rounded px-1 py-1 text-center text-neutral-400 font-mono text-[10px]"
                      />
                      {/* Value */}
                      <input
                        type="text"
                        value={r.value}
                        onChange={(e) =>
                          handleRowChange(activeTab, sIdx, rIdx, 'value', e.target.value)
                        }
                        className="w-[38%] bg-neutral-800 border border-neutral-700 rounded px-2 py-1 font-semibold text-white text-[11px]"
                      />
                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveRow(activeTab, sIdx, rIdx)}
                        className="p-1 text-neutral-500 hover:text-rose-400"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: NOTES & SIGNATURES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Notes Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider">
                  Notas de Ingeniería ({doc.notes.length}/{MAX_NOTES})
                </h3>
                <button
                  onClick={handleAddNote}
                  disabled={doc.notes.length >= MAX_NOTES}
                  title={doc.notes.length >= MAX_NOTES ? 'La hoja tiene espacio para 5 notas' : undefined}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar Nota</span>
                </button>
              </div>

              <div className="space-y-2">
                {doc.notes.map((note, nIdx) => (
                  <div key={nIdx} className="flex items-start gap-2">
                    <span className="w-10 text-center py-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-400 font-mono text-[10px]">
                      ({note.num})
                    </span>
                    <textarea
                      rows={2}
                      value={note.text}
                      onChange={(e) => handleNoteChange(nIdx, e.target.value)}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white text-[11px] focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleRemoveNote(nIdx)}
                      className="p-1 text-neutral-500 hover:text-rose-400 pt-2"
                      title="Eliminar nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Approvals Section */}
            <div className="space-y-2 pt-3 border-t border-neutral-800">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider">
                Firmas y Aprobaciones del Proyecto
              </h3>

              <div className="space-y-2">
                {doc.approvals.map((appr, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-2 bg-neutral-950 border border-neutral-800 rounded space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-[10px] text-neutral-400 font-bold uppercase">
                      <span>{appr.role}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre / Cargo"
                        value={appr.name}
                        onChange={(e) => handleSignatureChange(aIdx, 'name', e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Fecha"
                        value={appr.signatureDate}
                        onChange={(e) =>
                          handleSignatureChange(aIdx, 'signatureDate', e.target.value)
                        }
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Empresa"
                        value={appr.company || ''}
                        onChange={(e) => handleSignatureChange(aIdx, 'company', e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
