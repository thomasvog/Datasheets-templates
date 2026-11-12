import React, { useRef } from 'react';
import {
  Download,
  Printer,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Upload,
  FileCheck2,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import { DatasheetDocument, PageDensity } from '../types/datasheet';
import { validateDatasheetFit } from '../utils/pageBudget';
import { templates } from '../data/templates';
import { normalizeDatasheet } from '../utils/normalizeDoc';

interface HeaderBarProps {
  currentDoc: DatasheetDocument;
  onSelectTemplate: (templateId: string) => void;
  onUpdateDocument: (doc: DatasheetDocument) => void;
  onOpenAiAssistant: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  isGeneratingPdf: boolean;
  scale: number;
  onChangeScale: (newScale: number) => void;
  inlineEdit: boolean;
  onToggleInlineEdit: () => void;
  activeTab: 'editor' | 'preview' | 'split';
  onChangeActiveTab: (tab: 'editor' | 'preview' | 'split') => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentDoc,
  onSelectTemplate,
  onUpdateDocument,
  onOpenAiAssistant,
  onExportPdf,
  onPrint,
  isGeneratingPdf,
  scale,
  onChangeScale,
  inlineEdit,
  onToggleInlineEdit,
  activeTab,
  onChangeActiveTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validation = validateDatasheetFit(currentDoc);
  const isKnownTemplate = Object.prototype.hasOwnProperty.call(templates, currentDoc.id);

  const handleDensityChange = (density: PageDensity) => {
    onUpdateDocument({
      ...currentDoc,
      density,
    });
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentDoc, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentDoc.header.tag || 'datasheet'}-isa20.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onUpdateDocument(normalizeDatasheet(json));
      } catch (err) {
        alert(
          'No se pudo importar el JSON: ' + (err instanceof Error ? err.message : String(err))
        );
      }
    };
    reader.onerror = () => alert('No se pudo leer el archivo.');
    reader.readAsText(file);
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="no-print bg-neutral-900 border-b border-neutral-800 text-neutral-100 sticky top-0 z-40 select-none shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
            ISA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">
                Datasheet Studio
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700">
                ISA-TR20.00.01
              </span>
            </div>
            <div className="text-[10px] text-neutral-400">
              PDF estricto de 1 página A4
            </div>
          </div>
        </div>

        {/* Center: Template Switcher & Quick Category */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 hidden sm:inline">Plantilla:</span>
          <select
            value={currentDoc.id}
            onChange={(e) => onSelectTemplate(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded px-2.5 py-1.5 focus:border-blue-500 focus:outline-none cursor-pointer font-medium"
          >
            {!isKnownTemplate && (
              <option value={currentDoc.id}>Personalizado - {currentDoc.header.tag}</option>
            )}
            <optgroup label="Válvulas Industriales">
              <option value="ball-valve">Válvula de Bola On-Off (ESD) - HS-1200</option>
              <option value="control-valve">Válvula de Control Globo - FCV-2041</option>
            </optgroup>
            <optgroup label="Caudalímetros">
              <option value="coriolis-flowmeter">Caudalímetro Másico Coriolis - FT-3012</option>
              <option value="mag-flowmeter">Caudalímetro Electromagnético - FIT-1044</option>
            </optgroup>
            <optgroup label="Transmisores">
              <option value="pressure-transmitter">Transmisor de Presión (dP/Gauge) - PT-2015</option>
              <option value="temperature-transmitter">Transmisor de Temp. + Termopozo - TT-3018</option>
            </optgroup>
          </select>

          {/* 1-Page Constraint Badge */}
          <div
            title={validation.message}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border ${
              validation.status === 'safe'
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                : validation.status === 'warning'
                ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                : 'bg-rose-950/70 border-rose-700 text-rose-300'
            }`}
          >
            {validation.status === 'safe' ? (
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>1 Pág A4 ({validation.percentUtilized}%)</span>
          </div>
        </div>

        {/* Right Actions: AI Assist, PDF Export, Print */}
        <div className="flex items-center gap-2">
          {/* AI Assistant button */}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-all shadow-sm active:scale-95"
            title="Generar o ajustar especificaciones con IA (Gemini)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Asistente IA</span>
          </button>

          {/* Print Button */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs px-2.5 py-1.5 rounded border border-neutral-700 transition-colors"
            title="Impresión directa estándar A4"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Imprimir</span>
          </button>

          {/* Download PDF button */}
          <button
            onClick={onExportPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded shadow transition-all active:scale-95"
            title="Generar PDF A4 de 1 página exacta"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Secondary Sub-Bar for Controls & View Modes */}
      <div className="bg-neutral-950/80 border-t border-neutral-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-neutral-300">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
          <button
            onClick={() => onChangeActiveTab('split')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'split' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vista Dividida
          </button>
          <button
            onClick={() => onChangeActiveTab('editor')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'editor' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Editor Formulario
          </button>
          <button
            onClick={() => onChangeActiveTab('preview')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'preview' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Solo Vista Previa A4
          </button>
        </div>

        {/* Center: Inline Edit Toggle & Density */}
        <div className="flex items-center gap-3">
          {/* Inline Edit Toggle */}
          <button
            onClick={onToggleInlineEdit}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
              inlineEdit
                ? 'bg-blue-900/60 border-blue-600 text-blue-200'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Activar edición directa con click en la hoja"
          >
            <Edit3 className="w-3 h-3" />
            <span>Editar en hoja: {inlineEdit ? 'ON' : 'OFF'}</span>
          </button>

          {/* Density Picker */}
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            <span className="text-neutral-500">Densidad:</span>
            {(['ultra-compact', 'compact', 'standard'] as PageDensity[]).map((dens) => (
              <button
                key={dens}
                onClick={() => handleDensityChange(dens)}
                className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors ${
                  currentDoc.density === dens
                    ? 'bg-neutral-800 text-blue-400 font-bold border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {dens === 'ultra-compact' ? 'Ultra' : dens === 'compact' ? 'Compacta' : 'Estándar'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Scale & JSON Export/Import */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden lg:flex items-center gap-1 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">
            <button
              onClick={() => onChangeScale(Math.max(0.5, scale - 0.1))}
              className="p-1 hover:text-white"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[10px] px-1">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => onChangeScale(Math.min(1.5, scale + 0.1))}
              className="p-1 hover:text-white"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => onChangeScale(1)}
              className="text-[10px] px-1 hover:text-white text-neutral-400"
              title="Reset 100%"
            >
              1:1
            </button>
          </div>

          {/* JSON Export / Import */}
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200"
            title="Descargar archivo JSON del Datasheet"
          >
            <Download className="w-3 h-3" />
            <span className="hidden md:inline">JSON</span>
          </button>

          <label
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
            title="Importar archivo JSON"
          >
            <Upload className="w-3 h-3" />
            <span className="hidden md:inline">Cargar</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </header>
  );
};
