import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Settings, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Printer, 
  Plus, 
  Copy, 
  Check, 
  Sparkles, 
  AlertTriangle,
  Upload,
  Edit2,
  Save,
  X,
  FileCode,
  FileSpreadsheet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { convertImageToQuestion, generateSolutionsForPaper, generatePracticeSets } from './services/gemini';
import katex from 'katex';
import mermaid from 'mermaid';

const LATEX_SYMBOLS = [
  { label: 'Fraction', insert: '\\frac{a}{b} ', display: 'a/b' },
  { label: 'Square Root', insert: '\\sqrt{x} ', display: '√x' },
  { label: 'Exponent', insert: '^2 ', display: 'x²' },
  { label: 'Subscript', insert: '_n ', display: 'xₙ' },
  { label: 'Integral', insert: '\\int ', display: '∫' },
  { label: 'Sum', insert: '\\sum ', display: '∑' },
  { label: 'Limit', insert: '\\lim_{x \\to 0} ', display: 'lim' },
  { label: 'Greek Pi', insert: '\\pi ', display: 'π' },
  { label: 'Greek Theta', insert: '\\theta ', display: 'θ' },
  { label: 'Greek Alpha', insert: '\\alpha ', display: 'α' },
  { label: 'Greek Beta', insert: '\\beta ', display: 'β' },
  { label: 'Greek Delta', insert: '\\Delta ', display: 'Δ' },
  { label: 'Multiply', insert: '\\times ', display: '×' },
  { label: 'Divide', insert: '\\div ', display: '÷' },
  { label: 'Plus-Minus', insert: '\\pm ', display: '±' },
  { label: 'Not Equal', insert: '\\neq ', display: '≠' },
  { label: 'Less/Equal', insert: '\\le ', display: '≤' },
  { label: 'Greater/Equal', insert: '\\ge ', display: '≥' },
  { label: 'Infinity', insert: '\\infty ', display: '∞' },
  { label: 'Matrix', insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} ', display: '[Matrix]' }
];

function LatexToolbar({ textareaRef, value, onChange }) {
  const handleInsert = (symbol) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + symbol);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end, value.length);
    const newValue = before + symbol + after;
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
    }, 0);
  };

  return (
    <div className="flex flex-wrap gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg max-w-full overflow-x-auto mb-1.5 no-print select-none">
      {LATEX_SYMBOLS.map((s, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => handleInsert(s.insert)}
          className="px-2 py-0.5 text-[10px] md:text-xs font-mono font-medium rounded bg-slate-950 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors active:scale-95"
          title={s.label}
        >
          {s.display}
        </button>
      ))}
    </div>
  );
}


// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
});

// KaTeX LaTeX renderer helper component
function LatexRenderer({ text }) {
  if (!text) return null;
  
  // Split by double dollar signs, then single dollar signs, matching across lines
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
  
  return (
    <span className="latex-container">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-3 overflow-x-auto" />;
          } catch (e) {
            return <code key={index} className="text-red-500 bg-red-50 px-1 rounded">{part}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block px-0.5" />;
          } catch (e) {
            return <code key={index} className="text-red-500 bg-red-50 px-1 rounded">{part}</code>;
          }
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      })}
    </span>
  );
}

