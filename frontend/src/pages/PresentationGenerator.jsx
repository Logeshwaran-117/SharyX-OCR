import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Upload,
  FileText,
  Clock,
  Download,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Image as ImageIcon,
  FolderOpen,
  BrainCircuit,
  BarChart3,
  Palette,
  Layers,
  FileType,
  ShieldCheck,
  Target,
  LayoutGrid,
  RefreshCw,
  Presentation as PresentationIcon,
  Eye,
  Filter,
  CheckSquare,
  Square,
  ListChecks,
  Table2,
  PieChart,
  Lightbulb,
  AlertOctagon,
  ArrowLeft,
  Search,
  Zap,
  Briefcase,
  FileStack,
  TrendingUp,
  Settings2,
  ChevronRight,
  Pencil,
  SkipForward,
  MessageSquarePlus,
  GripVertical,
  GitBranch,
} from "lucide-react";
import UsageBadge from "../components/UsageBadge";

const ACCEPTED_TYPES = [
  ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt",
  ".png", ".jpg", ".jpeg", ".webp", ".tiff",
].join(",");

const PURPOSES = [
  "Executive Briefing", "Board Presentation", "Investor Pitch", "Client Report",
  "Internal Analysis", "Research Summary", "Audit Report", "Project Status", "Training Material",
];

const AUDIENCES = [
  "Senior Management", "Board of Directors", "Investors", "Clients",
  "Technical Team", "General Staff", "Government Officials", "Researchers",
];

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam"];

/** 4 layout templates — structure, fonts, density, cover style */
const TEMPLATES = [
  {
    id: "sharyx",
    label: "SharyX Brand",
    blurb: "Modern SaaS · geometric sans · balanced density",
    defaultPalette: "violet",
  },
  {
    id: "executive",
    label: "Executive Boardroom",
    blurb: "Formal Calibri · spacious · institutional",
    defaultPalette: "navygold",
  },
  {
    id: "aurora",
    label: "Aurora Light",
    blurb: "Georgia titles · airy whitespace · editorial",
    defaultPalette: "sky",
  },
  {
    id: "carbon",
    label: "Carbon Tech",
    blurb: "Dense data · high-contrast · neon edge",
    defaultPalette: "cyan",
  },
];

/** 10 independent color palettes — apply on any template */
const COLOR_PALETTES = [
  {
    id: "violet",
    label: "Violet",
    blurb: "Brand purple",
    swatches: ["#7C3AED", "#0B0F1A", "#06B6D4", "#A78BFA"],
  },
  {
    id: "navygold",
    label: "Navy Gold",
    blurb: "Deep navy · gold",
    swatches: ["#C9A227", "#071018", "#3B82F6", "#152536"],
  },
  {
    id: "sky",
    label: "Sky Blue",
    blurb: "Light · sky blue",
    swatches: ["#0284C7", "#F8FAFC", "#0F2744", "#0EA5E9"],
  },
  {
    id: "cyan",
    label: "Cyan Neon",
    blurb: "Dark · cyan neon",
    swatches: ["#22D3EE", "#05070D", "#A78BFA", "#4ADE80"],
  },
  {
    id: "emerald",
    label: "Emerald",
    blurb: "Forest green · growth",
    swatches: ["#10B981", "#0A1F1A", "#34D399", "#059669"],
  },
  {
    id: "rose",
    label: "Rose",
    blurb: "Magenta · bold",
    swatches: ["#E11D48", "#1A0A10", "#FB7185", "#F43F5E"],
  },
  {
    id: "amber",
    label: "Amber",
    blurb: "Warm · energy",
    swatches: ["#F59E0B", "#1A1206", "#FBBF24", "#D97706"],
  },
  {
    id: "teal",
    label: "Teal",
    blurb: "Calm · healthcare",
    swatches: ["#14B8A6", "#0A1614", "#2DD4BF", "#0D9488"],
  },
  {
    id: "indigo",
    label: "Indigo",
    blurb: "Corporate · strategy",
    swatches: ["#4F46E5", "#0B0A1A", "#818CF8", "#6366F1"],
  },
  {
    id: "slate",
    label: "Slate",
    blurb: "Neutral · consulting",
    swatches: ["#64748B", "#0F172A", "#94A3B8", "#38BDF8"],
  },
];

/** Build combined theme id for API: "template:palette" */
function buildThemeId(templateId, paletteId) {
  const t = templateId || "sharyx";
  const p = paletteId || TEMPLATES.find((x) => x.id === t)?.defaultPalette || "violet";
  return `${t}:${p}`;
}

/** Legacy THEMES alias for any remaining references */
const THEMES = TEMPLATES.map((t) => {
  const pal = COLOR_PALETTES.find((p) => p.id === t.defaultPalette) || COLOR_PALETTES[0];
  return {
    id: t.id,
    label: t.label,
    blurb: t.blurb,
    swatches: pal.swatches,
  };
});

const SLIDE_COUNTS = [
  { label: "Auto (AI decides ~16–20)", value: "" },
  { label: "10 slides", value: "10" },
  { label: "12 slides", value: "12" },
  { label: "14 slides", value: "14" },
  { label: "16 slides", value: "16" },
  { label: "18 slides (Recommended)", value: "18" },
  { label: "20 slides", value: "20" },
  { label: "22 slides", value: "22" },
  { label: "25 slides", value: "25" },
  { label: "30 slides", value: "30" },
];

const PIPELINE_STAGES = [
  { id: "parsing",    label: "Document Parsing",        icon: FileText,     min: 5,  max: 25 },
  { id: "analyzing",  label: "AI Document Intelligence", icon: BrainCircuit, min: 25, max: 45 },
  { id: "planning",   label: "Presentation Strategy",    icon: Target,       min: 45, max: 65 },
  { id: "validating", label: "Quality Validation",       icon: ShieldCheck,  min: 62, max: 70 },
  { id: "layouting",  label: "Layout Engine",            icon: LayoutGrid,   min: 70, max: 80 },
  { id: "rendering",  label: "PPTX Rendering",           icon: Sparkles,     min: 80, max: 98 },
  { id: "complete",   label: "Complete Deck",            icon: CheckCircle2, min: 100,max: 100 },
];

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function GetFileIcon({ filename = "" }) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext)) return <FileText className="text-rose-500" size={24} />;
  if (["docx", "doc", "txt"].includes(ext)) return <FileText className="text-blue-500" size={24} />;
  if (["xlsx", "xls", "csv"].includes(ext)) return <FileSpreadsheet className="text-emerald-500" size={24} />;
  if (["png", "jpg", "jpeg", "webp", "tiff"].includes(ext)) return <ImageIcon className="text-purple-500" size={24} />;
  return <FileType className="text-indigo-500" size={24} />;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

const CHART_TYPE_OPTIONS = [
  { id: "bar", label: "Bar" },
  { id: "stackedBar", label: "Stacked Bar" },
  { id: "horizontalBar", label: "Horizontal Bar" },
  { id: "line", label: "Line" },
  { id: "pie", label: "Pie" },
  { id: "donut", label: "Donut" },
  { id: "area", label: "Area" },
];

const NARRATIVE_STYLES = [
  { id: "executive", label: "Executive", desc: "Concise insight bullets" },
  { id: "detailed", label: "Detailed", desc: "Richer context per slide" },
  { id: "data-heavy", label: "Data-heavy", desc: "Numbers, tables, charts first" },
];

const CHART_DENSITIES = [
  { id: "minimal", label: "Minimal", desc: "1–3 essential charts only" },
  { id: "balanced", label: "Balanced", desc: "Mix of KPIs, charts & tables" },
  { id: "heavy", label: "Heavy", desc: "Maximise chart slides" },
];

const VISUAL_EMPHASIS = [
  { id: "balanced", label: "Balanced" },
  { id: "data", label: "Data / visuals" },
  { id: "narrative", label: "Narrative / text" },
];

function buildDefaultSelection(intel) {
  if (!intel) return null;
  const chartOverrides = {};
  const tableOverrides = {};
  (intel.sections || []).forEach((sec, si) => {
    (sec.charts || []).forEach((c, ci) => {
      chartOverrides[`${si}-${ci}`] = {
        include: true,
        chartType: c.chartType || "bar",
      };
    });
    (sec.tables || []).forEach((t, ti) => {
      tableOverrides[`${si}-${ti}`] = { include: true };
    });
  });
  return {
    includeExecutiveSummary: !!intel.executiveSummary,
    selectedSectionIndices: range(intel.sections?.length || 0),
    selectedKpiIndices: range(intel.kpis?.length || 0),
    selectedFindingIndices: range(intel.keyFindings?.length || 0),
    selectedRecommendationIndices: range(intel.recommendations?.length || 0),
    selectedRiskIndices: range(intel.risks?.length || 0),
    includeTables: true,
    includeCharts: true,
    // Advanced generation prefs
    preferredChartTypes: ["bar", "donut", "line", "stacked"],
    chartDensity: "balanced",
    narrativeStyle: "executive",
    visualEmphasis: "balanced",
    includeProcessSlides: true,
    includeComparisonSlides: true,
    includeKpiOverview: true,
    includeAgenda: true,
    includeSummarySlide: true,
    includeRecommendationsSlide: true,
    maxBulletsPerSlide: 6,
    tableStyle: "compact",
    chartOverrides,
    tableOverrides,
  };
}

