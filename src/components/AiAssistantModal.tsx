import React, { useState } from 'react';
import { Sparkles, X, Loader2, Check, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { DatasheetDocument, InstrumentCategory } from '../types/datasheet';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoc: DatasheetDocument;
  onApplyDatasheet: (newDoc: DatasheetDocument) => void;
}

const PRESET_PROMPTS = [
  {
    title: 'Válvula de Bola On-Off para Gas Natural',
    category: 'valve' as InstrumentCategory,
    prompt:
      'Válvula de bola trunnion de 6" ANSI 600 para gas natural con H2S a 45 bar g y 40°C. Actuador neumático Scotch Yoke con retorno por resorte (falla cerrada), solenoide Ex d 24VDC y finales de carrera.',
  },
  {
    title: 'Válvula de Control para Vapor de Alta Presión',
    category: 'valve' as InstrumentCategory,
    prompt:
      'Válvula de control tipo globo de 4" ANSI 900 para vapor a 60 bar g y 430°C. Material ASTM A217 WC9 con stellite, jaula anti-ruido, actuador diafragma y posicionador digital HART.',
  },
  {
    title: 'Caudalímetro Másico Coriolis para Hidrocarburos',
    category: 'flowmeter' as InstrumentCategory,
    prompt:
      'Caudalímetro Coriolis de 3" ANSI 300 en Hastelloy C-22 para transferencia de custodia de diesel a 15-25 m³/h, presión 8 bar g, salida 4-20mA HART, pulsos y Modbus RS485, ATEX Zona 1.',
  },
  {
    title: 'Caudalímetro Electromagnético para Agua Residual / Ácido',
    category: 'flowmeter' as InstrumentCategory,
    prompt:
      'Caudalímetro electromagnético de DN150 PN16 para efluente industrial corrosivo. Liner de PTFE, electrodos de Tántalo, IP68 sumergible con convertidor remoto a 15 metros.',
  },
  {
    title: 'Transmisor de Presión con Sello de Diafragma',
    category: 'pressure' as InstrumentCategory,
    prompt:
      'Transmisor de presión manométrica con rango 0-25 bar g, diafragma en Hastelloy C-276 con manifold de 2 válvulas, indicador digital local, certificación SIL 2 y ATEX Ex d.',
  },
  {
    title: 'Transmisor de Temperatura con Termopozo ASME PTC 19.3',
    category: 'temperature' as InstrumentCategory,
    prompt:
      'Sensor de temperatura dúplex Pt100 RTD 4 hilos Clase A con termopozo cónico bridado 1.5" ANSI 300 en SS316L, longitud de inserción 300 mm y transmisor de cabezal HART dual input.',
  },
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentDoc,
  onApplyDatasheet,
}) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<InstrumentCategory>(currentDoc.category || 'valve');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<DatasheetDocument | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setPreviewResult(null);

    try {
      const response = await fetch('/api/ai/suggest-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          category,
          currentDoc,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al comunicarse con el asistente de ingeniería.');
      }

      setPreviewResult(data.datasheet);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (previewResult) {
      onApplyDatasheet(previewResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg text-white shadow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Asistente de Ingeniería ISA-20
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-blue-950 text-blue-300 rounded border border-blue-800">
                  Gemini 3.8 Flash
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Describe tus condiciones de proceso y genera un datasheet completo de 1 página.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
              Ejemplos Rápidos de Ingeniería:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setCategory(p.category);
                  }}
                  className="p-2 text-left bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded transition-all text-[11px] group"
                >
                  <div className="font-semibold text-neutral-200 group-hover:text-blue-400 flex items-center justify-between">
                    <span>{p.title}</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-blue-400" />
                  </div>
                  <div className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                    {p.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Instrument Category Selection */}
          <div>
            <label className="block text-[11px] text-neutral-400 font-semibold mb-1">
              Categoría de Instrumento:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'valve', label: 'Válvula' },
                  { id: 'flowmeter', label: 'Caudalímetro' },
                  { id: 'pressure', label: 'Presión' },
                  { id: 'temperature', label: 'Temperatura' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`py-1.5 px-2 rounded text-center font-medium border text-xs transition-colors ${
                    category === cat.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Prompt Textarea */}
          <div>
            <label className="block text-[11px] text-neutral-400 font-semibold mb-1">
              Especificación / Requerimientos de Proceso:
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ejemplo: Válvula de mariposa triple offset de 8 pulgadas ANSI 150 para agua de refrigeración a 35°C y 5 bar g con actuador neumático de cremallera y piñón y switchbox..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* Preview of Generated Datasheet */}
          {previewResult && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-emerald-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4" />
                  <span>Datasheet ISA-20 generado con éxito</span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-emerald-900/50 px-2 py-0.5 rounded">
                  TAG: {previewResult.header.tag}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300 bg-neutral-950/60 p-2 rounded">
                <div>
                  <span className="text-neutral-500">Equipo:</span>{' '}
                  <strong className="text-white">{previewResult.header.equipmentType}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Servicio:</span>{' '}
                  <span className="text-white truncate">{previewResult.header.equipmentFunction}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Secciones Izq:</span>{' '}
                  {previewResult.leftSections.length}
                </div>
                <div>
                  <span className="text-neutral-500">Secciones Der:</span>{' '}
                  {previewResult.rightSections.length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-neutral-800 flex items-center justify-between bg-neutral-950">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-neutral-400 hover:text-white text-xs"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded transition-all shadow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculando especificaciones...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generar Datasheet</span>
                </>
              )}
            </button>

            {previewResult && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded transition-all shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar a Hoja de Datos</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
