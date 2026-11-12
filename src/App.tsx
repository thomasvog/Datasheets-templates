import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DatasheetDocument } from './types/datasheet';
import { templates } from './data/templates';
import { HeaderBar } from './components/HeaderBar';
import { DatasheetPreview } from './components/DatasheetPreview';
import { EditorPanel } from './components/EditorPanel';
import { AiAssistantModal } from './components/AiAssistantModal';
import { exportDatasheetToPdf, printDatasheet } from './utils/pdfGenerator';
import { CheckCircle2, AlertTriangle, Download } from 'lucide-react';

export default function App() {
  // Start with the Ball Valve template matching the user's reference HS-1200
  const [currentDoc, setCurrentDoc] = useState<DatasheetDocument>(() =>
    JSON.parse(JSON.stringify(templates['ball-valve']))
  );
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [scale, setScale] = useState<number>(0.92);
  const [inlineEdit, setInlineEdit] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sheetOverflow, setSheetOverflow] = useState<boolean>(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasMobile = useRef<boolean | null>(null);

  // Set initial scale based on window width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      if (isMobile) {
        setScale(0.55);
        // Only switch to the editor when ENTERING mobile, not on every resize
        if (wasMobile.current !== true) setActiveTab('editor');
      } else if (width < 1200) {
        setScale(0.75);
      } else if (width < 1600) {
        setScale(0.92);
      } else {
        setScale(1.0);
      }
    };

    const handleResizeTracked = () => {
      handleResize();
      wasMobile.current = window.innerWidth < 768;
    };
    handleResizeTracked();
    window.addEventListener('resize', handleResizeTracked);
    return () => window.removeEventListener('resize', handleResizeTracked);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const handleFitChange = useCallback((overflowing: boolean) => {
    setSheetOverflow((prev) => (prev === overflowing ? prev : overflowing));
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    const t = templates[templateId];
    if (t) {
      setCurrentDoc(JSON.parse(JSON.stringify(t)));
      showToast(`Plantilla cargada: ${t.header.tag} - ${t.header.equipmentType}`);
    }
  };

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const fileName = `${currentDoc.header.tag || 'Datasheet'}_ISA20.pdf`;
      await exportDatasheetToPdf('datasheet-a4-canvas', fileName);
      showToast(
        sheetOverflow
          ? `PDF descargado: ${fileName} (⚠ parte del contenido quedó recortado)`
          : `¡PDF descargado con éxito! (1 página A4: ${fileName})`
      );
    } catch (err: unknown) {
      console.error(err);
      alert('Error al generar el PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    printDatasheet();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Global Header Bar */}
      <HeaderBar
        currentDoc={currentDoc}
        onSelectTemplate={handleSelectTemplate}
        onUpdateDocument={setCurrentDoc}
        onOpenAiAssistant={() => setIsAiModalOpen(true)}
        onExportPdf={handleExportPdf}
        onPrint={handlePrint}
        isGeneratingPdf={isGeneratingPdf}
        scale={scale}
        onChangeScale={setScale}
        inlineEdit={inlineEdit}
        onToggleInlineEdit={() => setInlineEdit(!inlineEdit)}
        activeTab={activeTab}
        onChangeActiveTab={setActiveTab}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Form Editor Panel */}
        {(activeTab === 'split' || activeTab === 'editor') && (
          <div
            className={`no-print transition-all duration-200 border-r border-neutral-800 ${
              activeTab === 'split' ? 'w-full md:w-[420px] lg:w-[460px] xl:w-[500px]' : 'w-full'
            }`}
          >
            <EditorPanel document={currentDoc} onUpdateDocument={setCurrentDoc} />
          </div>
        )}

        {/* Right Side: Live A4 Datasheet Preview */}
        {(activeTab === 'split' || activeTab === 'preview') && (
          <div className="flex-1 bg-neutral-900/60 overflow-auto flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
            {/* Top Toolbar over the paper */}
            <div className="no-print w-full max-w-[196mm] flex items-center justify-between mb-3 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-200 uppercase tracking-wider text-[11px]">
                  Vista Previa A4 (210 × 297 mm)
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {currentDoc.header.tag} - {currentDoc.header.equipmentType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                  Escala: {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-1 bg-emerald-600/90 hover:bg-emerald-600 text-white px-2.5 py-0.5 rounded text-[11px] font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>PDF 1 Pág</span>
                </button>
              </div>
            </div>

            {sheetOverflow && (
              <div className="no-print w-full max-w-[196mm] mb-3 flex items-center gap-2 bg-amber-950/70 border border-amber-700 text-amber-300 rounded px-3 py-1.5 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  El contenido supera la altura de la hoja y se recortará en el PDF. Quita filas o usa
                  densidad Ultra.
                </span>
              </div>
            )}

            {/* A4 Sheet Container */}
            <div className="relative pb-16 w-full">
              <DatasheetPreview
                document={currentDoc}
                onUpdateDocument={setCurrentDoc}
                scale={scale}
                inlineEdit={inlineEdit}
                onFitChange={handleFitChange}
              />
            </div>
          </div>
        )}
      </main>

      {/* In editor-only view the sheet is not visible, but PDF export / print still need it */}
      {activeTab === 'editor' && (
        <div className="offscreen-sheet" aria-hidden="true">
          <DatasheetPreview
            document={currentDoc}
            onUpdateDocument={setCurrentDoc}
            scale={1}
            inlineEdit={false}
            onFitChange={handleFitChange}
          />
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-6 right-6 z-50 bg-neutral-900 border border-emerald-500/80 text-emerald-300 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentDoc={currentDoc}
        onApplyDatasheet={(newDoc) => {
          setCurrentDoc(newDoc);
          showToast(`Datasheet generado para: ${newDoc.header.tag}`);
        }}
      />
    </div>
  );
}