function DropZone({ file, onFile, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile]);
  if (file) {
    return (
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border transition-all"
        style={{ background: "rgba(var(--primary-rgb), 0.04)", borderColor: "rgba(var(--primary-rgb), 0.2)" }}>
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-sm">
            <GetFileIcon filename={file.name} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{file.name}</h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
              <span>{formatBytes(file.size)}</span>
              <span>•</span>
              <span className="text-[var(--success)] font-medium">Ready for AI processing</span>
            </div>
          </div>
        </div>
        <button onClick={onRemove} className="p-2 rounded-lg text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition" title="Remove file">
          <X size={18} />
        </button>
      </div>
    );
  }
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
      onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
        dragging ? "border-[var(--primary)] bg-[rgba(var(--primary-rgb),0.06)] shadow-inner" : "border-[var(--border)] hover:border-[var(--primary)] bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)]"
      }`}>
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} hidden />
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
        style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)" }}>
        <Upload size={26} />
      </div>
      <div>
        <p className="text-base font-bold" style={{ color: "var(--text)" }}>
          Drop your document here or <span style={{ color: "var(--primary)" }}>browse files</span>
        </p>
        <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
          Supports PDF, Word (.docx), Excel (.xlsx, .csv), TXT, Scanned Docs &amp; Images
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        {["PDF", "DOCX", "XLSX", "CSV", "TXT", "Images"].map((type) => (
          <span key={type} className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}>{type}</span>
        ))}
      </div>
    </div>
  );
}

function PipelineProgress({ status, progress, message }) {
  const activeStage = PIPELINE_STAGES.find(s => s.id === status || (status === "done" && s.id === "complete"))
    || PIPELINE_STAGES.find(s => progress >= s.min && progress <= s.max) || PIPELINE_STAGES[0];
  const activeIdx = PIPELINE_STAGES.indexOf(activeStage);
  const ActiveIcon = activeStage.icon;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(var(--primary-rgb), 0.12)", color: "var(--primary)" }}>
            <ActiveIcon size={24} className={status !== "complete" ? "animate-pulse" : ""} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{activeStage.label}</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{message || "Processing..."}</p>
          </div>
        </div>
        <span className="text-2xl font-black tracking-tight" style={{ color: "var(--primary)" }}>{progress}%</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, progress)}%`, background: "linear-gradient(90deg, var(--primary), #06B6D4)" }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isDone = idx < activeIdx || progress === 100;
          const isActive = idx === activeIdx && progress < 100;
          const StageIcon = stage.icon;
          return (
            <div key={stage.id} className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
              isDone ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : isActive ? "bg-[rgba(var(--primary-rgb),0.1)] border-[var(--primary)] text-[var(--primary)] font-semibold shadow-sm"
              : "bg-[var(--bg-subtle)]/40 border-[var(--border)] text-[var(--muted)] opacity-60"
            }`}>
              <div className="mb-1.5">{isDone ? <CheckCircle2 size={16} /> : isActive ? <Loader2 size={16} className="animate-spin" /> : <StageIcon size={16} />}</div>
              <span className="text-[11px] leading-tight font-medium">{stage.label.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPanel({ history, onDownload, onDelete }) {
  if (!history || !history.length) {
    return (
      <div className="text-center py-14 px-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(var(--primary-rgb), 0.08)", color: "var(--primary)" }}>
          <FolderOpen size={26} />
        </div>
        <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>No Presentations Yet</h3>
        <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--muted)" }}>Generated PowerPoint decks will be saved here for 7 days.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border glass-card transition hover:border-[var(--primary)]/40">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5"><PresentationIcon size={22} /></div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{item.title || item.filename}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs" style={{ color: "var(--muted)" }}>
                <span className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] font-medium">{item.slideCount || "18"} slides</span>
                <span>•</span><span>{item.intelligence?.documentType || "Document Deck"}</span>
                <span>•</span><span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={() => onDownload(item._id)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition shadow-sm">
              <Download size={14} /> Download
            </button>
            <button onClick={() => onDelete(item._id)} className="p-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition" title="Delete">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectChip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
        active
          ? "text-white shadow-sm"
          : "hover:border-[var(--primary)]/40"
      }`}
      style={
        active
          ? { background: "var(--primary)", borderColor: "var(--primary)" }
          : { background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }
      }
    >
      {children}
      {count != null && (
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums"
          style={
            active
              ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
              : { background: "var(--bg-subtle)", color: "var(--text)" }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ContentItem({ checked, onChange, title, sub, badge, badgeColor }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
        checked
          ? "border-[var(--primary)]/50 shadow-sm"
          : "border-[var(--border)] hover:border-[var(--primary)]/30"
      }`}
      style={{
        background: checked ? "rgba(var(--primary-rgb), 0.08)" : "var(--card)",
      }}
    >
      <span
        className="mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center border transition-all"
        style={
          checked
            ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
            : { background: "var(--bg-subtle)", borderColor: "var(--border)", color: "transparent" }
        }
      >
        {checked && <CheckSquare size={12} strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
            {title}
          </p>
          {badge && (
            <span
              className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: badgeColor || "rgba(var(--primary-rgb),0.12)",
                color: badgeColor ? "#fff" : "var(--primary)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {sub && (
          <p className="text-[11px] mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </button>
  );
}

function ContentPreviewPanel({
  intelligence,
  selection,
  setSelection,
  options,
  setOptions,
  showOptions,
  setShowOptions,
  onGenerate,
  onBack,
}) {
  const stats = intelligence?.stats || {};
  const [tab, setTab] = useState("sections");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const toggleIndex = (key, idx) => {
    setSelection((prev) => {
      const arr = new Set(prev[key] || []);
      if (arr.has(idx)) arr.delete(idx);
      else arr.add(idx);
      return { ...prev, [key]: Array.from(arr).sort((a, b) => a - b) };
    });
  };
  const selectAll = (key, total) => setSelection((prev) => ({ ...prev, [key]: range(total) }));
  const clearAll = (key) => setSelection((prev) => ({ ...prev, [key]: [] }));

  const applyPreset = (preset) => {
    const base = buildDefaultSelection(intelligence) || {};
    const nSec = intelligence.sections?.length || 0;
    const nKpi = intelligence.kpis?.length || 0;
    const nFind = intelligence.keyFindings?.length || 0;
    const nRec = intelligence.recommendations?.length || 0;
    const nRisk = intelligence.risks?.length || 0;
    if (preset === "all") {
      setSelection(base);
    } else if (preset === "executive") {
      setSelection({
        ...base,
        includeExecutiveSummary: true,
        selectedSectionIndices: range(Math.min(4, nSec)),
        selectedKpiIndices: range(Math.min(6, nKpi)),
        selectedFindingIndices: range(Math.min(4, nFind)),
        selectedRecommendationIndices: range(nRec),
        selectedRiskIndices: range(Math.min(3, nRisk)),
        includeTables: true,
        includeCharts: true,
        chartDensity: "minimal",
        narrativeStyle: "executive",
        visualEmphasis: "narrative",
        includeProcessSlides: false,
        includeComparisonSlides: false,
        includeKpiOverview: true,
        includeAgenda: true,
        includeSummarySlide: true,
        includeRecommendationsSlide: true,
      });
    } else if (preset === "data") {
      setSelection({
        ...base,
        includeExecutiveSummary: false,
        selectedSectionIndices: range(nSec),
        selectedKpiIndices: range(nKpi),
        selectedFindingIndices: [],
        selectedRecommendationIndices: range(nRec),
        selectedRiskIndices: [],
        includeTables: true,
        includeCharts: true,
        chartDensity: "dense",
        narrativeStyle: "technical",
        visualEmphasis: "data",
        preferredChartTypes: ["bar", "horizontal", "donut", "stacked", "line"],
        includeProcessSlides: true,
        includeComparisonSlides: true,
        includeKpiOverview: true,
        includeAgenda: false,
        includeSummarySlide: true,
        includeRecommendationsSlide: true,
      });
    } else if (preset === "actions") {
      setSelection({
        ...base,
        includeExecutiveSummary: true,
        selectedSectionIndices: [],
        selectedKpiIndices: range(Math.min(4, nKpi)),
        selectedFindingIndices: range(nFind),
        selectedRecommendationIndices: range(nRec),
        selectedRiskIndices: range(nRisk),
        includeTables: false,
        includeCharts: false,
        chartDensity: "minimal",
        narrativeStyle: "executive",
        visualEmphasis: "narrative",
        includeProcessSlides: false,
        includeComparisonSlides: false,
        includeKpiOverview: false,
        includeAgenda: false,
        includeSummarySlide: true,
        includeRecommendationsSlide: true,
      });
    } else if (preset === "visual") {
      setSelection({
        ...base,
        includeExecutiveSummary: true,
        selectedSectionIndices: range(nSec),
        selectedKpiIndices: range(nKpi),
        selectedFindingIndices: range(Math.min(3, nFind)),
        selectedRecommendationIndices: range(nRec),
        selectedRiskIndices: [],
        includeTables: true,
        includeCharts: true,
        chartDensity: "dense",
        narrativeStyle: "storytelling",
        visualEmphasis: "data",
        preferredChartTypes: ["donut", "bar", "area", "line"],
        includeProcessSlides: true,
        includeComparisonSlides: true,
        includeKpiOverview: true,
        includeAgenda: true,
        includeSummarySlide: true,
        includeRecommendationsSlide: true,
      });
    }
  };

  const [contentFilter, setContentFilter] = useState("all"); // all | hasVisuals | longOnly
  const [sortBy, setSortBy] = useState("order"); // order | alpha | visuals


  const selectedTotal = useMemo(() => {
    if (!selection) return 0;
    return (
      (selection.includeExecutiveSummary ? 1 : 0) +
      (selection.selectedSectionIndices?.length || 0) +
      (selection.selectedKpiIndices?.length || 0) +
      (selection.selectedFindingIndices?.length || 0) +
      (selection.selectedRecommendationIndices?.length || 0) +
      (selection.selectedRiskIndices?.length || 0)
    );
  }, [selection]);

  const totalAvailable = useMemo(() => {
    return (
      (intelligence.executiveSummary ? 1 : 0) +
      (intelligence.sections?.length || 0) +
      (intelligence.kpis?.length || 0) +
      (intelligence.keyFindings?.length || 0) +
      (intelligence.recommendations?.length || 0) +
      (intelligence.risks?.length || 0)
    );
  }, [intelligence]);

  const pct = totalAvailable > 0 ? Math.round((selectedTotal / totalAvailable) * 100) : 0;
  const hasContent = selectedTotal > 0;

  const estSlides = useMemo(() => {
    const base = 2; // cover + thank you
    const rec = (selection.selectedRecommendationIndices?.length || 0) > 0 ? 1 : 0;
    const summary = selection.includeExecutiveSummary ? 1 : 0;
    const secs = selection.selectedSectionIndices?.length || 0;
    const kpis = Math.ceil((selection.selectedKpiIndices?.length || 0) / 4);
    const findings = Math.ceil((selection.selectedFindingIndices?.length || 0) / 5);
    const tables = selection.includeTables
      ? (intelligence.sections || [])
          .filter((_, i) => selection.selectedSectionIndices?.includes(i))
          .reduce((n, s) => n + (s.tableCount || 0), 0)
      : 0;
    const charts = selection.includeCharts
      ? (intelligence.sections || [])
          .filter((_, i) => selection.selectedSectionIndices?.includes(i))
          .reduce((n, s) => n + (s.chartCount || 0), 0)
      : 0;
    return Math.max(6, base + rec + summary + secs + kpis + findings + Math.min(tables, 4) + Math.min(charts, 4));
  }, [selection, intelligence]);

  const tabs = [
    { id: "sections", label: "Sections", icon: Layers, count: selection.selectedSectionIndices?.length || 0, total: intelligence.sections?.length || 0 },
    { id: "kpis", label: "KPIs", icon: BarChart3, count: selection.selectedKpiIndices?.length || 0, total: intelligence.kpis?.length || 0 },
    { id: "findings", label: "Findings", icon: Lightbulb, count: selection.selectedFindingIndices?.length || 0, total: intelligence.keyFindings?.length || 0 },
    { id: "recs", label: "Actions", icon: ListChecks, count: selection.selectedRecommendationIndices?.length || 0, total: intelligence.recommendations?.length || 0 },
    { id: "risks", label: "Risks", icon: AlertOctagon, count: selection.selectedRiskIndices?.length || 0, total: intelligence.risks?.length || 0 },
  ].filter((t) => t.total > 0);

  const match = (text) => !q || String(text || "").toLowerCase().includes(q);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-28">
      {/* ── Hero header ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(var(--primary-rgb),0.12) 0%, rgba(var(--primary-rgb),0.03) 50%, transparent 100%)",
          borderColor: "rgba(var(--primary-rgb),0.2)",
        }}
      >
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-3 rounded-2xl shrink-0" style={{ background: "rgba(var(--primary-rgb),0.15)", color: "var(--primary)" }}>
              <Filter size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Shape your presentation
              </h2>
              <p className="text-xs mt-1 max-w-lg" style={{ color: "var(--muted)" }}>
                Pick what from the source document goes into the deck. Unselected content is excluded from generation.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border truncate max-w-[220px]" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>
                  {intelligence.title || "Document"}
                </span>
                {intelligence.documentType && (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(var(--primary-rgb),0.12)", color: "var(--primary)" }}>
                    {intelligence.documentType}
                  </span>
                )}
                {intelligence.organization && (
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>{intelligence.organization}</span>
                )}
                {intelligence.period && (
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>· {intelligence.period}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Selection ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border)" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke="var(--primary)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: "var(--primary)" }}>
                  {pct}%
                </span>
              </div>
              <span className="text-[10px] mt-1 font-medium" style={{ color: "var(--muted)" }}>{selectedTotal}/{totalAvailable}</span>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-[var(--bg-subtle)] transition"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              <ArrowLeft size={14} /> Change file
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-px border-t" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
          {[
            { label: "Sections", value: stats.sectionCount || 0, icon: Layers },
            { label: "KPIs", value: stats.kpiCount || 0, icon: BarChart3 },
            { label: "Findings", value: stats.findingCount || 0, icon: Lightbulb },
            { label: "Actions", value: stats.recommendationCount || 0, icon: ListChecks },
            { label: "Risks", value: stats.riskCount || 0, icon: AlertOctagon },
            { label: "Tables", value: stats.tableCount || 0, icon: Table2 },
            { label: "Charts", value: stats.chartCount || 0, icon: PieChart },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-3 px-1" style={{ background: "var(--card)" }}>
              <s.icon size={13} style={{ color: "var(--primary)", opacity: 0.7 }} className="mb-1" />
              <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>{s.value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Presets ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider mr-1" style={{ color: "var(--muted)" }}>Presets</span>
        <SelectChip active={false} onClick={() => applyPreset("all")}>
          <FileStack size={12} /> Everything
        </SelectChip>
        <SelectChip active={false} onClick={() => applyPreset("executive")}>
          <Briefcase size={12} /> Executive brief
        </SelectChip>
        <SelectChip active={false} onClick={() => applyPreset("data")}>
          <TrendingUp size={12} /> Data & charts
        </SelectChip>
        <SelectChip active={false} onClick={() => applyPreset("actions")}>
          <Zap size={12} /> Actions only
        </SelectChip>
        <SelectChip active={false} onClick={() => applyPreset("visual")}>
          <PieChart size={12} /> Visual heavy
        </SelectChip>
        <div className="ml-auto flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
          <span className="font-semibold">~{estSlides} slides est.</span>
          {options.slideCount && <span>· target {options.slideCount}</span>}
        </div>
      </div>

      {/* ── Global toggles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          {
            key: "includeExecutiveSummary",
            label: "Executive Summary",
            sub: intelligence.executiveSummary
              ? intelligence.executiveSummary.slice(0, 90) + (intelligence.executiveSummary.length > 90 ? "…" : "")
              : "Not extracted",
            icon: FileText,
          },
          {
            key: "includeTables",
            label: "Include Tables",
            sub: `${stats.tableCount || 0} tables in selected sections`,
            icon: Table2,
          },
          {
            key: "includeCharts",
            label: "Include Charts",
            sub: `${stats.chartCount || 0} charts synthesised from data`,
            icon: PieChart,
          },
        ].map((g) => {
          const on = !!selection[g.key];
          const Icon = g.icon;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setSelection((p) => ({ ...p, [g.key]: !p[g.key] }))}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                on ? "border-[var(--primary)]/40" : "border-[var(--border)]"
              }`}
              style={{ background: on ? "rgba(var(--primary-rgb),0.07)" : "var(--card)" }}
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: on ? "rgba(var(--primary-rgb),0.15)" : "var(--bg-subtle)", color: on ? "var(--primary)" : "var(--muted)" }}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{g.label}</p>
                  <span
                    className="w-8 h-4.5 rounded-full relative transition-all"
                    style={{ background: on ? "var(--primary)" : "var(--border)", width: 32, height: 18 }}
                  >
                    <span
                      className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                      style={{ left: on ? 14 : 2 }}
                    />
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--muted)" }}>{g.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Category tabs + search ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    active ? "text-white shadow-sm" : "hover:bg-[var(--bg-subtle)]"
                  }`}
                  style={
                    active
                      ? { background: "var(--primary)" }
                      : { color: "var(--muted)" }
                  }
                >
                  <Icon size={13} />
                  {t.label}
                  <span
                    className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                    style={
                      active
                        ? { background: "rgba(255,255,255,0.2)" }
                        : { background: "var(--bg-subtle)", color: "var(--text)" }
                    }
                  >
                    {t.count}/{t.total}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
            <input
              type="search"
              placeholder="Search items…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-[var(--ring)]"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>

        {/* Tab toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[11px] font-medium mr-1" style={{ color: "var(--muted)" }}>
              {tab === "sections" && "Sections → content slides"}
              {tab === "kpis" && "KPIs → scorecards"}
              {tab === "findings" && "Findings → insight bullets"}
              {tab === "recs" && "Actions → Recommendations (before Thank You)"}
              {tab === "risks" && "Risks → risk / insight slides"}
            </p>
            {tab === "sections" && (
              <>
                {[
                  { id: "all", label: "All" },
                  { id: "hasVisuals", label: "Has tables/charts" },
                  { id: "longOnly", label: "Longer sections" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setContentFilter(f.id)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition"
                    style={
                      contentFilter === f.id
                        ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
                        : { background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }
                    }
                  >
                    {f.label}
                  </button>
                ))}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-[var(--card)]"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  <option value="order">Original order</option>
                  <option value="alpha">A → Z</option>
                  <option value="visuals">Most visuals first</option>
                </select>
              </>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg hover:bg-[var(--card)] transition"
              style={{ color: "var(--primary)" }}
              onClick={() => {
                if (tab === "sections") selectAll("selectedSectionIndices", intelligence.sections?.length || 0);
                if (tab === "kpis") selectAll("selectedKpiIndices", intelligence.kpis?.length || 0);
                if (tab === "findings") selectAll("selectedFindingIndices", intelligence.keyFindings?.length || 0);
                if (tab === "recs") selectAll("selectedRecommendationIndices", intelligence.recommendations?.length || 0);
                if (tab === "risks") selectAll("selectedRiskIndices", intelligence.risks?.length || 0);
              }}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg hover:bg-[var(--card)] transition"
              style={{ color: "var(--muted)" }}
              onClick={() => {
                if (tab === "sections") clearAll("selectedSectionIndices");
                if (tab === "kpis") clearAll("selectedKpiIndices");
                if (tab === "findings") clearAll("selectedFindingIndices");
                if (tab === "recs") clearAll("selectedRecommendationIndices");
                if (tab === "risks") clearAll("selectedRiskIndices");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-3 sm:p-4 max-h-[420px] overflow-y-auto space-y-2">
          {tab === "sections" &&
            (intelligence.sections || [])
              .map((sec, idx) => ({ sec, idx }))
              .filter(({ sec }) => {
                if (!(match(sec.title) || match(sec.summary))) return false;
                if (contentFilter === "hasVisuals") return (sec.tableCount || 0) + (sec.chartCount || 0) > 0;
                if (contentFilter === "longOnly") return (sec.summary || "").length > 80;
                return true;
              })
              .sort((a, b) => {
                if (sortBy === "alpha") return (a.sec.title || "").localeCompare(b.sec.title || "");
                if (sortBy === "visuals") {
                  const av = (a.sec.tableCount || 0) + (a.sec.chartCount || 0);
                  const bv = (b.sec.tableCount || 0) + (b.sec.chartCount || 0);
                  return bv - av;
                }
                return a.idx - b.idx;
              })
              .map(({ sec, idx }) => (
                <ContentItem
                  key={idx}
                  checked={selection.selectedSectionIndices?.includes(idx)}
                  onChange={() => toggleIndex("selectedSectionIndices", idx)}
                  title={sec.title}
                  sub={[
                    sec.summary?.slice(0, 120),
                    sec.tableCount ? `${sec.tableCount} table(s)` : null,
                    sec.chartCount ? `${sec.chartCount} chart(s)` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  badge={
                    (sec.tableCount || 0) + (sec.chartCount || 0) > 0
                      ? `${(sec.tableCount || 0) + (sec.chartCount || 0)} visuals`
                      : null
                  }
                />
              ))}

          {tab === "kpis" &&
            (intelligence.kpis || [])
              .map((k, idx) => ({ k, idx }))
              .filter(({ k }) => match(k.label) || match(k.context) || match(k.value))
              .map(({ k, idx }) => (
                <ContentItem
                  key={idx}
                  checked={selection.selectedKpiIndices?.includes(idx)}
                  onChange={() => toggleIndex("selectedKpiIndices", idx)}
                  title={k.label}
                  sub={k.context || k.trend || undefined}
                  badge={`${k.value}${k.unit ? " " + k.unit : ""}`}
                />
              ))}

          {tab === "findings" &&
            (intelligence.keyFindings || [])
              .map((f, idx) => ({ f, idx }))
              .filter(({ f }) => match(f))
              .map(({ f, idx }) => (
                <ContentItem
                  key={idx}
                  checked={selection.selectedFindingIndices?.includes(idx)}
                  onChange={() => toggleIndex("selectedFindingIndices", idx)}
                  title={f}
                />
              ))}

          {tab === "recs" &&
            (intelligence.recommendations || [])
              .map((r, idx) => ({ r, idx }))
              .filter(({ r }) => match(r))
              .map(({ r, idx }) => (
                <ContentItem
                  key={idx}
                  checked={selection.selectedRecommendationIndices?.includes(idx)}
                  onChange={() => toggleIndex("selectedRecommendationIndices", idx)}
                  title={r}
                  badge={`#${idx + 1}`}
                />
              ))}

          {tab === "risks" &&
            (intelligence.risks || [])
              .map((r, idx) => ({ r, idx }))
              .filter(({ r }) => match(r))
              .map(({ r, idx }) => (
                <ContentItem
                  key={idx}
                  checked={selection.selectedRiskIndices?.includes(idx)}
                  onChange={() => toggleIndex("selectedRiskIndices", idx)}
                  title={r}
                />
              ))}

          {/* empty search state */}
          {q && (
            <p className="text-center text-xs py-8" style={{ color: "var(--muted)" }}>
              No matching items for “{query}”
            </p>
          )}
        </div>
      </div>

      {/* ── Advanced Generation Options ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(var(--primary-rgb),0.12)", color: "var(--primary)" }}>
              <Settings2 size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Advanced generation options</h3>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>Charts, density, deck structure & narrative</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            className="text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition"
            style={{ borderColor: "var(--border)", color: "var(--primary)" }}
          >
            {showOptions ? "Collapse" : "Expand"}
            <ChevronRight size={13} className={`transition ${showOptions ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Always-visible core controls */}
        <div className="p-4 sm:p-5 space-y-5">
          {/* Slide count + theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Slide count</label>
              <select
                value={options.slideCount}
                onChange={(e) => setOptions((o) => ({ ...o, slideCount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border bg-[var(--bg-subtle)]"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {SLIDE_COUNTS.map((s) => (
                  <option key={s.value || "auto"} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Layout template — 4 structural systems */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              Layout template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEMPLATES.map((t) => {
                const active = (options.template || "sharyx") === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setOptions((o) => ({
                        ...o,
                        template: t.id,
                        colorPalette: o.colorPalette || t.defaultPalette,
                        theme: buildThemeId(t.id, o.colorPalette || t.defaultPalette),
                      }))
                    }
                    className={`text-left p-3 rounded-xl border transition-all ${
                      active ? "ring-2 ring-[var(--primary)]" : "hover:border-[var(--primary)]/40"
                    }`}
                    style={{
                      borderColor: active ? "var(--primary)" : "var(--border)",
                      background: active ? "rgba(var(--primary-rgb),0.08)" : "var(--bg-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                        {t.label}
                      </span>
                      {active && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--primary)", color: "#fff" }}>
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: "var(--muted)" }}>
                      {t.blurb}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--muted)" }}>
              Template controls fonts, spacing, cover style, and density. Colors are chosen separately below.
            </p>
          </div>

          {/* Color palette — 10 independent themes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              Color theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {COLOR_PALETTES.map((p) => {
                const active = (options.colorPalette || "violet") === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setOptions((o) => ({
                        ...o,
                        colorPalette: p.id,
                        theme: buildThemeId(o.template || "sharyx", p.id),
                      }))
                    }
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      active ? "ring-2 ring-[var(--primary)]" : "hover:border-[var(--primary)]/40"
                    }`}
                    style={{
                      borderColor: active ? "var(--primary)" : "var(--border)",
                      background: active ? "rgba(var(--primary-rgb),0.08)" : "var(--bg-subtle)",
                    }}
                    title={p.blurb}
                  >
                    <div className="flex -space-x-1 mb-1.5">
                      {(p.swatches || []).slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="w-3.5 h-3.5 rounded-full border border-white/25"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold block truncate" style={{ color: "var(--text)" }}>
                      {p.label}
                    </span>
                    <span className="text-[10px] block truncate" style={{ color: "var(--muted)" }}>
                      {p.blurb}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--muted)" }}>
              10 color systems — apply any palette on the selected layout template.
            </p>
          </div>

          {/* Preferred chart types */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              Preferred chart types
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "bar", label: "Bar" },
                { id: "horizontal", label: "Horizontal bar" },
                { id: "donut", label: "Donut" },
                { id: "pie", label: "Pie" },
                { id: "line", label: "Line" },
                { id: "area", label: "Area" },
                { id: "stacked", label: "Stacked" },
              ].map((c) => {
                const active = (selection.preferredChartTypes || []).includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setSelection((prev) => {
                        const cur = new Set(prev.preferredChartTypes || []);
                        if (cur.has(c.id)) cur.delete(c.id);
                        else cur.add(c.id);
                        return { ...prev, preferredChartTypes: Array.from(cur) };
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                      active ? "text-white shadow-sm" : "hover:border-[var(--primary)]/40"
                    }`}
                    style={
                      active
                        ? { background: "var(--primary)", borderColor: "var(--primary)" }
                        : { background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--muted)" }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--muted)" }}>
              AI will prefer these shapes when synthesising charts from tables.
            </p>
          </div>

          {/* Density + narrative + emphasis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Chart density</label>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                {[
                  { id: "minimal", label: "Minimal" },
                  { id: "balanced", label: "Balanced" },
                  { id: "dense", label: "Dense" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelection((p) => ({ ...p, chartDensity: d.id }))}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      selection.chartDensity === d.id ? "text-white shadow" : ""
                    }`}
                    style={
                      selection.chartDensity === d.id
                        ? { background: "var(--primary)" }
                        : { color: "var(--muted)" }
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Narrative style</label>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                {[
                  { id: "executive", label: "Exec" },
                  { id: "technical", label: "Tech" },
                  { id: "storytelling", label: "Story" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelection((p) => ({ ...p, narrativeStyle: d.id }))}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      selection.narrativeStyle === d.id ? "text-white shadow" : ""
                    }`}
                    style={
                      selection.narrativeStyle === d.id
                        ? { background: "var(--primary)" }
                        : { color: "var(--muted)" }
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Visual emphasis</label>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                {[
                  { id: "data", label: "Data" },
                  { id: "balanced", label: "Balance" },
                  { id: "narrative", label: "Story" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelection((p) => ({ ...p, visualEmphasis: d.id }))}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      selection.visualEmphasis === d.id ? "text-white shadow" : ""
                    }`}
                    style={
                      selection.visualEmphasis === d.id
                        ? { background: "var(--primary)" }
                        : { color: "var(--muted)" }
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Deck structure toggles */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              Deck structure
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: "includeAgenda", label: "Agenda slide", sub: "Opening roadmap" },
                { key: "includeKpiOverview", label: "KPI overview", sub: "Scorecard slide" },
                { key: "includeProcessSlides", label: "Process / flow", sub: "Step sequences" },
                { key: "includeComparisonSlides", label: "Comparisons", sub: "Side-by-side" },
                { key: "includeSummarySlide", label: "Summary & takeaways", sub: "Before recommendations" },
                { key: "includeRecommendationsSlide", label: "Recommendations", sub: "Before Thank You" },
              ].map((item) => {
                const on = selection[item.key] !== false;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelection((p) => ({ ...p, [item.key]: !on }))}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      on ? "border-[var(--primary)]/40" : "border-[var(--border)] opacity-70"
                    }`}
                    style={{ background: on ? "rgba(var(--primary-rgb),0.07)" : "var(--bg-subtle)" }}
                  >
                    <span
                      className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border"
                      style={
                        on
                          ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {on && <CheckSquare size={10} strokeWidth={3} />}
                    </span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{item.label}</p>
                      <p className="text-[10px]" style={{ color: "var(--muted)" }}>{item.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expandable: purpose / audience / language / watermark / table style */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4 pt-1"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Purpose</label>
                    <select value={options.purpose} onChange={(e) => setOptions((o) => ({ ...o, purpose: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium border bg-[var(--bg-subtle)]" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                      {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Audience</label>
                    <select value={options.audience} onChange={(e) => setOptions((o) => ({ ...o, audience: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium border bg-[var(--bg-subtle)]" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                      {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Language</label>
                    <select value={options.language} onChange={(e) => setOptions((o) => ({ ...o, language: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium border bg-[var(--bg-subtle)]" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Table style</label>
                    <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                      {[
                        { id: "compact", label: "Compact" },
                        { id: "detailed", label: "Detailed" },
                        { id: "highlight", label: "Highlight key rows" },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelection((p) => ({ ...p, tableStyle: d.id }))}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                            (selection.tableStyle || "compact") === d.id ? "text-white shadow" : ""
                          }`}
                          style={
                            (selection.tableStyle || "compact") === d.id
                              ? { background: "var(--primary)" }
                              : { color: "var(--muted)" }
                          }
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Max bullets / slide</label>
                    <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                      {[4, 5, 6, 7].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSelection((p) => ({ ...p, maxBulletsPerSlide: n }))}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                            (selection.maxBulletsPerSlide || 6) === n ? "text-white shadow" : ""
                          }`}
                          style={
                            (selection.maxBulletsPerSlide || 6) === n
                              ? { background: "var(--primary)" }
                              : { color: "var(--muted)" }
                          }
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Watermark (optional)</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="e.g. CONFIDENTIAL · Your Org"
                    value={options.watermarkText || ""}
                    onChange={(e) => setOptions((o) => ({ ...o, watermarkText: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border bg-[var(--bg-subtle)]"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>
                    Focus areas (optional — guide the AI)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="e.g. maternal anemia, RDS protocols, referral transport"
                    value={options.focusAreasText || ""}
                    onChange={(e) => setOptions((o) => ({ ...o, focusAreasText: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border bg-[var(--bg-subtle)]"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                    Comma-separated topics the AI should prioritise when building slides.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky generate bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl"
        style={{
          background: "rgba(10, 15, 30, 0.88)",
          borderColor: "rgba(255,255,255,0.08)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="hidden sm:flex flex-wrap items-center gap-2 text-xs" style={{ color: "#94a3b8" }}>
              <span className="font-bold text-white tabular-nums">{selectedTotal}</span> items
              <span>·</span>
              <span>~{estSlides} slides</span>
              <span>·</span>
              <span className="truncate">{selection.chartDensity || "balanced"} charts</span>
              <span>·</span>
              <span className="truncate">
                {(TEMPLATES.find((t) => t.id === (options.template || "sharyx"))?.label || "Template")}
                {" · "}
                {(COLOR_PALETTES.find((p) => p.id === (options.colorPalette || "violet"))?.label || "Color")}
              </span>
            </div>
            <div className="sm:hidden text-xs" style={{ color: "#94a3b8" }}>
              <span className="font-bold text-white">{selectedTotal}</span> selected · ~{estSlides} slides
            </div>
          </div>
          <button
            type="button"
            disabled={!hasContent}
            onClick={onGenerate}
            className={`sm:w-auto w-full py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              hasContent
                ? "btn-gradient text-white shadow-lg cursor-pointer"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            <SkipForward size={17} />
            <span>Continue → review each slide</span>
            <ChevronRight size={16} />
          </button>
        </div>
        {!hasContent && (
          <p className="text-center text-[11px] text-rose-400 pb-2 font-medium">
            Select at least one content item to continue
          </p>
        )}
      </div>
    </motion.div>
  );
}



