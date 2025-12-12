import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  ArrowLeft, 
  FileCheck,
  Wand2,
  Copy,
  Check,
  FileBox,
  FileType,
  Info,
  MousePointerClick,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Target
} from 'lucide-react';
import { AppStep, DocumentState, FileContent, ContentChange, ReferenceHighlight } from './types';
import { analyzeInclusivity, rewriteContent } from './services/gemini';
import { FileUpload } from './components/FileUpload';
import { Button } from './components/Button';
import { StepIndicator } from './components/StepIndicator';

// Define a palette of distinct colors for concepts
const CONCEPT_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-900', ring: 'ring-blue-400', border: 'border-blue-200', hover: 'hover:bg-blue-200', badge: 'bg-blue-50 text-blue-700', activeBorder: 'border-blue-400' },
  { bg: 'bg-green-100', text: 'text-green-900', ring: 'ring-green-400', border: 'border-green-200', hover: 'hover:bg-green-200', badge: 'bg-green-50 text-green-700', activeBorder: 'border-green-400' },
  { bg: 'bg-purple-100', text: 'text-purple-900', ring: 'ring-purple-400', border: 'border-purple-200', hover: 'hover:bg-purple-200', badge: 'bg-purple-50 text-purple-700', activeBorder: 'border-purple-400' },
  { bg: 'bg-orange-100', text: 'text-orange-900', ring: 'ring-orange-400', border: 'border-orange-200', hover: 'hover:bg-orange-200', badge: 'bg-orange-50 text-orange-700', activeBorder: 'border-orange-400' },
  { bg: 'bg-pink-100', text: 'text-pink-900', ring: 'ring-pink-400', border: 'border-pink-200', hover: 'hover:bg-pink-200', badge: 'bg-pink-50 text-pink-700', activeBorder: 'border-pink-400' },
  { bg: 'bg-teal-100', text: 'text-teal-900', ring: 'ring-teal-400', border: 'border-teal-200', hover: 'hover:bg-teal-200', badge: 'bg-teal-50 text-teal-700', activeBorder: 'border-teal-400' },
  { bg: 'bg-amber-100', text: 'text-amber-900', ring: 'ring-amber-400', border: 'border-amber-200', hover: 'hover:bg-amber-200', badge: 'bg-amber-50 text-amber-700', activeBorder: 'border-amber-400' },
  { bg: 'bg-cyan-100', text: 'text-cyan-900', ring: 'ring-cyan-400', border: 'border-cyan-200', hover: 'hover:bg-cyan-200', badge: 'bg-cyan-50 text-cyan-700', activeBorder: 'border-cyan-400' },
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD_REFERENCE);
  const [docState, setDocState] = useState<DocumentState>({
    reference: null,
    analysis: null,
    target: null,
    result: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Interactivity State
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [showSystemInstruction, setShowSystemInstruction] = useState(false);

  // Ref for the document content to be exported
  const exportContentRef = useRef<HTMLDivElement>(null);
  // Ref for the content container to help scoping the querySelector
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const handleReferenceSelect = (fileContent: FileContent, fileName: string) => {
    setDocState(prev => ({ ...prev, reference: fileContent, referenceFileName: fileName }));
    setError(null);
  };

  const handleTargetSelect = (fileContent: FileContent, fileName: string) => {
    setDocState(prev => ({ ...prev, target: fileContent, targetFileName: fileName }));
    setError(null);
  };

  const handleStepChange = (newStep: AppStep) => {
    setStep(newStep);
    // Reset selection state when changing steps
    setSelectedChangeId(null);
    setSelectedConcept(null);
    setShowSystemInstruction(false);
  };

  // Auto-scroll logic
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (selectedChangeId) {
        const el = document.getElementById(selectedChangeId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Optional: Add a temporary highlight class
          el.classList.add('ring-4', 'ring-indigo-300');
          setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-300'), 1500);
        }
      } 
    }, 100); 

    return () => clearTimeout(scrollTimeout);
  }, [selectedChangeId]);


  const runAnalysis = async () => {
    if (!docState.reference || !docState.reference.data) {
      setError("Please provide reference content.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setStep(AppStep.ANALYZING);

    try {
      const analysis = await analyzeInclusivity(docState.reference);
      setDocState(prev => ({ ...prev, analysis }));
      setStep(AppStep.REVIEW_ANALYSIS);
    } catch (e: any) {
      setError(e.message || "Something went wrong during analysis.");
      setStep(AppStep.UPLOAD_REFERENCE);
    } finally {
      setIsProcessing(false);
    }
  };

  const runRewrite = async () => {
    if (!docState.target || !docState.target.data) {
      setError("Please provide content to rewrite.");
      return;
    }
    if (!docState.analysis) return;

    setIsProcessing(true);
    setError(null);
    setStep(AppStep.REWRITING);

    try {
      const result = await rewriteContent(
        docState.target, 
        docState.analysis.systemInstruction,
        docState.analysis.characteristics,
        docState.analysis.visualStyle // Pass the extracted style from reference
      );
      setDocState(prev => ({ ...prev, result }));
      setStep(AppStep.RESULT);
    } catch (e: any) {
      setError(e.message || "Something went wrong during rewriting.");
      setStep(AppStep.UPLOAD_TARGET);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (docState.result?.rewrittenText) {
      await navigator.clipboard.writeText(docState.result.rewrittenText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePdfExport = () => {
    if (!exportContentRef.current) return;
    // @ts-ignore
    const html2pdf = window.html2pdf;
    if (!html2pdf) {
      setError("PDF generation library not loaded.");
      return;
    }
    const opt = {
      margin: [10, 10],
      filename: `inclusive-document-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(exportContentRef.current).save();
  };

  const handleWordExport = () => {
    if (!docState.result?.rewrittenText) return;
    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title><style>body { font-family: 'Calibri', sans-serif; white-space: pre-wrap; }</style></head><body>";
    const postHtml = "</body></html>";
    const content = `<div>${docState.result.rewrittenText.replace(/\n/g, '<br>')}</div>`;
    const html = preHtml + content + postHtml;
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url;
    downloadLink.download = `inclusive-document-${Date.now()}.doc`;
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const reset = () => {
    handleStepChange(AppStep.UPLOAD_REFERENCE);
    setDocState({
      reference: null,
      analysis: null,
      target: null,
      result: null,
    });
    setError(null);
  };

  // Determine active concepts based on current step
  const activeConcepts = useMemo(() => {
    const allDefinitions = docState.analysis?.characteristics || [];
    if (step === AppStep.REVIEW_ANALYSIS && docState.analysis) {
      return allDefinitions;
    }
    if (step === AppStep.RESULT && docState.result) {
      // Create a set of concept names used in the result
      const usedConceptNames = new Set(docState.result.changes.map(c => c.concept));
      // Filter definitions to only include those that are used
      return allDefinitions.filter(def => usedConceptNames.has(def.name));
    }
    return [];
  }, [step, docState.analysis, docState.result]);

  // Map concepts to colors
  const conceptColorMap = useMemo(() => {
    const map: Record<string, typeof CONCEPT_COLORS[0]> = {};
    activeConcepts.forEach((concept, index) => {
      map[concept.name] = CONCEPT_COLORS[index % CONCEPT_COLORS.length];
    });
    return map;
  }, [activeConcepts]);

  // Helper to get all highlights for a concept
  const getConceptHighlights = (conceptName: string) => {
    if (step === AppStep.RESULT) {
      return docState.result?.changes.filter(c => c.concept === conceptName) || [];
    } else {
      return docState.analysis?.highlights.filter(h => h.characteristic === conceptName) || [];
    }
  };

  // Shared Navigation Helpers
  const navigateHighlights = (direction: 'next' | 'prev', conceptName: string | null) => {
     if (!conceptName) return;
     const conceptHighlights = getConceptHighlights(conceptName);
     if (conceptHighlights.length === 0) return;

     const currentIndex = selectedChangeId 
      ? conceptHighlights.findIndex(h => h.id === selectedChangeId) 
      : -1;
    
    let nextIndex = 0;
    if (direction === 'next') {
        nextIndex = (currentIndex + 1) % conceptHighlights.length;
    } else {
        nextIndex = (currentIndex - 1 + conceptHighlights.length) % conceptHighlights.length;
    }
    setSelectedChangeId(conceptHighlights[nextIndex].id);
  };

  // Generic highlighter helper
  const renderHighlightedText = (
    text: string, 
    items: { id: string, snippet: string, concept: string, explanation: string }[]
  ) => {
    if (!text) return null;
    const activeItems = selectedConcept 
      ? items.filter(i => i.concept === selectedConcept)
      : items;

    let parts: (string | React.ReactNode)[] = [text];

    activeItems.forEach(item => {
      const snippet = item.snippet;
      if (!snippet || snippet.length < 3) return; 
      const newParts: (string | React.ReactNode)[] = [];
      
      // Fallback color if concept is missing from map (shouldn't happen with strict mode)
      const colors = conceptColorMap[item.concept] || CONCEPT_COLORS[0];
      
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }
        const index = part.indexOf(snippet);
        if (index !== -1) {
          const before = part.substring(0, index);
          const match = part.substring(index, index + snippet.length);
          const after = part.substring(index + snippet.length);
          const isSelected = selectedChangeId === item.id;
          
          if (before) newParts.push(before);
          newParts.push(
            <span 
              key={`${item.id}-${Math.random()}`}
              id={item.id}
              data-concept={item.concept}
              onClick={() => {
                setSelectedChangeId(isSelected ? null : item.id);
                if (!isSelected && !selectedConcept) setSelectedConcept(item.concept);
              }}
              className={`
                cursor-pointer transition-all duration-200 rounded px-0.5
                ${isSelected 
                  ? `${colors.bg} ${colors.text} ring-2 ${colors.ring} font-semibold z-10 relative shadow-sm` 
                  : `${colors.bg} ${colors.text} ${colors.hover} opacity-90 hover:opacity-100 hover:shadow-sm`
                }
              `}
              title={`${item.concept}: ${item.explanation}`}
            >
              {match}
            </span>
          );
          if (after) newParts.push(after);
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-sm">
        {parts}
      </div>
    );
  };

  // Render Sidebar Content (Shared between Analysis & Result)
  const renderSidebarContent = () => {
    return (
      <div className="p-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {step === AppStep.RESULT ? "Transformation Summary" : "Detected Tone"}
                </h3>
                <Target className="w-4 h-4 text-indigo-400" />
              </div>
              <p className={`text-indigo-900 font-medium leading-tight ${step === AppStep.RESULT ? 'text-sm' : 'text-xl'}`}>
                {step === AppStep.RESULT ? docState.result?.summary : `"${docState.analysis?.tone}"`}
              </p>
          </div>

          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
            Core Concepts
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{activeConcepts.length}</span>
          </h3>
          
          <div className="space-y-3">
              {activeConcepts.map(concept => {
                  const colors = conceptColorMap[concept.name];
                  const isSelected = selectedConcept === concept.name;
                  const count = step === AppStep.RESULT 
                    ? docState.result?.changes.filter(c => c.concept === concept.name).length || 0
                    : docState.analysis?.highlights.filter(h => h.characteristic === concept.name).length || 0;
                  
                  const conceptHighlights = getConceptHighlights(concept.name);
                  const currentIndex = selectedChangeId 
                    ? conceptHighlights.findIndex(h => h.id === selectedChangeId) 
                    : -1;

                  return (
                    <div key={concept.name} className={`flex flex-col transition-all duration-300 ${isSelected ? 'scale-[1.02]' : ''}`}>
                      <button
                        onClick={() => { 
                          if (isSelected) {
                            setSelectedConcept(null);
                            setSelectedChangeId(null);
                          } else {
                            setSelectedConcept(concept.name); 
                            setSelectedChangeId(null); 
                          }
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex justify-between items-center group border shadow-sm relative z-20
                          ${isSelected 
                            ? `${colors.bg} ${colors.text} ${colors.activeBorder} ring-1 ${colors.ring}` 
                            : `bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md`
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <span className={`w-3 h-3 rounded-full mr-3 ${colors.bg.replace('bg-', 'bg-').replace('100', '500')}`}></span>
                          {concept.name}
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/50' : 'bg-slate-100 group-hover:bg-slate-200 text-slate-600'}`}>
                          {count}
                        </span>
                      </button>
                      
                      {/* Drawer / Expansion Panel */}
                      <div className={`
                        overflow-hidden transition-all duration-300 ease-in-out
                        ${isSelected ? 'max-h-[500px] opacity-100 mt-2 mb-2' : 'max-h-0 opacity-0'}
                      `}>
                        <div className={`mx-1 p-4 bg-white border border-slate-200 rounded-xl shadow-inner relative z-10`}>
                          <div className="mb-4">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Definition</h5>
                            <p className="text-sm leading-relaxed text-slate-700">{concept.description}</p>
                          </div>
                          
                          {/* Inline Navigation within Drawer */}
                          {conceptHighlights.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-between border border-slate-100">
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigateHighlights('prev', concept.name); }}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded text-slate-600 transition-all"
                                title="Previous Instance"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-medium text-slate-500">
                                {selectedChangeId ? `${currentIndex + 1} / ${conceptHighlights.length}` : `${conceptHighlights.length} instances`}
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigateHighlights('next', concept.name); }}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded text-slate-600 transition-all"
                                title="Next Instance"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
              })}
          </div>

          {step === AppStep.REVIEW_ANALYSIS && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <button 
                onClick={() => setShowSystemInstruction(!showSystemInstruction)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
              >
                  <span>System Prompt</span>
                  {showSystemInstruction ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${showSystemInstruction ? 'max-h-60 mt-3' : 'max-h-0'}`}>
                  <div className="bg-slate-900 rounded-xl p-4 shadow-inner">
                    <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono overflow-y-auto max-h-48 custom-scrollbar">
                      {docState.analysis?.systemInstruction}
                    </pre>
                  </div>
              </div>
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inclusivity Mirror</h1>
          </div>
          {step > AppStep.UPLOAD_REFERENCE && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Start Over
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <StepIndicator currentStep={step} />

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 min-h-[600px] flex flex-col">
          
          {/* STEP 1: Upload Reference */}
          {step === AppStep.UPLOAD_REFERENCE && (
            <div className="p-8 animate-in fade-in duration-500 flex-1 flex flex-col">
              <div className="max-w-2xl mx-auto text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Step 1: The Gold Standard</h2>
                <p className="text-lg text-slate-600">
                  Upload a document (PDF, Text, Markdown) that represents the ideal inclusive voice you want to replicate. 
                  We'll analyze its DNA.
                </p>
              </div>
              
              <div className="max-w-3xl mx-auto w-full">
                <FileUpload 
                  label="Reference Document (Source of Truth)" 
                  onFileSelect={handleReferenceSelect}
                />
                <div className="mt-8 flex justify-end">
                  <Button 
                    onClick={runAnalysis} 
                    disabled={!docState.reference || !docState.reference.data}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Analyze DNA <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Loading Analysis */}
          {step === AppStep.ANALYZING && (
            <div className="flex flex-col items-center justify-center flex-1 p-8 animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-slate-900">Decoding Inclusivity Patterns...</h3>
              <p className="mt-2 text-slate-500">Extracting text, analyzing tone, and finding evidence.</p>
            </div>
          )}

          {/* STEP 3: Review Analysis (SIDEBAR LAYOUT) */}
          {step === AppStep.REVIEW_ANALYSIS && docState.analysis && (
            <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
                    Inclusivity DNA Extracted
                  </h2>
                  <p className="text-sm text-slate-500">
                     We found {docState.analysis.characteristics.length} key traits in your reference document.
                  </p>
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" onClick={() => handleStepChange(AppStep.UPLOAD_REFERENCE)}>
                    <ArrowLeft className="mr-2 w-4 h-4" /> Back
                  </Button>
                  <Button onClick={() => handleStepChange(AppStep.UPLOAD_TARGET)}>
                    Next: Upload Target <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Interactive Pills & Drawers */}
                <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto custom-scrollbar relative z-10">
                   {renderSidebarContent()}
                </div>

                {/* Right Column: Reference Content & Highlights */}
                <div className="w-2/3 bg-white flex flex-col relative" ref={contentContainerRef}>
                   <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm sticky top-0 z-20">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                        Analyzed Reference Content
                        {docState.reference?.isBinary && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">PDF EXTRACTED</span>}
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center bg-white px-2 py-1 rounded-full border border-slate-200">
                         <MousePointerClick className="w-3 h-3 mr-1" />
                         Click sidebar items to explore
                      </div>
                   </div>
                   
                   {/* Context-aware popover for Review step - Moved outside scroll container and made relative to the panel */}
                   {selectedChangeId && (
                      <div className="absolute top-20 right-8 z-30 max-w-md animate-in fade-in slide-in-from-right-4 duration-200">
                         {(() => {
                            const highlight = docState.analysis?.highlights.find(h => h.id === selectedChangeId);
                            if (!highlight) return null;
                            const colors = conceptColorMap[highlight.characteristic] || CONCEPT_COLORS[0];
                            return (
                              <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 ring-1 ring-slate-100/50 backdrop-blur-md bg-white/95 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colors.badge}`}>
                                      {highlight.characteristic}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed mb-3 italic pl-3 border-l-2 border-slate-200">
                                    "{highlight.snippet}"
                                  </p>
                                  <div className="text-xs bg-slate-50 p-3 rounded-lg text-slate-700 font-medium border border-slate-100">
                                    <span className="font-bold text-indigo-600 block mb-1">Analysis:</span>
                                    {highlight.explanation}
                                  </div>
                                  <button 
                                    onClick={() => setSelectedChangeId(null)}
                                    className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 transition-colors"
                                  >
                                    <span className="sr-only">Close</span>
                                    &times;
                                  </button>
                              </div>
                            )
                         })()}
                      </div>
                   )}

                   <div className="flex-1 overflow-y-auto p-8 relative bg-slate-50/30">
                      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-slate-100 min-h-full p-8 rounded-lg">
                        {renderHighlightedText(
                          docState.analysis.fullText, 
                          docState.analysis.highlights.map(h => ({
                            id: h.id,
                            snippet: h.snippet,
                            concept: h.characteristic,
                            explanation: h.explanation
                          }))
                        )}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

           {/* STEP 4: Upload Target */}
           {step === AppStep.UPLOAD_TARGET && (
            <div className="p-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
              <div className="max-w-2xl mx-auto text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Step 2: The Target</h2>
                <p className="text-lg text-slate-600">
                  Upload the document (PDF, Text, Markdown) you want to rewrite using the extracted Inclusive DNA.
                </p>
              </div>
              
              <div className="max-w-3xl mx-auto w-full">
                <FileUpload 
                  label="Target Document (To be rewritten)" 
                  onFileSelect={handleTargetSelect}
                  placeholder="Paste the text you want to transform..."
                />
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost" onClick={() => handleStepChange(AppStep.REVIEW_ANALYSIS)}>
                    <ArrowLeft className="mr-2 w-4 h-4" /> Back to Analysis
                  </Button>
                  <Button 
                    onClick={runRewrite} 
                    disabled={!docState.target || !docState.target.data}
                    size="lg"
                  >
                    Transform Content <Wand2 className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Rewriting Loading */}
          {step === AppStep.REWRITING && (
             <div className="flex flex-col items-center justify-center flex-1 p-8 animate-in fade-in zoom-in duration-300">
             <div className="relative">
               <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <RefreshCw className="w-6 h-6 text-indigo-600 animate-pulse" />
               </div>
             </div>
             <h3 className="mt-6 text-xl font-semibold text-slate-900">Applying Inclusive DNA...</h3>
             <p className="mt-2 text-slate-500">Extracting text, analyzing inclusivity gaps, and rewriting...</p>
           </div>
          )}

          {/* STEP 6: Result Review (REDESIGNED SIDEBAR LAYOUT) */}
          {step === AppStep.RESULT && docState.result && (
            <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-700 relative">
              {/* Toolbar */}
              <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <FileCheck className="w-5 h-5 mr-2 text-green-600" /> 
                  Transformation Complete
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleStepChange(AppStep.UPLOAD_TARGET)}>
                    Try Another Doc
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleStepChange(AppStep.EXPORT)}>
                    Proceed to Export <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-1 overflow-hidden" ref={contentContainerRef}>
                
                 {/* Left Column: Sidebar (Shared Component Logic) */}
                 <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto custom-scrollbar relative z-10 shrink-0">
                   {renderSidebarContent()}
                 </div>

                {/* Main Content Area: Split View */}
                <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden h-full min-w-0">
                  
                  {/* Original Column */}
                  <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-100/50 backdrop-blur-sm sticky top-0 z-20">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                        Original Content 
                        {docState.target?.isBinary && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">PDF EXTRACTED</span>}
                      </h3>
                      {docState.targetFileName && <p className="text-xs text-slate-400 mt-1 truncate">{docState.targetFileName}</p>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                      {renderHighlightedText(
                        docState.result.originalText, 
                        docState.result.changes.map(c => ({
                          id: c.id,
                          snippet: c.originalSnippet,
                          concept: c.concept,
                          explanation: c.explanation
                        }))
                      )}
                    </div>
                  </div>

                  {/* Rewritten Column */}
                  <div className="flex-1 flex flex-col bg-white min-w-0">
                    <div className="p-4 border-b border-slate-100 sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" /> Rewritten (Inclusive)
                      </h3>
                    </div>
                    {/* Apply the extracted visual style here */}
                    <div 
                      className="flex-1 overflow-y-auto p-6 scroll-smooth"
                      style={{
                        fontFamily: docState.result.finalLayoutStyle?.fontFamily,
                        lineHeight: docState.result.finalLayoutStyle?.lineHeight,
                        color: docState.result.finalLayoutStyle?.textColor,
                        backgroundColor: docState.result.finalLayoutStyle?.backgroundColor,
                        textAlign: docState.result.finalLayoutStyle?.textAlign as any,
                        padding: docState.result.finalLayoutStyle?.spacing,
                        fontSize: docState.result.finalLayoutStyle?.fontSize
                      }}
                    >
                      {renderHighlightedText(
                        docState.result.rewrittenText, 
                        docState.result.changes.map(c => ({
                          id: c.id,
                          snippet: c.rewrittenSnippet,
                          concept: c.concept,
                          explanation: c.explanation
                        }))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Highlight Popover (Context Aware for Result Step) */}
              {selectedChangeId && (
                <div className="absolute bottom-8 right-8 z-30 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {(() => {
                      const change = docState.result.changes.find(c => c.id === selectedChangeId);
                      if (!change) return null;
                      const colors = conceptColorMap[change.concept] || CONCEPT_COLORS[0];
                      return (
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 ring-1 ring-slate-100/50 backdrop-blur-md bg-white/95 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colors.badge}`}>
                                {change.concept}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                              <div className="p-2 bg-red-50/50 border border-red-100 rounded">
                                <span className="text-[10px] text-red-400 font-bold block mb-1">BEFORE</span>
                                <p className="text-slate-700">"{change.originalSnippet}"</p>
                              </div>
                              <div className="p-2 bg-green-50/50 border border-green-100 rounded">
                                <span className="text-[10px] text-green-400 font-bold block mb-1">AFTER</span>
                                <p className="text-slate-700">"{change.rewrittenSnippet}"</p>
                              </div>
                            </div>

                            <div className="text-xs bg-slate-50 p-3 rounded-lg text-slate-700 font-medium border border-slate-100">
                              <span className="font-bold text-indigo-600 block mb-1">Reasoning:</span>
                              {change.explanation}
                            </div>
                            <button 
                              onClick={() => setSelectedChangeId(null)}
                              className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 transition-colors"
                            >
                              <span className="sr-only">Close</span>
                              &times;
                            </button>
                        </div>
                      )
                    })()}
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Export */}
          {step === AppStep.EXPORT && docState.result?.rewrittenText && (
            <div className="p-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
               <div className="mb-6 flex items-center justify-between">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">Export Document</h2>
                    <p className="text-slate-500 mt-1">Choose a format to save your inclusive content.</p>
                 </div>
                 <Button variant="outline" onClick={() => handleStepChange(AppStep.RESULT)}>
                    <ArrowLeft className="mr-2 w-4 h-4" /> Back to Review
                 </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 {/* PDF Export Card */}
                 <button 
                    onClick={handlePdfExport}
                    className="flex flex-col items-center p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="p-4 bg-red-100 rounded-full mb-4 group-hover:bg-red-200 transition-colors">
                      <FileBox className="w-8 h-8 text-red-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Export as PDF</span>
                    <span className="text-xs text-slate-500 mt-1">Ready for print & share</span>
                 </button>

                 {/* Word Export Card */}
                 <button 
                    onClick={handleWordExport}
                    className="flex flex-col items-center p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="p-4 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                      <FileType className="w-8 h-8 text-blue-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Export as Word</span>
                    <span className="text-xs text-slate-500 mt-1">Editable .doc format</span>
                 </button>

                 {/* Copy Card */}
                 <button 
                    onClick={copyToClipboard}
                    className="flex flex-col items-center p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="p-4 bg-indigo-100 rounded-full mb-4 group-hover:bg-indigo-200 transition-colors">
                      {copied ? <Check className="w-8 h-8 text-indigo-600" /> : <Copy className="w-8 h-8 text-indigo-600" />}
                    </div>
                    <span className="font-semibold text-slate-900">{copied ? "Copied!" : "Copy to Clipboard"}</span>
                    <span className="text-xs text-slate-500 mt-1">Paste anywhere</span>
                 </button>
               </div>

               {/* Document Preview Area */}
               <div className="flex-1 bg-slate-100 rounded-xl p-8 overflow-y-auto border border-slate-200 shadow-inner flex justify-center">
                  <div 
                    ref={exportContentRef}
                    id="export-content"
                    className="bg-white shadow-lg p-12 max-w-[210mm] w-full min-h-[297mm] mx-auto text-slate-900"
                    style={{
                      fontFamily: docState.result.finalLayoutStyle?.fontFamily,
                      lineHeight: docState.result.finalLayoutStyle?.lineHeight,
                      color: docState.result.finalLayoutStyle?.textColor,
                      backgroundColor: docState.result.finalLayoutStyle?.backgroundColor,
                      textAlign: docState.result.finalLayoutStyle?.textAlign as any,
                      padding: docState.result.finalLayoutStyle?.spacing,
                      fontSize: docState.result.finalLayoutStyle?.fontSize
                    }}
                  >
                    <div className="mb-8 border-b border-slate-200 pb-4">
                      <h1 className="text-2xl font-bold text-slate-900">Inclusive Document</h1>
                      <p className="text-sm text-slate-400 mt-2">Generated by Inclusivity Mirror</p>
                    </div>
                    <div className="prose max-w-none whitespace-pre-wrap font-serif leading-relaxed">
                      {docState.result.rewrittenText}
                    </div>
                  </div>
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;