// Mermaid Diagram renderer component
function MermaidRenderer({ code, id }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    setError(null);
    const elementId = `mermaid-${id}`;
    
    try {
      mermaid.render(elementId, code).then(({ svg }) => {
        setSvg(svg);
      }).catch(err => {
        console.error("Mermaid Render Error:", err);
        setError(err.message || 'Error rendering diagram');
        // Clean up broken elements
        const badElement = document.getElementById(elementId);
        if (badElement) badElement.remove();
      });
    } catch (err) {
      setError(err.message || 'Error rendering diagram');
    }
  }, [code, id]);

  if (error) {
    return (
      <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-lg text-red-400 text-xs font-mono my-2 no-print">
        <p className="font-bold flex items-center gap-1"><AlertTriangle size={14} /> Diagram Render Error</p>
        <pre className="mt-1 whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: svg }} 
      className="mermaid-diagram flex justify-center py-4 my-2 max-w-full overflow-x-auto bg-slate-50/50 rounded-lg border border-slate-100" 
    />
  );
}

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('mq_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Tab navigation states
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'generator'

  // AI Practice Generator states
  const [uploadedPDFs, setUploadedPDFs] = useState([]);
  const [questionsPerSet, setQuestionsPerSet] = useState(10);
  const [numberOfSets, setNumberOfSets] = useState(3);
  const [customInstructions, setCustomInstructions] = useState('');
  const [practiceSets, setPracticeSets] = useState(() => {
    const saved = localStorage.getItem('paper_practice_sets');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGeneratingSets, setIsGeneratingSets] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState({});

  const [coachingName, setCoachingName] = useState(() => localStorage.getItem('coaching_name') || 'SBS COACHING CENTRE');
  const [practiceExtraInfo, setPracticeExtraInfo] = useState(() => localStorage.getItem('practice_extra_info') || 'Mathematics Practice Worksheet');

  // State for Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('gemini_api_key'));
  const [tempKey, setTempKey] = useState(apiKey);

  // State for Paper Configurations
  const [paperMeta, setPaperMeta] = useState(() => {
    const saved = localStorage.getItem('paper_meta');
    return saved ? JSON.parse(saved) : {
      schoolName: 'GLOBAL ACADEMY OF ADVANCED MATHEMATICS',
      examTitle: 'ANNUAL MATHEMATICS EXAMINATION',
      subject: 'Mathematics (Class XII)',
      timeAllowed: '3 Hours',
      maxMarks: '80 Marks',
      instructions: [
        'All questions are compulsory.',
        'The question paper consists of three sections: A, B, and C.',
        'Use of calculators is strictly prohibited.',
        'Show all steps and calculations clearly.'
      ]
    };
  });

  // State for Paper Questions
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('paper_questions');
    return saved ? JSON.parse(saved) : [];
  });

  // State for AI Solutions
  const [solutions, setSolutions] = useState(() => {
    const saved = localStorage.getItem('paper_solutions');
    return saved ? JSON.parse(saved) : [];
  });

  const [isGeneratingSolutions, setIsGeneratingSolutions] = useState(false);
  const [includeSolutionsInPrint, setIncludeSolutionsInPrint] = useState(true);

  // Editor states
  const [pastedImage, setPastedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState(null);
  
  // App UI States
  const [copySuccess, setCopySuccess] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingMarks, setEditingMarks] = useState(5);
  const [editingDiagramCode, setEditingDiagramCode] = useState('');
  const [editingDiagramType, setEditingDiagramType] = useState('none');

  const fileInputRef = useRef(null);
  const pendingTextareaRef = useRef(null);
  const editingTextareaRef = useRef(null);

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('paper_meta', JSON.stringify(paperMeta));
  }, [paperMeta]);

  useEffect(() => {
    localStorage.setItem('paper_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('paper_solutions', JSON.stringify(solutions));
  }, [solutions]);

  useEffect(() => {
    localStorage.setItem('paper_practice_sets', JSON.stringify(practiceSets));
  }, [practiceSets]);

  useEffect(() => {
    localStorage.setItem('coaching_name', coachingName);
  }, [coachingName]);

  useEffect(() => {
    localStorage.setItem('practice_extra_info', practiceExtraInfo);
  }, [practiceExtraInfo]);

  // Global listener for paste event
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      // Check if target is not input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          handleImageBlob(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [apiKey]);

  // Handle selected image file or pasted blob
  const handleImageBlob = (blob) => {
    if (!apiKey) {
      setErrorMsg("Please set your Gemini API Key in Settings first!");
      setShowSettings(true);
      return;
    }
    setErrorMsg('');
    setPastedImage(null);
    setPendingQuestion(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      setPastedImage(base64Data);
      await processImageWithAI(base64Data, blob.type);
    };
    reader.readAsDataURL(blob);
  };

  const processImageWithAI = async (base64Data, mimeType) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await convertImageToQuestion(base64Data, mimeType, apiKey);
      setPendingQuestion(response);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred while processing the image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      if (files[0].type.startsWith('image/')) {
        handleImageBlob(files[0]);
      } else {
        setErrorMsg("Please drop an image file.");
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageBlob(files[0]);
    }
  };

  // Add question to main paper
  const addPendingQuestionToPaper = () => {
    if (!pendingQuestion) return;
    
    const newQuestion = {
      id: Date.now().toString(),
      questionText: pendingQuestion.questionText,
      hasDiagram: pendingQuestion.hasDiagram,
      diagramType: pendingQuestion.diagramType,
      diagramCode: pendingQuestion.diagramCode,
      marks: pendingQuestion.suggestedMarks || 5,
      isPageBreakAfter: false
    };

    setQuestions([...questions, newQuestion]);
    setPendingQuestion(null);
    setPastedImage(null);
  };

  // Delete question
  const deleteQuestion = (id) => {
    if (confirm("Are you sure you want to delete this question?")) {
      setQuestions(questions.filter(q => q.id !== id));
      setSolutions(solutions.filter(s => s.id !== id));
      if (editingQuestionId === id) {
        setEditingQuestionId(null);
      }
    }
  };

  // Move questions
  const moveQuestion = (index, direction) => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setQuestions(updated);
  };

  // Toggle Page Break
  const togglePageBreak = (index) => {
    const updated = [...questions];
    updated[index].isPageBreakAfter = !updated[index].isPageBreakAfter;
    setQuestions(updated);
  };

  // Settings Save
  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempKey.trim());
    setApiKey(tempKey.trim());
    setShowSettings(false);
  };

  // Reset/Clear Document
  const clearPaper = () => {
    if (confirm("Are you sure you want to clear the entire question paper? This will delete all questions and solutions.")) {
      setQuestions([]);
      setSolutions([]);
      setPendingQuestion(null);
      setPastedImage(null);
    }
  };

  // Start manual question drafting
  const startManualQuestionDraft = () => {
    setErrorMsg('');
    setPastedImage(null);
    setPendingQuestion({
      questionText: 'Write your question text here (use $...$ for inline math and $$...$$ for formulas)...',
      hasDiagram: false,
      diagramType: 'none',
      diagramCode: '',
      suggestedMarks: 5
    });
  };

  // Unlock security workspace
  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    if (pinInput === 'satya@SBS') {
      setIsAuthenticated(true);
      sessionStorage.setItem('mq_auth', 'true');
      setPinError(false);
    } else {
      setPinError(true);
      setTimeout(() => {
        setPinError(false);
      }, 500);
    }
  };

  // Generate Solutions via Gemini API
  const generateSolutions = async () => {
    if (questions.length === 0) return;
    if (!apiKey) {
      setErrorMsg("Please set your Gemini API Key in Settings first!");
      setShowSettings(true);
      return;
    }
    setIsGeneratingSolutions(true);
    setErrorMsg('');
    try {
      const solutionList = await generateSolutionsForPaper(paperMeta, questions, apiKey);
      setSolutions(solutionList);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to generate solutions. Please try again.");
    } finally {
      setIsGeneratingSolutions(false);
    }
  };

  // Export to CSV spreadsheet format
  const exportToCSV = () => {
    if (questions.length === 0) return;
    
    const headers = ["Question Number", "Question Text", "Marks", "Has Diagram", "Diagram Type", "Diagram Code"];
    
    const escapeCSVValue = (val) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = questions.map((q, idx) => [
      `Q${idx + 1}`,
      q.questionText,
      q.marks,
      q.hasDiagram ? "Yes" : "No",
      q.diagramType || "none",
      q.diagramCode || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(escapeCSVValue).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${paperMeta.examTitle.replace(/\s+/g, '_') || 'question_paper'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PDF Practice Generator Helpers
  const handlePDFUpload = (files) => {
    setErrorMsg('');
    const validPDFs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (validPDFs.length === 0) {
      setErrorMsg('Please select valid PDF files.');
      return;
    }

    validPDFs.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setUploadedPDFs(prev => [
          ...prev,
          {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            base64: base64
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePDF = (id) => {
    setUploadedPDFs(uploadedPDFs.filter(f => f.id !== id));
  };

  const generatePractice = async () => {
    if (uploadedPDFs.length === 0) {
      setErrorMsg("Please upload at least one PDF file.");
      return;
    }
    if (!apiKey) {
      setErrorMsg("Please set your Gemini API Key in Settings first!");
      setShowSettings(true);
      return;
    }
    setIsGeneratingSets(true);
    setErrorMsg('');
    try {
      const sets = await generatePracticeSets(
        uploadedPDFs,
        questionsPerSet,
        numberOfSets,
        customInstructions,
        apiKey
      );
      setPracticeSets(sets);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to generate practice sets. Please try again.");
    } finally {
      setIsGeneratingSets(false);
    }
  };

  const importQuestionToBuilder = (questionText, marks) => {
    const newQuestion = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      questionText: questionText,
      hasDiagram: false,
      diagramType: 'none',
      diagramCode: '',
      marks: marks || 5,
      isPageBreakAfter: false
    };
    setQuestions(prev => [...prev, newQuestion]);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    setActiveTab('builder');
  };

  const importAllQuestionsFromSet = (set) => {
    const newQuestions = set.questions.map((q, idx) => ({
      id: (Date.now() + idx).toString() + Math.random().toString(36).substr(2, 5),
      questionText: q.questionText,
      hasDiagram: false,
      diagramType: 'none',
      diagramCode: '',
      marks: q.marks || 5,
      isPageBreakAfter: false
    }));
    setQuestions(prev => [...prev, ...newQuestions]);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    setActiveTab('builder');
  };

  const renderLatexToHTMLString = (text) => {
    if (!text) return '';
    const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
    return parts.map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const formula = part.slice(2, -2).trim();
        try {
          return katex.renderToString(formula, { displayMode: true, throwOnError: false });
        } catch (e) {
          return `<span style="color: red;">${part}</span>`;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const formula = part.slice(1, -1).trim();
        try {
          return katex.renderToString(formula, { displayMode: false, throwOnError: false });
        } catch (e) {
          return `<span style="color: red;">${part}</span>`;
        }
      }
      return part.replace(/\n/g, '<br/>');
    }).join('');
  };

  const printPracticeSet = (setIdx) => {
    const set = practiceSets[setIdx];
    if (!set) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print practice sets.");
      return;
    }

    const htmlContent = `
      <!doctype html>
      <html>
        <head>
          <title>${set.setName || 'Practice Set'}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            @page { size: A4; margin: 1in; }
            body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.6; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 25px; }
            .coaching-name { font-size: 18pt; font-weight: bold; text-transform: uppercase; }
            .set-name { font-size: 13pt; font-weight: bold; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
            .extra-info { font-size: 11pt; font-style: italic; margin-top: 5px; color: #444; }
            .questions { margin-top: 15px; }
            .question-row { display: flex; align-items: start; margin-bottom: 20px; page-break-inside: avoid; }
            .q-num { width: 6%; font-weight: bold; font-size: 11pt; }
            .q-text { width: 84%; font-size: 11pt; }
            .q-marks { width: 10%; text-align: right; font-weight: bold; font-size: 11pt; }
            .solutions-section { margin-top: 40px; border-top: 2px dashed #000; padding-top: 25px; page-break-before: always; }
            .solutions-title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
            .solution-row { margin-bottom: 22px; page-break-inside: avoid; font-size: 11pt; }
            .sol-label { font-weight: bold; font-style: italic; margin-bottom: 4px; display: block; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="coaching-name">${coachingName}</div>
            <div class="set-name">${set.setName || ('PRACTICE SET ' + (setIdx + 1))}</div>
            <div class="extra-info">${practiceExtraInfo}</div>
          </div>
          
          <div class="questions">
            ${set.questions.map((q, idx) => `
              <div class="question-row">
                <div class="q-num">Q${idx + 1}.</div>
                <div class="q-text">${renderLatexToHTMLString(q.questionText)}</div>
                <div class="q-marks">[${q.marks || 5} Marks]</div>
              </div>
            `).join('')}
          </div>

          <div class="solutions-section">
            <div class="solutions-title">ANSWER KEY & SOLUTIONS</div>
            ${set.questions.map((q, idx) => `
              <div class="solution-row">
                <div class="sol-label">Q${idx + 1}. Solution:</div>
                <div>${renderLatexToHTMLString(q.solutionText)}</div>
              </div>
            `).join('')}
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const toggleSolutionVisibility = (setIdx, qIdx) => {
    const key = `${setIdx}-${qIdx}`;
    setExpandedSolutions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };


  // Edit Inline Question Handlers
  const startEditing = (q) => {
    setEditingQuestionId(q.id);
    setEditingText(q.questionText);
    setEditingMarks(q.marks);
    setEditingDiagramType(q.diagramType || 'none');
    setEditingDiagramCode(q.diagramCode || '');
  };

  const saveQuestionEdits = (id) => {
    const updated = questions.map(q => {
      if (q.id === id) {
        return {
          ...q,
          questionText: editingText,
          marks: Number(editingMarks),
          diagramType: editingDiagramType,
          diagramCode: editingDiagramType === 'none' ? '' : editingDiagramCode,
          hasDiagram: editingDiagramType !== 'none'
        };
      }
      return q;
    });
    setQuestions(updated);
    setEditingQuestionId(null);
  };

  // Edit instructions
  const updateInstruction = (index, value) => {
    const updated = [...paperMeta.instructions];
    updated[index] = value;
    setPaperMeta({ ...paperMeta, instructions: updated });
  };

  const removeInstruction = (index) => {
    const updated = paperMeta.instructions.filter((_, i) => i !== index);
    setPaperMeta({ ...paperMeta, instructions: updated });
  };

  const addInstruction = () => {
    setPaperMeta({ 
      ...paperMeta, 
      instructions: [...paperMeta.instructions, 'New Instruction'] 
    });
  };

  // Exporters
  const triggerPrint = () => {
    window.print();
  };

  // Export to LaTeX (.tex)
  const exportToLaTeX = () => {
    let latex = `% LaTeX Math Question Paper Generated by MathQuest
\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}
\\usepackage{graphicx}
\\geometry{a4paper, margin=1in}

\\begin{document}

\\begin{center}
    {\\Large\\bfseries ${paperMeta.schoolName.toUpperCase()}} \\\\[0.5em]
    {\\large\\bfseries ${paperMeta.examTitle.toUpperCase()}} \\\\[0.3em]
    \\textbf{Subject: ${paperMeta.subject}}
\\end{center}

\\vspace{0.5em]
\\noindent
\\textbf{Time Allowed: ${paperMeta.timeAllowed}} \\hfill \\textbf{Maximum Marks: ${paperMeta.maxMarks}}
\\rule{\\textwidth}{1pt}

\\vspace{1em}
\\noindent
\\textbf{General Instructions:}
\\begin{enumerate}
${paperMeta.instructions.map(inst => `    \\item ${inst}`).join('\n')}
\\end{enumerate}

\\vspace{1em}
\\rule{\\textwidth}{0.5pt}
\\vspace{1.5em}

\\begin{enumerate}
`;

    questions.forEach((q) => {
      // Convert single/double dollars LaTeX text
      let qText = q.questionText;
      
      // LaTeX exports diagram as placeholders for compiling
      let diagramComment = '';
      if (q.hasDiagram) {
        diagramComment = `\n    % [Diagram Placeholder: ${q.diagramType.toUpperCase()} geometry figure. Verify vector code or insert tikz/graphic here.]`;
      }

      latex += `    \\item ${qText} ${diagramComment} \\hfill [${q.marks} Marks]\n`;
      
      if (q.isPageBreakAfter) {
        latex += `    \\newpage\n`;
      }
    });

    latex += `\\end{enumerate}

\\end{document}
`;

    // Download file
    const blob = new Blob([latex], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${paperMeta.examTitle.replace(/\s+/g, '_') || 'question_paper'}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to DOCX via standard Microsoft HTML format with embedded MathML
  const exportToDOCX = () => {
    // MathML Converter
    const latexToMathML = (text) => {
      if (!text) return '';
      // Regex search for $$...$$ and $...$
      const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
      return parts.map(part => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim();
          try {
            // Render to MathML output for Word equation parser compatibility
            return `<div style="text-align: center; margin: 10px 0;">${katex.renderToString(formula, { output: 'mathml', displayMode: true })}</div>`;
          } catch (e) {
            return `[Equation: ${formula}]`;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1).trim();
          try {
            return katex.renderToString(formula, { output: 'mathml', displayMode: false });
          } catch (e) {
            return `[Equation: ${formula}]`;
          }
        }
        // Escape standard characters for XML template safety
        return part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }).join('');
    };

    const instList = paperMeta.instructions.map(inst => `<li>${inst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`).join('\n');
    
    let questionsHTML = '';
    questions.forEach((q, idx) => {
      const cleanText = latexToMathML(q.questionText);
      let diagramHTML = '';
      if (q.hasDiagram && q.diagramType === 'svg') {
        // Embed SVG in exporting HTML. Word 2016+ parses this natively!
        diagramHTML = `<div style="text-align: center; margin: 15px 0;">${q.diagramCode}</div>`;
      } else if (q.hasDiagram && q.diagramType === 'mermaid') {
        diagramHTML = `<div style="text-align: center; margin: 15px 0; border: 1px dashed #ccc; padding: 10px;">[Diagram: Mermaid Flowchart: ${q.diagramCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}]</div>`;
      }

      questionsHTML += `
        <tr style="vertical-align: top;">
          <td style="width: 5%; font-size: 11pt; padding: 10px 0;">Q${idx + 1}.</td>
          <td style="width: 85%; font-size: 11pt; padding: 10px 10px 10px 0;">
            <div>${cleanText}</div>
            ${diagramHTML}
          </td>
          <td style="width: 10%; font-size: 11pt; text-align: right; font-weight: bold; padding: 10px 0;">
            [${q.marks} Marks]
          </td>
        </tr>
      `;

      if (q.isPageBreakAfter) {
        questionsHTML += `
          <tr>
            <td colspan="3"><br style="page-break-before: always; break-before: page;" /></td>
          </tr>
        `;
      }
    });

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Question Paper</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            line-height: 1.5;
          }
          .title-area {
            text-align: center;
            margin-bottom: 20px;
          }
          .school-name {
            font-size: 16pt;
            font-weight: bold;
          }
          .exam-title {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 5px;
          }
          .subject-title {
            font-size: 11pt;
            font-weight: bold;
            margin-top: 5px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #000000;
            margin-bottom: 15px;
          }
          .meta-table td {
            font-size: 11pt;
            font-weight: bold;
            padding-bottom: 5px;
          }
          .instructions-box {
            font-size: 10pt;
            font-style: italic;
            margin-bottom: 25px;
          }
          .instructions-box ol {
            margin-top: 5px;
            padding-left: 20px;
          }
          .questions-table {
            width: 100%;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div class="title-area">
          <div class="school-name">${paperMeta.schoolName.toUpperCase()}</div>
          <div class="exam-title">${paperMeta.examTitle.toUpperCase()}</div>
          <div class="subject-title">Subject: ${paperMeta.subject}</div>
        </div>
        
        <table class="meta-table">
          <tr>
            <td style="text-align: left;">Time Allowed: ${paperMeta.timeAllowed}</td>
            <td style="text-align: right;">Maximum Marks: ${paperMeta.maxMarks}</td>
          </tr>
        </table>
        
        <div class="instructions-box">
          <strong>General Instructions:</strong>
          <ol>
            ${instList}
          </ol>
        </div>
        
        <table class="questions-table">
          ${questionsHTML}
        </table>
      </body>
      </html>
    `;

    // Download formatted Blob as .doc file (Word reads this HTML package perfectly)
    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${paperMeta.examTitle.replace(/\s+/g, '_') || 'question_paper'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
        
        {/* Glow bubble background */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse-slow-1 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse-slow-2 pointer-events-none" />

        {/* Lock Screen Card */}
        <div className={`relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl space-y-6 text-center transition-all-300 ${pinError ? 'animate-shake border-red-500/30' : ''}`}>
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-xl flex items-center justify-center">
            {pinError ? <Lock className="animate-bounce" size={28} /> : <Lock size={28} />}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              MathQuest Secure Portal
            </h2>
            <p className="text-xs text-slate-400">
              Enter Security PIN to unlock the Question Paper Builder
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter security PIN..."
                autoFocus
                className={`w-full bg-slate-950 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors ${pinError ? 'border-red-500/40 focus:border-red-500/60' : 'border-slate-800 focus:border-indigo-500/60'}`}
              />
              <Key size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {pinError && (
              <p className="text-xs font-semibold text-red-400 text-left pl-1">
                Invalid security PIN. Please try again.
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm rounded-xl py-2.5 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Unlock Builder</span>
            </button>
          </form>

          <div className="text-[10px] text-slate-650">
            Authorized access only. System activity is logged.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      
      {/* Global Header */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              MathQuest
            </h1>
            <p className="text-xs text-slate-400 font-medium">Smart Question Paper Builder</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'builder' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Exam Builder
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'generator' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            AI Practice Generator
          </button>
        </div>

        {/* Global Action Header Items */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer ${
              apiKey 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Settings size={15} className={!apiKey ? 'animate-pulse' : ''} />
            <span>Settings</span>
          </button>
          
          <button 
            onClick={clearPaper}
            disabled={questions.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 hover:border-red-900/30 hover:bg-red-950/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Clear Paper</span>
          </button>
        </div>
      </header>

      {/* Main split-screen Layout based on activeTab */}
      {activeTab === 'builder' ? (
        <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input Control & Conversion Panel */}
        <section className="lg:col-span-5 space-y-6 no-print w-full">
          
          {/* Settings Section (Key Config) */}
          {showSettings && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-2xl space-y-4 transition-all duration-300">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                  <Settings size={18} className="text-indigo-400" />
                  Gemini API Configuration
                </h3>
                {apiKey && (
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                MathQuest uses Google's latest <code className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded">gemini-2.5-flash</code> model to transcribe questions, extract LaTeX code, and generate vector SVGs. Your key is stored locally in your browser.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">API Key</label>
                <div className="flex gap-2">
                  <input 
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="Enter your Gemini API Key..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <button 
                    onClick={saveApiKey}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl px-4 py-2 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 flex justify-between items-center bg-slate-950/40 p-2 rounded-lg">
                <span>Don't have a key?</span>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-400 hover:underline hover:text-indigo-300 font-medium"
                >
                  Get a free key from AI Studio →
                </a>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm animate-shake">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="font-semibold">Conversion Error</p>
                <p className="text-xs text-red-400/80 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Paste & Drop Zone */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`group border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
              pastedImage 
                ? 'border-indigo-500/40 bg-indigo-500/5' 
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-700'
            }`}
            onClick={triggerFileInput}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {pastedImage ? (
              <div className="space-y-4 max-w-full">
                <div className="relative inline-block mx-auto rounded-lg overflow-hidden border border-slate-700 max-h-[160px] shadow-lg">
                  <img src={pastedImage} alt="Clipboard upload" className="max-h-[150px] object-contain" />
                </div>
                <div className="text-slate-400 text-xs font-medium flex items-center justify-center gap-1">
                  <span>Image uploaded</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-slate-700 group-hover:text-indigo-400 transition-all duration-300">
                  <Upload size={22} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">
                    Paste image from Snipping Tool (<kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-xs font-mono">Ctrl+V</kbd>)
                  </p>
                  <p className="text-xs text-slate-400">or click to select an image from files</p>
                </div>
                <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto">
                  Drag & drop is also supported. Paste screenshots directly one by one.
                </p>
              </div>
            )}

            {/* OCR Processing overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 transition-opacity">
                <div className="relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Sparkles size={16} className="absolute text-indigo-400 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">AI Reading Equation & Diagram...</p>
                  <p className="text-[10px] text-slate-400">Transcribing math and drafting vector paths</p>
                </div>
              </div>
            )}
          </div>

          {/* Create Question Manually Button */}
          {!pendingQuestion && (
            <button
              onClick={startManualQuestionDraft}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 hover:text-white transition-all text-sm font-medium cursor-pointer"
            >
              <Plus size={16} className="text-indigo-400" />
              <span>Create Question Manually</span>
            </button>
          )}

          {/* Pending Question Review Editor */}
          {pendingQuestion && (
            <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/50 shadow-2xl p-5 space-y-4 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md flex items-center gap-1.5">
                  <Sparkles size={12} />
                  {pendingQuestion.isManual ? 'Manual Question Draft' : 'AI Draft Generated'}
                </span>
                
                <button 
                  onClick={() => setPendingQuestion(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Text Area for manual edit of extracted question */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Extracted / Drafted Text & Math (LaTeX)</label>
                  <LatexToolbar 
                    textareaRef={pendingTextareaRef} 
                    value={pendingQuestion.questionText} 
                    onChange={(val) => setPendingQuestion({ ...pendingQuestion, questionText: val })} 
                  />
                  <textarea 
                    ref={pendingTextareaRef}
                    value={pendingQuestion.questionText}
                    onChange={(e) => setPendingQuestion({ ...pendingQuestion, questionText: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Math expressions must be inside <code className="text-indigo-400 font-mono">$...$</code> for inline and <code className="text-indigo-400 font-mono">$$...$$</code> for block display.
                  </p>
                </div>

                {/* Edit Marks */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Allocated Marks</label>
                    <input 
                      type="number"
                      value={pendingQuestion.suggestedMarks || ''}
                      onChange={(e) => setPendingQuestion({ ...pendingQuestion, suggestedMarks: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Diagram Type</label>
                    <select 
                      value={pendingQuestion.diagramType}
                      onChange={(e) => setPendingQuestion({ 
                        ...pendingQuestion, 
                        diagramType: e.target.value,
                        hasDiagram: e.target.value !== 'none'
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="none">None</option>
                      <option value="svg">SVG Vector Path</option>
                      <option value="mermaid">Mermaid Diagram</option>
                    </select>
                  </div>
                </div>

                {pendingQuestion.diagramType !== 'none' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Diagram Code</label>
                    <textarea 
                      value={pendingQuestion.diagramCode || ''}
                      onChange={(e) => setPendingQuestion({ ...pendingQuestion, diagramCode: e.target.value })}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Rendered Equation and Diagram Preview */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-850 space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Live Render Preview</div>
                <div className="text-sm leading-relaxed text-slate-200">
                  <LatexRenderer text={pendingQuestion.questionText} />
                </div>
                
                {pendingQuestion.hasDiagram && pendingQuestion.diagramType === 'svg' && (
                  <div 
                    dangerouslySetInnerHTML={{ __html: pendingQuestion.diagramCode }} 
                    className="flex justify-center p-3 my-2 bg-white/5 rounded-lg border border-slate-800 max-h-[200px] overflow-auto select-none svg-preview-container [&_svg]:max-w-full [&_svg]:h-auto text-slate-200"
                  />
                )}
                {pendingQuestion.hasDiagram && pendingQuestion.diagramType === 'mermaid' && (
                  <MermaidRenderer code={pendingQuestion.diagramCode} id="pending" />
                )}
              </div>

              {/* Action Buttons */}
              <button 
                onClick={addPendingQuestionToPaper}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl py-2.5 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus size={16} />
                Add to Question Paper
              </button>
            </div>
          )}

          {/* Export and Action Panel */}
          {questions.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                <Download size={16} className="text-slate-400" />
                Export Options
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button 
                  onClick={triggerPrint}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all text-xs font-medium text-slate-400 cursor-pointer"
                >
                  <Printer size={18} className="text-indigo-400" />
                  <span>Print / PDF</span>
                </button>
                <button 
                  onClick={exportToDOCX}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all text-xs font-medium text-slate-400 cursor-pointer"
                >
                  <FileText size={18} className="text-blue-400" />
                  <span>Word (DOCX)</span>
                </button>
                <button 
                  onClick={exportToLaTeX}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all text-xs font-medium text-slate-400 cursor-pointer"
                >
                  <FileCode size={18} className="text-purple-400" />
                  <span>LaTeX (.tex)</span>
                </button>
                <button 
                  onClick={exportToCSV}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all text-xs font-medium text-slate-400 cursor-pointer"
                >
                  <FileSpreadsheet size={18} className="text-emerald-400" />
                  <span>Excel (CSV)</span>
                </button>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                <button
                  onClick={generateSolutions}
                  disabled={isGeneratingSolutions || questions.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-semibold cursor-pointer"
                >
                  {isGeneratingSolutions ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border border-indigo-400/20 border-t-indigo-400 animate-spin" />
                      <span>Generating Solutions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{solutions.length > 0 ? "Regenerate AI Solutions" : "Generate AI Solutions"}</span>
                    </>
                  )}
                </button>

                {solutions.length > 0 && (
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 select-none cursor-pointer mt-2 pl-1">
                    <input
                      type="checkbox"
                      checked={includeSolutionsInPrint}
                      onChange={(e) => setIncludeSolutionsInPrint(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Include Solutions key in Print / PDF</span>
                  </label>
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Physical Exam Document Preview & Editor */}
        <section className="lg:col-span-7 flex flex-col items-center">
          
          <div className="w-full text-center mb-4 text-xs font-medium text-slate-400 flex items-center justify-between no-print max-w-[800px]">
            <span>PAPER DRAFT ({questions.length} Questions)</span>
            <span className="text-[10px] text-slate-500">Auto-saved to LocalStorage</span>
          </div>

          {/* Interactive Marks Tracker */}
          {questions.length > 0 && (
            <div className="no-print w-full max-w-[800px] bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400 font-medium">Exam Progress</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">
                  Total Questions: <span className="text-indigo-400">{questions.length}</span> | Marks Allocated: <span className={questions.reduce((sum, q) => sum + (q.marks || 0), 0) > (parseInt(paperMeta.maxMarks.replace(/\D/g, '')) || 80) ? 'text-red-400' : questions.reduce((sum, q) => sum + (q.marks || 0), 0) === (parseInt(paperMeta.maxMarks.replace(/\D/g, '')) || 80) ? 'text-emerald-400' : 'text-indigo-400'}>{questions.reduce((sum, q) => sum + (q.marks || 0), 0)}</span> / {parseInt(paperMeta.maxMarks.replace(/\D/g, '')) || 80}
                </div>
              </div>
              <div className="flex-1 max-w-[200px] bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    questions.reduce((sum, q) => sum + (q.marks || 0), 0) > (parseInt(paperMeta.maxMarks.replace(/\D/g, '')) || 80) 
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                      : questions.reduce((sum, q) => sum + (q.marks || 0), 0) === (parseInt(paperMeta.maxMarks.replace(/\D/g, '')) || 80) 
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                        : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min((questions.reduce((sum, q) => sum + (q.marks || 0), 0) / (parseInt(paperMeta.maxMarks.replace(/\D/g, '')) || 80)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Exam Paper Container */}
          <div className="paper-preview w-full max-w-[800px] min-h-[1050px] bg-white text-slate-900 p-12 md:p-16 border border-slate-200 select-text transition-all duration-300 relative overflow-hidden shadow-2xl rounded-sm">
            
            {/* Double Border Top Section */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center select-all">
              {/* School Name */}
              <input 
                type="text"
                value={paperMeta.schoolName}
                onChange={(e) => setPaperMeta({ ...paperMeta, schoolName: e.target.value })}
                className="w-full font-bold text-center border-none focus:outline-none focus:bg-slate-100 rounded text-base md:text-lg tracking-wide uppercase font-serif"
                placeholder="SCHOOL/INSTITUTION NAME"
              />
              {/* Exam Title */}
              <input 
                type="text"
                value={paperMeta.examTitle}
                onChange={(e) => setPaperMeta({ ...paperMeta, examTitle: e.target.value })}
                className="w-full font-bold text-center border-none focus:outline-none focus:bg-slate-100 rounded text-xs md:text-sm mt-1 uppercase font-serif"
                placeholder="EXAMINATION NAME"
              />
              {/* Subject */}
              <input 
                type="text"
                value={paperMeta.subject}
                onChange={(e) => setPaperMeta({ ...paperMeta, subject: e.target.value })}
                className="w-full font-bold text-center border-none focus:outline-none focus:bg-slate-100 rounded text-xs md:text-sm mt-1 font-serif"
                placeholder="SUBJECT & CLASS"
              />
            </div>

            {/* Time and Marks Meta Row */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-6 font-bold text-xs md:text-sm font-serif select-all">
              <div className="flex items-center gap-1.5">
                <span>Time Allowed:</span>
                <input 
                  type="text"
                  value={paperMeta.timeAllowed}
                  onChange={(e) => setPaperMeta({ ...paperMeta, timeAllowed: e.target.value })}
                  className="w-24 border-none focus:outline-none focus:bg-slate-100 rounded p-0.5 font-bold font-serif"
                  placeholder="3 Hours"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span>Maximum Marks:</span>
                <input 
                  type="text"
                  value={paperMeta.maxMarks}
                  onChange={(e) => setPaperMeta({ ...paperMeta, maxMarks: e.target.value })}
                  className="w-24 border-none focus:outline-none focus:bg-slate-100 rounded p-0.5 font-bold text-right font-serif"
                  placeholder="80 Marks"
                />
              </div>
            </div>

            {/* General Instructions Section */}
            <div className="mb-6 text-xs md:text-sm leading-relaxed font-serif relative group/inst">
              <strong className="block mb-1 font-serif">General Instructions:</strong>
              
              <ol className="list-decimal pl-5 space-y-1 select-all font-serif">
                {paperMeta.instructions.map((inst, index) => (
                  <li key={index} className="group/item relative pr-8 font-serif">
                    <input 
                      type="text"
                      value={inst}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      className="w-full border-none focus:outline-none focus:bg-slate-100 rounded p-0.5 font-serif"
                    />
                    <button 
                      onClick={() => removeInstruction(index)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity no-print cursor-pointer"
                      title="Remove Instruction"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ol>

              <button 
                onClick={addInstruction}
                className="mt-2 text-indigo-600 hover:text-indigo-500 font-medium text-[11px] no-print flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add Instruction
              </button>
            </div>

            {/* Dividing Rule */}
            <hr className="border-t border-slate-900 mb-8" />

            {/* Question List View */}
            {questions.length === 0 ? (
              <div className="py-20 text-center text-slate-400 no-print flex flex-col items-center justify-center space-y-2">
                <FileText size={38} className="text-slate-300 stroke-[1.5]" />
                <p className="font-semibold text-slate-500 text-sm">No Questions Added Yet</p>
                <p className="text-xs text-slate-400 max-w-[280px]">
                  Use the left panel to upload or paste image files to parse math questions automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-6 select-text font-serif">
                {questions.map((q, index) => {
                  const isEditing = editingQuestionId === q.id;

                  return (
                    <div 
                      key={q.id} 
                      className={`group/q relative rounded-lg border-2 border-transparent transition-all font-serif ${
                        isEditing 
                          ? 'border-indigo-200 bg-indigo-50/20 p-4' 
                          : 'hover:border-slate-100 hover:bg-slate-50/40 p-2 -mx-2'
                      }`}
                    >
                      {/* Interactive hover utilities toolbar for questions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 no-print opacity-0 group-hover/q:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button 
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button 
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === questions.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        
                        <span className="w-[1px] h-3.5 bg-slate-300 mx-1" />

                        {isEditing ? (
                          <button 
                            onClick={() => saveQuestionEdits(q.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Save Changes"
                          >
                            <Save size={13} />
                            <span>Save</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => startEditing(q)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                            title="Edit Inline"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        )}
                        
                        <button 
                          onClick={() => togglePageBreak(index)}
                          className={`p-1 rounded text-[11px] font-medium cursor-pointer ${
                            q.isPageBreakAfter 
                              ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' 
                              : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                          }`}
                          title="Toggle Page Break after this question"
                        >
                          Break Page
                        </button>
                        
                        <button 
                          onClick={() => deleteQuestion(q.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Question Layout View */}
                      {isEditing ? (
                        /* Editing Sub-Form */
                        <div className="space-y-3 font-serif">
                          <div>
                            <label className="text-[11px] font-bold text-indigo-700 block mb-1">Question Content</label>
                            <LatexToolbar 
                              textareaRef={editingTextareaRef} 
                              value={editingText} 
                              onChange={(val) => setEditingText(val)} 
                            />
                            <textarea 
                              ref={editingTextareaRef}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={3}
                              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-serif"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-indigo-700 block mb-1">Marks</label>
                              <input 
                                type="number"
                                value={editingMarks}
                                onChange={(e) => setEditingMarks(Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-serif"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-indigo-700 block mb-1">Diagram Type</label>
                              <select 
                                value={editingDiagramType}
                                onChange={(e) => setEditingDiagramType(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-serif"
                              >
                                <option value="none">None</option>
                                <option value="svg">SVG Vector Path</option>
                                <option value="mermaid">Mermaid Diagram</option>
                              </select>
                            </div>
                          </div>

                          {editingDiagramType !== 'none' && (
                            <div>
                              <label className="text-[11px] font-bold text-indigo-700 block mb-1">Diagram Code</label>
                              <textarea 
                                value={editingDiagramCode}
                                onChange={(e) => setEditingDiagramCode(e.target.value)}
                                rows={3}
                                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Standard Question Render */
                        <div className="grid grid-cols-12 gap-3 items-start select-all font-serif">
                          {/* Question Number */}
                          <div className="col-span-1 font-bold text-xs md:text-sm font-serif select-none">
                            Q{index + 1}.
                          </div>
                          
                          {/* Question Text & Diagram */}
                          <div className="col-span-10 text-xs md:text-sm leading-relaxed font-serif">
                            <div className="font-serif">
                              <LatexRenderer text={q.questionText} />
                            </div>

                            {/* Render SVGs or Mermaid diagrams if they exist */}
                            {q.hasDiagram && q.diagramType === 'svg' && (
                              <div 
                                dangerouslySetInnerHTML={{ __html: q.diagramCode }} 
                                className="flex justify-center p-2 my-3 select-none svg-render-container [&_svg]:max-w-full [&_svg]:h-auto text-slate-900"
                              />
                            )}
                            {q.hasDiagram && q.diagramType === 'mermaid' && (
                              <MermaidRenderer code={q.diagramCode} id={q.id} />
                            )}
                          </div>
                          
                          {/* Question Marks */}
                          <div className="col-span-1 text-right font-bold text-xs md:text-sm font-serif whitespace-nowrap">
                            [{q.marks} Marks]
                          </div>
                        </div>
                      )}

                      {/* Visual separator indicator of page breaks in the workspace */}
                      {q.isPageBreakAfter && (
                        <div className="no-print mt-4 border-b border-dashed border-purple-300 text-center relative">
                          <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider relative top-1.5 select-none">
                            Page Break Inserted
                          </span>
                        </div>
                      )}

                      {/* Actual print page break wrapper element */}
                      {q.isPageBreakAfter && (
                        <div className="print-only page-break" />
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Solutions Section (Answer Key) */}
            {solutions.length > 0 && (
              <div className={`mt-12 pt-8 border-t-2 border-slate-900 font-serif page-break ${!includeSolutionsInPrint ? 'no-print' : ''}`}>
                <div className="text-center mb-6">
                  <h3 className="text-sm md:text-base font-bold uppercase tracking-wider font-serif">
                    ANSWER KEY & SOLUTIONS
                  </h3>
                  <p className="text-[10px] font-bold font-serif uppercase tracking-tight text-slate-500 mt-1">
                    For Internal/Teacher Reference Only
                  </p>
                </div>
                
                <div className="space-y-6 font-serif select-all">
                  {questions.map((q, idx) => {
                    const sol = solutions.find(s => s.id === q.id);
                    return (
                      <div key={q.id} className="grid grid-cols-12 gap-3 items-start font-serif">
                        <div className="col-span-1 font-bold text-xs md:text-sm select-none font-serif">
                          Q{idx + 1}.
                        </div>
                        <div className="col-span-11 text-xs md:text-sm leading-relaxed font-serif">
                          <div className="font-semibold mb-1 text-slate-700 italic font-serif">
                            Solution:
                          </div>
                          <div className="font-serif">
                            {sol ? (
                              <LatexRenderer text={sol.solutionText} />
                            ) : (
                              <span className="text-slate-400 italic">No solution generated. Regenerate to compile.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
        
      </main>
      ) : (
        <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 py-6 space-y-8 no-print">
          
          {/* Main practice generator workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Upload card & configs */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* PDF Upload Card */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                    <Upload size={16} className="text-indigo-400" />
                    Upload Math Reference PDFs
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload PDF documents (e.g. textbook chapters, syllabus guides, or class worksheets). Gemini will read and generate practice sets directly based on them.
                </p>

                {/* Upload drag drop zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handlePDFUpload(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => document.getElementById('pdf-file-input').click()}
                  className="border-2 border-dashed border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-slate-750 transition-all rounded-xl p-6 text-center cursor-pointer space-y-2 select-none"
                >
                  <input
                    id="pdf-file-input"
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={(e) => handlePDFUpload(e.target.files)}
                    className="hidden"
                  />
                  <FileText size={24} className="mx-auto text-slate-500 animate-pulse" />
                  <div className="text-xs font-semibold text-slate-300">
                    Click or drag & drop PDF files here
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Supports uploading multiple files
                  </div>
                </div>

                {/* List of uploaded PDFs */}
                {uploadedPDFs.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Uploaded Documents ({uploadedPDFs.length})
                    </div>
                    <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                      {uploadedPDFs.map((pdf) => (
                        <div key={pdf.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/80 text-xs">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <FileText size={14} className="text-indigo-400 shrink-0" />
                            <span className="text-slate-200 truncate font-medium" title={pdf.name}>
                              {pdf.name}
                            </span>
                            <span className="text-[10px] text-slate-500 shrink-0">
                              ({pdf.size})
                            </span>
                          </div>
                          <button
                            onClick={() => removePDF(pdf.id)}
                            className="text-slate-500 hover:text-red-400 p-1 hover:bg-slate-900 rounded cursor-pointer transition-colors"
                            title="Remove File"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Set Configuration Card */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                  <Settings size={16} className="text-indigo-400" />
                  Practice Set Customization
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-350 block mb-1">
                      Coaching Name / Institution Title
                    </label>
                    <input
                      type="text"
                      value={coachingName}
                      onChange={(e) => setCoachingName(e.target.value)}
                      placeholder="e.g. SBS COACHING CENTRE"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-350 block mb-1">
                      Practice Set Extra Info / Subheader
                    </label>
                    <input
                      type="text"
                      value={practiceExtraInfo}
                      onChange={(e) => setPracticeExtraInfo(e.target.value)}
                      placeholder="e.g. Mathematics Practice Worksheet"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Questions per Set
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={questionsPerSet}
                      onChange={(e) => setQuestionsPerSet(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/55"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Number of Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={numberOfSets}
                      onChange={(e) => setNumberOfSets(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/55"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Guideline Prompts / Specific Topics (Optional)
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                    placeholder="e.g. Focus on Chapter 3 limits, include multiple-choice questions, make intermediate difficulty..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                  />
                </div>

                <button
                  onClick={generatePractice}
                  disabled={isGeneratingSets || uploadedPDFs.length === 0}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGeneratingSets ? (
                    <>
                      <div className="w-4 h-4 rounded-full border border-white/20 border-t-white animate-spin" />
                      <span>AI Reading PDF & Generating Practice Sets...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generate Practice Sets</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right side: Generated Sets preview */}
            <div className="lg:col-span-7 space-y-6">
              
              {isGeneratingSets && (
                <div className="p-12 text-center border border-indigo-500/10 bg-indigo-500/5 rounded-2xl space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Sparkles size={20} className="absolute text-indigo-400 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-200">Generating Practice Sheets</p>
                    <p className="text-xs text-slate-400">Gemini is extracting formulas, math context, and formulating distinct sets of questions with step-by-step keys...</p>
                  </div>
                </div>
              )}

              {!isGeneratingSets && practiceSets.length === 0 && (
                <div className="p-20 text-center border border-slate-800 bg-slate-900/10 rounded-2xl flex flex-col items-center justify-center space-y-3">
                  <FileText size={42} className="text-slate-700 stroke-[1.5]" />
                  <p className="font-semibold text-slate-500 text-sm">No Practice Sets Generated Yet</p>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
                    Upload learning reference PDFs on the left, set your desired questions per set and counts, and click generate to launch the AI generator.
                  </p>
                </div>
              )}

              {!isGeneratingSets && practiceSets.length > 0 && (
                <div className="space-y-6">
                  {practiceSets.map((set, setIdx) => (
                    <div key={setIdx} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500" />
                      
                      {/* Paper-Style Header for Practice Set */}
                      <div className="border border-slate-800 bg-slate-950/80 p-4 rounded-xl text-center space-y-1 select-all font-serif">
                        <div className="font-bold text-center text-sm md:text-base tracking-wide uppercase font-serif text-slate-100">
                          {coachingName}
                        </div>
                        <div className="font-bold text-center text-xs md:text-sm uppercase font-serif text-indigo-400">
                          {set.setName || `PRACTICE SET ${setIdx + 1}`}
                        </div>
                        <div className="text-center text-[10px] md:text-xs font-medium italic font-serif text-slate-400">
                          {practiceExtraInfo}
                        </div>
                      </div>

                      {/* Set Header Toolbar */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Contains {set.questions?.length || 0} distinct practice questions with matching keys
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => printPracticeSet(setIdx)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-850 bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
                          >
                            <Printer size={13} className="text-indigo-400" />
                            <span>Print Set</span>
                          </button>
                          <button
                            onClick={() => importAllQuestionsFromSet(set)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors text-xs font-semibold cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Import Set to Builder</span>
                          </button>
                        </div>
                      </div>

                      {/* Question list render */}
                      <div className="space-y-5">
                        {set.questions?.map((q, qIdx) => {
                          const isSolutionExpanded = !!expandedSolutions[`${setIdx}-${qIdx}`];
                          return (
                            <div key={qIdx} className="bg-slate-950/40 rounded-xl p-4 border border-slate-850 space-y-3">
                              
                              <div className="flex items-start justify-between gap-4">
                                <div className="text-xs md:text-sm leading-relaxed text-slate-200 flex items-start gap-2 pr-2">
                                  <span className="font-bold text-indigo-400 select-none">Q{qIdx + 1}.</span>
                                  <div>
                                    <LatexRenderer text={q.questionText} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 no-print">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 whitespace-nowrap">
                                    {q.marks || 5} Marks
                                  </span>
                                  <button
                                    onClick={() => importQuestionToBuilder(q.questionText, q.marks)}
                                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded cursor-pointer transition-colors"
                                    title="Import just this question"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Solution expandable box */}
                              <div className="pt-2 border-t border-slate-800">
                                <button
                                  onClick={() => toggleSolutionVisibility(setIdx, qIdx)}
                                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
                                >
                                  <span>{isSolutionExpanded ? 'Hide Solution Key' : 'Reveal Solution Key'}</span>
                                </button>

                                {isSolutionExpanded && (
                                  <div className="mt-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-xs text-slate-350 leading-relaxed font-sans animate-fade-in whitespace-pre-wrap">
                                    <div className="font-bold text-indigo-400 italic mb-1.5">Step-by-step Solution:</div>
                                    <LatexRenderer text={q.solutionText} />
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        </main>
      )}
      
      {/* Mini Footer details */}
      <footer className="w-full text-center py-6 text-slate-600 border-t border-slate-900/60 no-print text-[11px] font-medium bg-slate-950/40">
        MathQuest &copy; 2026. Made with Tailwind v4, KaTeX, Mermaid and Gemini OCR logic.
      </footer>

    </div>
  );
}