/**
 * Build a usable slide-by-slide plan on the client from intelligence + selection.
 * Used when /api/presentation/plan is unavailable or fails — keeps the UI working.
 */

/** Guarantee blueprint length === target by inserting insight fillers before closing slides. */
function ensureSlideCount(blueprint, target, intel) {
  const t = parseInt(target, 10);
  if (!Array.isArray(blueprint) || isNaN(t) || t < 6) return blueprint || [];
  let slides = blueprint.map((s, i) => ({ ...s, slideIndex: i + 1 }));
  if (slides.length === t) return slides;

  const isClosing = (s) =>
    ["thankyou", "thank_you", "closing", "recommendations", "summary"].includes(
      String(s.slideType || "").toLowerCase()
    );

  // Trim middle if over
  if (slides.length > t) {
    const head = [];
    const mid = [];
    const tail = [];
    slides.forEach((s) => {
      const ty = String(s.slideType || "").toLowerCase();
      if (ty === "cover" || ty === "agenda") head.push(s);
      else if (isClosing(s)) tail.push(s);
      else mid.push(s);
    });
    const needMid = Math.max(0, t - head.length - tail.length);
    slides = [...head, ...mid.slice(0, needMid), ...tail].slice(0, t);
  }

  // NEVER pad with Analysis Detail / Focus Metric spam — fewer meaningful slides is better
  // (buildClientSlidePlan is responsible for structure)

  return slides.map((s, i) => ({ ...s, slideIndex: i + 1, included: s.included !== false }));
}

function buildClientSlidePlan(intel, selection, options = {}) {
  if (!intel) return [];

  const targetRaw = parseInt(options.slideCount, 10);
  const target = !isNaN(targetRaw) && targetRaw >= 6 ? Math.min(35, targetRaw) : 18;

  const title = intel.title || "Presentation";
  const org = intel.organization || "";
  const period = intel.period || "";

  const kpiIdx = selection?.selectedKpiIndices || [];
  const kpis = (intel.kpis || []).filter((_, i) => kpiIdx.includes(i));
  const secIdx = selection?.selectedSectionIndices || [];
  const sections = (intel.sections || []).filter((_, i) => secIdx.includes(i));
  const findIdx = selection?.selectedFindingIndices || [];
  const findings = (intel.keyFindings || []).filter((_, i) => findIdx.includes(i));
  const riskIdx = selection?.selectedRiskIndices || [];
  const risks = (intel.risks || []).filter((_, i) => riskIdx.includes(i));
  const recIdx = selection?.selectedRecommendationIndices || [];
  const recs = (intel.recommendations || []).filter((_, i) => recIdx.includes(i));

  // Build a pool of content slides (no cover/agenda/summary/recs/thankYou yet)
  const contentPool = [];

  // KPI slides — smaller chunks so we can fill higher targets
  if (kpis.length && selection?.includeKpiOverview !== false) {
    const chunk = 3;
    for (let i = 0; i < kpis.length; i += chunk) {
      const group = kpis.slice(i, i + chunk);
      contentPool.push({
        slideType: "kpi",
        title: i === 0 ? "Key Performance Indicators" : `Key Metrics (${Math.floor(i / chunk) + 1})`,
        subtitle: "Selected indicators from source data",
        kpiCards: group.map((k) => ({
          label: k.label,
          value: String(k.value ?? ""),
          unit: k.unit || "",
          context: k.context || k.trend || "",
        })),
        bullets: group.map(
          (k) =>
            `${k.label}: ${k.value}${k.unit ? " " + k.unit : ""}${k.context ? " — " + k.context : ""}`
        ),
      });
    }
  }

  // Sections → separate table / chart / insights slides
  sections.forEach((sec) => {
    const hasTable =
      selection?.includeTables !== false &&
      ((sec.tableCount || 0) > 0 || (sec.tables || []).length > 0);
    const hasChart =
      selection?.includeCharts !== false &&
      ((sec.chartCount || 0) > 0 || (sec.charts || []).length > 0);
    const insights = (sec.insights || []).filter(Boolean);

    if (hasTable) {
      const tables = sec.tables || [];
      if (tables.length > 1) {
        tables.forEach((t, ti) => {
          contentPool.push({
            slideType: "table",
            title: t.title || `${sec.title || "Data"} (Table ${ti + 1})`,
            subtitle: sec.summary || "From source document",
            bullets: insights.slice(0, 3),
            table: t,
            tables: [t],
          });
        });
      } else {
        contentPool.push({
          slideType: "table",
          title: sec.title || "Data Table",
          subtitle: sec.summary || "From source document",
          bullets: insights.slice(0, 4),
          table: tables[0] || null,
          tables,
        });
      }
    }

    if (hasChart) {
      const charts = sec.charts || [];
      if (charts.length > 1) {
        charts.forEach((c, ci) => {
          contentPool.push({
            slideType: "chart",
            title: c.title || `${sec.title || "Chart"} (${ci + 1})`,
            subtitle: c.insight || sec.summary || "",
            bullets: insights.slice(0, 3),
            chart: c,
            charts: [c],
          });
        });
      } else {
        contentPool.push({
          slideType: "chart",
          title: sec.title ? `${sec.title} — Visual` : "Chart Analysis",
          subtitle: sec.summary || "",
          bullets: insights.slice(0, 4),
          chart: charts[0] || null,
          charts,
        });
      }
    }

    // Always add an insights slide for the section when it has text
    if (insights.length || sec.summary) {
      contentPool.push({
        slideType: "insights",
        title: sec.title || "Section Insights",
        subtitle: sec.summary || "",
        bullets: [...insights.slice(0, 8), ...(sec.summary ? [sec.summary] : [])]
          .filter((b) => b && !/^---\s*Sheet:/i.test(String(b)) && !/^\d+\s*rows?\s*[×x]/i.test(String(b)))
          .slice(0, 6),
      });
    }
  });

  // Findings — 3 per slide for expandability
  if (findings.length) {
    const chunk = 3;
    for (let i = 0; i < findings.length; i += chunk) {
      contentPool.push({
        slideType: "insights",
        title: i === 0 ? "Key Findings" : `Findings (${Math.floor(i / chunk) + 1})`,
        subtitle: "Evidence from source analysis",
        bullets: findings.slice(i, i + chunk),
      });
    }
  }

  // Risks
  if (risks.length) {
    const chunk = 3;
    for (let i = 0; i < risks.length; i += chunk) {
      contentPool.push({
        slideType: "insights",
        title: i === 0 ? "Risk & Impact Assessment" : `Additional Risks (${Math.floor(i / chunk) + 1})`,
        subtitle: "Risks identified in source analysis",
        bullets: risks.slice(i, i + chunk),
      });
    }
  }

  // Process slide from recommendations context if enabled
  if (selection?.includeProcessSlides !== false && recs.length >= 3) {
    contentPool.push({
      slideType: "process",
      title: "Action Pathway",
      subtitle: "Sequenced next steps from the analysis",
      bullets: recs.slice(0, 5).map((r, i) => `Step ${i + 1}: ${r}`),
    });
  }

  // Fixed frame slides
  const frameStart = [];
  frameStart.push({
    slideType: "cover",
    title,
    subtitle: [org, period].filter(Boolean).join(" · ") || intel.subtitle || "Executive Briefing",
    bullets: [],
  });
  if (selection?.includeAgenda !== false) {
    frameStart.push({
      slideType: "agenda",
      title: "Briefing Agenda & Roadmap",
      subtitle: "Structured overview of this deck",
      bullets: [], // filled later
    });
  }

  const frameEnd = [];
  if (selection?.includeSummarySlide !== false) {
    frameEnd.push({
      slideType: "summary",
      title: "Executive Summary & Takeaways",
      subtitle: title,
      bullets: [
        ...(selection?.includeExecutiveSummary && intel.executiveSummary
          ? [String(intel.executiveSummary).slice(0, 180)]
          : []),
        ...findings.slice(0, 4),
        ...kpis.slice(0, 2).map((k) => `${k.label}: ${k.value}${k.unit ? " " + k.unit : ""}`),
      ]
        .filter(Boolean)
        .slice(0, 6),
      kpiCards: kpis.slice(0, 4).map((k) => ({
        label: k.label,
        value: String(k.value ?? ""),
        unit: k.unit || "",
      })),
    });
  }
  if (recs.length && selection?.includeRecommendationsSlide !== false) {
    frameEnd.push({
      slideType: "recommendations",
      title: "Recommendations",
      subtitle: "Summary & Next Steps",
      bullets: recs.slice(0, 8),
    });
  }
  frameEnd.push({
    slideType: "thankYou",
    title: "Thank You",
    subtitle: "Questions & Discussion",
    bullets: recs.slice(0, 1),
  });

  const fixedCount = frameStart.length + frameEnd.length;
  let contentSlots = Math.max(1, target - fixedCount);

  // Expand content pool if too short: split multi-bullet slides
  let pool = [...contentPool];
  let guard = 0;
  while (pool.length < contentSlots && guard < 40) {
    guard += 1;
    // Find a slide with enough bullets to split
    let split = false;
    for (let i = 0; i < pool.length; i++) {
      const s = pool[i];
      const bullets = s.bullets || [];
      if (bullets.length >= 4) {
        const mid = Math.ceil(bullets.length / 2);
        const a = { ...s, bullets: bullets.slice(0, mid), title: s.title };
        const b = {
          ...s,
          bullets: bullets.slice(mid),
          title: `${s.title} (cont.)`,
          kpiCards: undefined,
          table: undefined,
          tables: undefined,
          chart: undefined,
          charts: undefined,
        };
        pool.splice(i, 1, a, b);
        split = true;
        break;
      }
    }
    if (!split) {
      // Prefer quality over hitting target count — never spam Focus Metric / empty sections
      const focusCount = pool.filter((s) => /^Focus Metric:/i.test(String(s.title || ""))).length;
      const usedFindings = new Set(pool.flatMap((s) => s.bullets || []).map(String));
      const nextFinding = findings.find((x) => !usedFindings.has(String(x)));
      if (nextFinding) {
        pool.push({
          slideType: "insights",
          title: "Key Finding Detail",
          subtitle: "From source analysis",
          bullets: [nextFinding],
        });
      } else {
        // Stop — do not invent Focus Metric / filler slides
        break;
      }
    }
  }

  // Trim content if too long
  if (pool.length > contentSlots) {
    pool = pool.slice(0, contentSlots);
  }

  // Assemble
  let slides = [...frameStart, ...pool, ...frameEnd];

  // Fill agenda from real titles
  const agenda = slides.find((s) => s.slideType === "agenda");
  if (agenda) {
    agenda.bullets = slides
      .filter((s) => !["cover", "agenda", "thankYou"].includes(s.slideType))
      .map((s) => s.title)
      .slice(0, 12);
  }

  // Do NOT pad with empty "Supporting Detail" slides — fewer good slides is better
  // If slightly over target, trim middle content only
  if (slides.length > target) {
    const overflow = slides.length - target;
    const middle = slides.slice(frameStart.length, slides.length - frameEnd.length);
    const keptMiddle = middle.slice(0, Math.max(0, middle.length - overflow));
    slides = [...frameStart, ...keptMiddle, ...frameEnd];
  }

  return slides.map((s, i) => ({
    ...s,
    included: s.included !== false,
    slideIndex: i + 1,
    bullets: Array.isArray(s.bullets) ? s.bullets : [],
  }));
}


const SLIDE_TYPE_META = {
  cover: { label: "Cover", color: "#6366f1" },
  agenda: { label: "Agenda", color: "#8b5cf6" },
  kpi: { label: "KPI", color: "#06b6d4" },
  scorecard: { label: "Scorecard", color: "#06b6d4" },
  chart: { label: "Chart", color: "#10b981" },
  dualChart: { label: "Dual chart", color: "#10b981" },
  table: { label: "Table", color: "#f59e0b" },
  insights: { label: "Insights", color: "#3b82f6" },
  process: { label: "Process", color: "#ec4899" },
  comparison: { label: "Comparison", color: "#a855f7" },
  summary: { label: "Summary", color: "#14b8a6" },
  recommendations: { label: "Recommendations", color: "#f97316" },
  thankYou: { label: "Thank you", color: "#64748b" },
  cards: { label: "Cards", color: "#6366f1" },
};

function SlidePlanEditor({
  blueprint,
  setBlueprint,
  intelligence,
  options,
  onGenerate,
  onBack,
  onRefine,
  refining,
}) {
  const [instruction, setInstruction] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [filterType, setFilterType] = useState("all");

  const includedCount = useMemo(
    () => (blueprint || []).filter((s) => s.included !== false).length,
    [blueprint]
  );

  const types = useMemo(() => {
    const set = new Set((blueprint || []).map((s) => s.slideType).filter(Boolean));
    return Array.from(set);
  }, [blueprint]);

  const visible = useMemo(() => {
    return (blueprint || [])
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => filterType === "all" || s.slideType === filterType);
  }, [blueprint, filterType]);

  const toggle = (idx) => {
    setBlueprint((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, included: s.included === false } : s))
    );
  };

  const move = (idx, dir) => {
    setBlueprint((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((s, i) => ({ ...s, slideIndex: i + 1 }));
    });
  };

  const saveTitle = (idx) => {
    setBlueprint((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, title: editTitle.trim() || s.title } : s))
    );
    setEditingIdx(null);
  };

  const remove = (idx) => {
    setBlueprint((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slideIndex: i + 1 }))
    );
  };

  const selectAll = (val) => {
    setBlueprint((prev) => prev.map((s) => ({ ...s, included: val })));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-28">
      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(var(--primary-rgb),0.12) 0%, transparent 70%)",
          borderColor: "rgba(var(--primary-rgb),0.2)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--text)" }}>
              Slide-by-slide plan
            </h2>
            <p className="text-xs mt-1 max-w-xl" style={{ color: "var(--muted)" }}>
              For each slide: keep or drop it, edit the title, edit or remove points, or add new points. Reorder with ↑ ↓. Then generate.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg font-bold border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                {intelligence?.title || "Document"}
              </span>
              <span className="px-2.5 py-1 rounded-lg font-semibold" style={{ background: "rgba(var(--primary-rgb),0.12)", color: "var(--primary)" }}>
                {includedCount} / {(blueprint || []).length} slides included
              </span>
              <span className="px-2.5 py-1 rounded-lg" style={{ color: "var(--muted)" }}>
                Target: {options.slideCount || "auto"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            <ArrowLeft size={14} /> Content selection
          </button>
        </div>
      </div>

      {/* AI refine */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center gap-2">
          <MessageSquarePlus size={16} style={{ color: "var(--primary)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Ask AI to change the plan</h3>
        </div>
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>
          Examples: “Merge slides 4 and 5”, “Add a risk slide after KPIs”, “Make slide 3 focus on Anaicut only”, “Drop all raw table dump slides”
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && instruction.trim() && !refining) onRefine(instruction);
            }}
            placeholder="Describe the change you want…"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm border bg-[var(--bg-subtle)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            disabled={refining}
          />
          <button
            type="button"
            disabled={!instruction.trim() || refining}
            onClick={() => onRefine(instruction)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${
              instruction.trim() && !refining ? "btn-gradient text-white" : "opacity-50 cursor-not-allowed"
            }`}
            style={!instruction.trim() || refining ? { background: "var(--bg-subtle)", color: "var(--muted)" } : undefined}
          >
            {refining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {refining ? "Updating…" : "Apply"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
          style={
            filterType === "all"
              ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
              : { background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }
          }
        >
          All types
        </button>
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
            style={
              filterType === t
                ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
                : { background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }
            }
          >
            {SLIDE_TYPE_META[t]?.label || t}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-1">
          <button type="button" onClick={() => selectAll(true)} className="text-[11px] font-bold px-2 py-1" style={{ color: "var(--primary)" }}>
            Include all
          </button>
          <button type="button" onClick={() => selectAll(false)} className="text-[11px] font-bold px-2 py-1" style={{ color: "var(--muted)" }}>
            Exclude all
          </button>
          <button
            type="button"
            onClick={() => {
              setBlueprint((prev) => {
                const next = [
                  ...prev,
                  {
                    slideType: "insights",
                    title: "New slide",
                    subtitle: "Custom content",
                    bullets: ["Add your points here"],
                    included: true,
                    slideIndex: prev.length + 1,
                  },
                ];
                const ty = next.findIndex((s) => String(s.slideType).toLowerCase() === "thankyou" || s.slideType === "thankYou");
                if (ty > 0) {
                  const slide = next.pop();
                  next.splice(ty, 0, slide);
                }
                return next.map((s, i) => ({ ...s, slideIndex: i + 1 }));
              });
            }}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg border"
            style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
          >
            + New slide
          </button>
          <button
            type="button"
            onClick={() => {
              const target = parseInt(options.slideCount, 10) || 18;
              setBlueprint((prev) => ensureSlideCount(prev, target, intelligence));
            }}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            title="Pad or trim the plan to match the target slide count"
          >
            Match target ({options.slideCount || 18})
          </button>
        </div>
      </div>

      {/* Slide list */}
      <div className="space-y-2">
        {visible.map(({ s, idx }) => {
          const meta = SLIDE_TYPE_META[s.slideType] || { label: s.slideType || "Slide", color: "#64748b" };
          const on = s.included !== false;
          return (
            <div
              key={`${idx}-${s.slideType}-${s.title}`}
              className={`rounded-xl border p-3.5 transition-all ${on ? "" : "opacity-55"}`}
              style={{
                borderColor: on ? "rgba(var(--primary-rgb),0.35)" : "var(--border)",
                background: on ? "rgba(var(--primary-rgb),0.05)" : "var(--card)",
              }}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0"
                  style={
                    on
                      ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
                      : { borderColor: "var(--border)" }
                  }
                >
                  {on && <CheckSquare size={12} strokeWidth={3} />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-md text-white"
                      style={{ background: meta.color }}
                    >
                      {String(s.slideIndex || idx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    {editingIdx === idx ? (
                      <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveTitle(idx);
                            if (e.key === "Escape") setEditingIdx(null);
                          }}
                          className="flex-1 px-2 py-1 rounded-lg text-sm border bg-[var(--bg-subtle)]"
                          style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        />
                        <button type="button" onClick={() => saveTitle(idx)} className="text-[11px] font-bold px-2" style={{ color: "var(--primary)" }}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-semibold text-left hover:underline"
                        style={{ color: "var(--text)" }}
                        onClick={() => {
                          setEditingIdx(idx);
                          setEditTitle(s.title || "");
                        }}
                        title="Click to rename"
                      >
                        {s.title || "Untitled slide"}
                      </button>
                    )}
                  </div>
                  {s.subtitle && (
                    <p className="text-[11px] mt-1 line-clamp-1" style={{ color: "var(--muted)" }}>
                      {s.subtitle}
                    </p>
                  )}
                  {/* Per-slide content editor */}
                  <div className="mt-2 space-y-1.5">
                    {(s.bullets || []).map((b, bi) => {
                      const label = typeof b === "string" ? b : b?.text || JSON.stringify(b);
                      return (
                        <div key={bi} className="flex items-start gap-1.5 group">
                          <span className="text-[11px] mt-1.5" style={{ color: "var(--primary)" }}>•</span>
                          <input
                            type="text"
                            value={label}
                            onChange={(e) => {
                              setBlueprint((prev) =>
                                prev.map((sl, i) => {
                                  if (i !== idx) return sl;
                                  const bullets = [...(sl.bullets || [])];
                                  bullets[bi] = e.target.value;
                                  return { ...sl, bullets };
                                })
                              );
                            }}
                            className="flex-1 min-w-0 px-2 py-1 rounded-lg text-[11px] border bg-[var(--bg-subtle)] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                            style={{ borderColor: "var(--border)", color: "var(--text)" }}
                          />
                          <button
                            type="button"
                            title="Remove this point"
                            onClick={() => {
                              setBlueprint((prev) =>
                                prev.map((sl, i) => {
                                  if (i !== idx) return sl;
                                  return {
                                    ...sl,
                                    bullets: (sl.bullets || []).filter((_, j) => j !== bi),
                                  };
                                })
                              );
                            }}
                            className="p-1 rounded opacity-50 hover:opacity-100 hover:text-rose-400 transition"
                            style={{ color: "var(--muted)" }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setBlueprint((prev) =>
                          prev.map((sl, i) => {
                            if (i !== idx) return sl;
                            return {
                              ...sl,
                              bullets: [...(sl.bullets || []), "New point — edit me"],
                            };
                          })
                        );
                      }}
                      className="text-[11px] font-semibold flex items-center gap-1 mt-1 px-2 py-1 rounded-lg border border-dashed hover:border-[var(--primary)] transition"
                      style={{ borderColor: "var(--border)", color: "var(--primary)" }}
                    >
                      + Add content to this slide
                    </button>
                  </div>
                  {(s.kpiCards || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(s.kpiCards || []).slice(0, 4).map((k, ki) => (
                        <span
                          key={ki}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: "var(--bg-subtle)", color: "var(--text)" }}
                        >
                          {k.label}: <b>{k.value}{k.unit ? ` ${k.unit}` : ""}</b>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px]" style={{ color: "var(--muted)" }}>
                    {(s.chart || s.charts) && <span>📈 Chart data</span>}
                    {(s.table || s.tables) && <span>📋 Table data</span>}
                    {s.insightHeadline && <span className="line-clamp-1">💡 {s.insightHeadline}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => move(idx, -1)} className="p-1.5 rounded-lg border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--muted)" }} title="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(idx, 1)} className="p-1.5 rounded-lg border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--muted)" }} title="Move down">
                    ↓
                  </button>
                  <button type="button" onClick={() => remove(idx)} className="p-1.5 rounded-lg border text-[10px] hover:text-rose-500" style={{ borderColor: "var(--border)", color: "var(--muted)" }} title="Remove">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl"
        style={{ background: "rgba(10, 15, 30, 0.88)", borderColor: "rgba(255,255,255,0.08)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="text-xs" style={{ color: "#94a3b8" }}>
            <span className="font-bold text-white">{includedCount}</span> slides will be generated
            <span className="mx-1">·</span>
            {(blueprint || []).length - includedCount} excluded
          </div>
          <button
            type="button"
            disabled={includedCount === 0}
            onClick={onGenerate}
            className={`sm:ml-auto sm:w-auto w-full py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
              includedCount > 0 ? "btn-gradient text-white shadow-lg" : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            <Sparkles size={17} />
            Generate {includedCount} slides
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}


export default function PresentationGenerator({ user }) {
  const [file, setFile] = useState(null);
  const [options, setOptions] = useState({
    purpose: "Executive Briefing",
    audience: "Senior Management",
    slideCount: "18",
    language: "English",
    template: "sharyx",
    colorPalette: "violet",
    theme: "sharyx:violet",
    watermarkText: "",
  });
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [progressStatus, setProgressStatus] = useState("starting");
  const [resultInfo, setResultInfo] = useState(null);
  const [error, setError] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [selection, setSelection] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [refining, setRefining] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const jobIdRef = useRef(`pres_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const sseRef = useRef(null);
  const abortRef = useRef(null);
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (status !== "running" && status !== "analyzing") return;
    const interval = setInterval(() => setProgress((prev) => (prev < 92 ? prev + 1 : prev)), 600);
    return () => clearInterval(interval);
  }, [status]);

  const connectSSE = useCallback((jobId) => {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`${API}/api/progress/${jobId}`, { withCredentials: true });
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const percentVal = typeof data.percent === "number" ? data.percent : (typeof data.progress === "number" ? data.progress : null);
        const stageVal = data.stage || data.status;
        if (percentVal !== null) setProgress((prev) => Math.max(prev, percentVal));
        if (data.message) setProgressMessage(data.message);
        if (stageVal && stageVal !== "starting" && stageVal !== "running") setProgressStatus(stageVal);
        if (stageVal === "error" || data.status === "error") {
          setStatus("error");
          setError(data.message || "Generation failed");
          es.close();
        }
      } catch {}
    };
    es.onerror = () => es.close();
  }, [API]);

  const handleAnalyze = async () => {
    if (!file) return;
    setStatus("analyzing");
    setProgress(8);
    setProgressMessage("Extracting document intelligence for preview…");
    setProgressStatus("parsing");
    setError(null);
    setIntelligence(null);
    setSelection(null);
    setResultInfo(null);
    const jobId = `pres_analyze_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    jobIdRef.current = jobId;
    connectSSE(jobId);
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const resp = await fetch(`${API}/api/presentation/analyze`, { method: "POST", credentials: "include", body: form, signal: ctrl.signal });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.message || `Server error ${resp.status}`);
      }
      const data = await resp.json();
      if (!data.success || !data.intelligence) throw new Error(data.message || "Analysis returned no content");
      setIntelligence(data.intelligence);
      setSelection(buildDefaultSelection(data.intelligence));
      setStatus("preview");
      setProgress(100);
      setProgressMessage("Analysis complete — select content to include");
    } catch (err) {
      if (err.name === "AbortError") return;
      setStatus("error");
      setError(err.message || "Document analysis failed. Please try again.");
    } finally {
      if (sseRef.current) sseRef.current.close();
    }
  };

  const handleGenerate = async () => {
    if (!file || !selection) return;
    setStatus("running");
    setProgress(8);
    setProgressMessage("Generating presentation from selected content…");
    setProgressStatus("planning");
    setError(null);
    setResultInfo(null);
    const jobId = `pres_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    jobIdRef.current = jobId;
    connectSSE(jobId);
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    form.append("purpose", options.purpose);
    form.append("audience", options.audience);
    form.append("slideCount", options.slideCount || "");
    form.append("language", options.language);
    form.append("theme", options.theme);
    if (options.watermarkText) form.append("watermarkText", options.watermarkText);
    if (options.focusAreasText) {
      const areas = options.focusAreasText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
      if (areas.length) form.append("focusAreas", JSON.stringify(areas));
    }
    form.append("contentSelection", JSON.stringify(selection));
    if (blueprint && blueprint.length) {
      const cleanPlan = blueprint
        .filter((s) => s && s.included !== false)
        .filter((s) => {
          const title = String(s.title || "").trim();
          const bullets = (s.bullets || []).map((b) => String(b || "").trim());
          // Drop empty client placeholders
          if (/^new slide$/i.test(title) && bullets.every((b) => !b || /add your points|edit me|custom content/i.test(b))) {
            return false;
          }
          return true;
        })
        .map((s, i) => ({ ...s, slideIndex: i + 1, included: undefined }));
      if (cleanPlan.length) {
        form.append("customBlueprint", JSON.stringify(cleanPlan));
      }
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const resp = await fetch(`${API}/api/presentation/generate`, { method: "POST", credentials: "include", body: form, signal: ctrl.signal });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.message || `Server error ${resp.status}`);
      }
      const slideCount = resp.headers.get("X-Slide-Count");
      const docType = resp.headers.get("X-Document-Type");
      const presId = resp.headers.get("X-Presentation-Id");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const safeName = (file.name.replace(/\.[^.]+$/, "") || "presentation").slice(0, 60);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      setResultInfo({ slideCount: slideCount || options.slideCount || "18", docType: docType || "Document", presId });
      setStatus("done");
      setProgress(100);
      setProgressMessage(`Presentation complete — ${slideCount || "18"} slides generated & auto-downloaded!`);
      loadHistory();
    } catch (err) {
      if (err.name === "AbortError") return;
      setStatus("error");
      setError(err.message || "Presentation generation failed. Please try again.");
    } finally {
      if (sseRef.current) sseRef.current.close();
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    if (sseRef.current) sseRef.current.close();
    setStatus(intelligence ? "preview" : "idle");
    setProgress(0);
    setProgressMessage("");
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const resp = await fetch(`${API}/api/presentation/history`, { credentials: "include" });
      const data = await resp.json();
      if (data.success) setHistory(data.presentations || []);
    } catch {}
    setHistoryLoading(false);
  };

  useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab]);

  const handleDownload = async (id) => {
    const a = document.createElement("a");
    a.href = `${API}/api/presentation/${id}/download`;
    a.download = "presentation.pptx";
    a.click();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this presentation deck from history?")) return;
    await fetch(`${API}/api/presentation/${id}`, { method: "DELETE", credentials: "include" });
    setHistory((prev) => prev.filter((p) => p._id !== id));
  };

  
  const handlePlan = async () => {
    if (!selection || !intelligence) return;
    setError(null);
    setProgress(20);
    setProgressMessage("Building your slide plan…");
    setProgressStatus("planning");

    // Always open the editor immediately with a local plan from selected content
    const target = parseInt(options.slideCount, 10) || 18;
    let local = buildClientSlidePlan(intelligence, selection, options);
    local = ensureSlideCount(local, target, intelligence);
    const mapped = (local || []).map((s, i) => ({
      ...s,
      included: s.included !== false,
      slideIndex: s.slideIndex || i + 1,
      bullets: Array.isArray(s.bullets) ? s.bullets : [],
    }));
    if (!mapped.length) {
      setError("Could not build a slide plan from the selected content.");
      setStatus("error");
      return;
    }
    setBlueprint(mapped);
    setStatus("planning");
    setProgress(100);
    setProgressMessage(`Slide plan ready — ${mapped.length} slides (target ${target}). Edit each slide, then generate.`);

    // Optional: upgrade plan from server in the background (non-blocking)
    if (file) {
      (async () => {
        try {
          const jobId = jobIdRef.current;
          const form = new FormData();
          form.append("file", file);
          form.append("jobId", jobId);
          form.append("purpose", options.purpose);
          form.append("audience", options.audience);
          form.append("slideCount", options.slideCount || "");
          form.append("language", options.language);
          form.append("theme", options.theme);
          if (options.watermarkText) form.append("watermarkText", options.watermarkText);
          if (options.focusAreasText) {
            const areas = options.focusAreasText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 5);
            if (areas.length) form.append("focusAreas", JSON.stringify(areas));
          }
          form.append("contentSelection", JSON.stringify(selection));
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 20000);
          const resp = await fetch(`${API}/api/presentation/plan`, {
            method: "POST",
            body: form,
            credentials: "include",
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          const data = await resp.json().catch(() => ({}));
          if (
            resp.ok &&
            data.success &&
            Array.isArray(data.blueprint) &&
            data.blueprint.length &&
            // only replace if user is still on planning and hasn't customized heavily
            true
          ) {
            // Don't auto-replace if user already edited — skip silent upgrade for safety
            console.info(
              "[plan] Server plan available (" +
                data.blueprint.length +
                " slides). Local plan already shown; ignore unless user retries."
            );
          }
        } catch (e) {
          /* ignore — local plan is already live */
        }
      })();
    }
  };

  const handleRefine = async (instruction) => {
    if (!blueprint?.length || !instruction?.trim()) return;
    setRefining(true);
    setError(null);
    const textIn = instruction.trim();
    try {
      const resp = await fetch(`${API}/api/presentation/refine-plan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint,
          instruction: textIn,
          context: {
            title: intelligence?.title,
            documentType: intelligence?.documentType,
            organization: intelligence?.organization,
          },
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success && Array.isArray(data.blueprint)) {
        setBlueprint(
          data.blueprint.map((s, i) => ({
            ...s,
            included: s.included !== false,
            slideIndex: s.slideIndex || i + 1,
          }))
        );
        return;
      }
      throw new Error(data.message || "Refine API unavailable");
    } catch (err) {
      const lower = textIn.toLowerCase();
      let next = blueprint.map((s) => ({ ...s }));
      let applied = false;
      if (/exclude all table|remove all table|drop all table/.test(lower)) {
        next = next.map((s) => (s.slideType === "table" ? { ...s, included: false } : s));
        applied = true;
      } else if (/exclude all chart|remove all chart|drop all chart/.test(lower)) {
        next = next.map((s) =>
          ["chart", "dualChart"].includes(s.slideType) ? { ...s, included: false } : s
        );
        applied = true;
      } else if (/include all/.test(lower)) {
        next = next.map((s) => ({ ...s, included: true }));
        applied = true;
      } else if (/(?:remove|exclude) slide (\d+)/.test(lower)) {
        const m = lower.match(/(?:remove|exclude) slide (\d+)/);
        const n = m ? parseInt(m[1], 10) : -1;
        next = next.map((s, i) =>
          (s.slideIndex || i + 1) === n ? { ...s, included: false } : s
        );
        applied = n > 0;
      }
      if (applied) {
        setBlueprint(next.map((s, i) => ({ ...s, slideIndex: i + 1 })));
      } else {
        setError(
          "AI refine needs the backend route. You can still toggle, rename, reorder, or remove slides manually."
        );
      }
    } finally {
      setRefining(false);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setFile(null);
    setProgress(0);
    setResultInfo(null);
    setError(null);
    setIntelligence(null);
    setSelection(null);
    jobIdRef.current = `pres_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  };

  const handleBackToUpload = () => {
    setStatus("idle");
    setIntelligence(null);
    setSelection(null);
    setBlueprint(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><PresentationIcon size={28} /></div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight gradient-text">AI Presentation Generator</h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--muted)" }}>Analyze your document, choose what to include, then generate a structured PPTX deck.</p>
          </div>
        </div>
        <UsageBadge type="presentation" />
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] w-fit">
        <button onClick={() => setActiveTab("generate")} className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === "generate" ? "bg-[var(--card)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"}`}>
          <Sparkles size={16} className="text-indigo-500" /> Generate Deck
        </button>
        <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === "history" ? "bg-[var(--card)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"}`}>
          <Clock size={16} className="text-indigo-500" /> History
          {history.length > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{history.length}</span>}
        </button>
      </div>

      {activeTab === "generate" && (
        <div className="space-y-6">
          {/* Flow steps */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
            {[
              { id: "idle", label: "1. Upload", active: status === "idle" || status === "analyzing" },
              { id: "preview", label: "2. Choose content", active: status === "preview" },
              { id: "planning", label: "3. Slide plan", active: status === "planning" || (status === "running" && progressStatus === "planning") },
              { id: "done", label: "4. PPTX", active: status === "done" || (status === "running" && progressStatus !== "planning") },
            ].map((step, i, arr) => (
              <div key={step.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <span
                  className="px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold border whitespace-nowrap"
                  style={
                    step.active
                      ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
                      : { background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }
                  }
                >
                  {step.label}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>→</span>
                )}
              </div>
            ))}
          </div>

          {status === "idle" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Upload Source Document</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Step 1 of 4 — Upload a document. Next you will choose content, then review each planned slide, then generate PPTX.</p>
              </div>
              <DropZone file={file} onFile={(f) => { setFile(f); setIntelligence(null); setSelection(null); }} onRemove={() => { setFile(null); setIntelligence(null); setSelection(null); }} />
              <button disabled={!file} onClick={handleAnalyze}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                  file ? "btn-gradient text-white shadow-lg cursor-pointer" : "bg-[var(--secondary)] text-[var(--muted)] opacity-60 cursor-not-allowed border border-[var(--border)]"
                }`}>
                <Eye size={18} /><span>Analyze Document &amp; Preview Content</span>
              </button>
            </motion.div>
          )}

          {status === "analyzing" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Analyzing Document</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Source: <strong className="font-semibold text-[var(--text)]">{file?.name}</strong></p>
                </div>
                <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition">Cancel</button>
              </div>
              <PipelineProgress status={progressStatus} progress={progress} message={progressMessage} />
            </motion.div>
          )}

          {status === "preview" && intelligence && selection && (
            <>
              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">Could not open slide plan</p>
                    <p className="text-xs opacity-90 mt-0.5 break-words">{error}</p>
                  </div>
                  <button type="button" onClick={() => setError(null)} className="ml-auto text-xs opacity-70 hover:opacity-100">Dismiss</button>
                </div>
              )}
              <ContentPreviewPanel intelligence={intelligence} selection={selection} setSelection={setSelection}
                options={options} setOptions={setOptions} showOptions={showOptions} setShowOptions={setShowOptions}
                onGenerate={handlePlan} onBack={handleBackToUpload} />
            </>
          )}

          {status === "planning" && blueprint && (
            <SlidePlanEditor
              blueprint={blueprint}
              setBlueprint={setBlueprint}
              intelligence={intelligence}
              options={options}
              onGenerate={handleGenerate}
              onBack={() => { setStatus("preview"); setBlueprint(null); }}
              onRefine={handleRefine}
              refining={refining}
            />
          )}

          {status === "running" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Generating Presentation</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Using your selected content from <strong className="font-semibold text-[var(--text)]">{file?.name}</strong></p>
                </div>
                <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition">Cancel</button>
              </div>
              <PipelineProgress status={progressStatus} progress={progress} message={progressMessage} />
            </motion.div>
          )}

          {status === "done" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8 text-center space-y-5 border bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto"><CheckCircle2 size={36} /></div>
              <div>
                <h2 className="text-2xl font-black font-heading" style={{ color: "var(--text)" }}>Presentation Deck Ready!</h2>
                <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted)" }}>Generated from your selected content and downloaded.</p>
              </div>
              {resultInfo && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">📊 {resultInfo.slideCount} Slides</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--card)] border border-[var(--border)]" style={{ color: "var(--text)" }}>📄 {resultInfo.docType}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button onClick={handleReset} className="px-5 py-2.5 rounded-xl font-bold text-sm btn-gradient text-white shadow-md flex items-center gap-2"><RefreshCw size={16} /> Generate Another</button>
                {intelligence && <button onClick={() => setStatus("preview")} className="px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[var(--card)] text-[var(--text)] hover:bg-[var(--bg-subtle)] transition" style={{ borderColor: "var(--border)" }}>Adjust Selection &amp; Regenerate</button>}
                <button onClick={() => setActiveTab("history")} className="px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[var(--card)] text-[var(--text)] hover:bg-[var(--bg-subtle)] transition" style={{ borderColor: "var(--border)" }}>View All Presentations</button>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8 text-center space-y-4 border bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto"><AlertTriangle size={30} /></div>
              <div>
                <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {intelligence ? "Could not continue" : "Analysis Failed"}
                </h2>
                <p className="text-xs sm:text-sm mt-1 max-w-lg mx-auto" style={{ color: "var(--muted)" }}>{error || "An unexpected error occurred."}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {intelligence ? (
                  <>
                    <button onClick={() => { setStatus("preview"); setError(null); }} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 transition shadow-md">Back to content selection</button>
                    <button onClick={handlePlan} className="px-5 py-2.5 rounded-xl font-bold text-sm border bg-[var(--card)] hover:bg-[var(--bg-subtle)] transition" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Retry slide plan</button>
                  </>
                ) : (
                  <button onClick={handleReset} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 transition shadow-md">Try Again</button>
                )}
              </div>
            </motion.div>
          )}

          {status === "idle" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {[
                { icon: Eye, title: "Content Preview First", desc: "See sections, KPIs, and findings before any PPTX is built." },
                { icon: Filter, title: "Choose What to Include", desc: "Toggle sections, metrics, recommendations, tables, and charts." },
                { icon: BrainCircuit, title: "AI Document Intelligence", desc: "Extracts key insights, data points, and executive takeaways." },
                { icon: BarChart3, title: "Data & KPI Visuals", desc: "Formats metrics and tables into clear, slide-ready components." },
                { icon: Palette, title: "7 Custom Themes", desc: "Executive Navy, Pitch Deck, Tech Dark, Minimal Light & more." },
                { icon: ShieldCheck, title: "Secure & Private", desc: "Temporary processing with strict privacy guarantees." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="glass-card rounded-xl p-4 flex items-start gap-3 border transition hover:border-[var(--primary)]/40">
                  <div className="p-2 rounded-lg bg-[rgba(var(--primary-rgb),0.08)] text-[var(--primary)] shrink-0"><Icon size={18} /></div>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: "var(--text)" }}>{title}</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Presentation History</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Your generated presentations are saved for 7 days.</p>
            </div>
            <button onClick={loadHistory} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-[var(--bg-subtle)] transition" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              <RefreshCw size={13} className={historyLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[var(--muted)] gap-2">
              <Loader2 size={18} className="animate-spin text-[var(--primary)]" /><span>Loading presentations...</span>
            </div>
          ) : (
            <HistoryPanel history={history} onDownload={handleDownload} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}
