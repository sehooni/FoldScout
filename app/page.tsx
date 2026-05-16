"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Loader2, Sparkles, Database, AlertCircle, Type, GitCompare, Languages, ShieldCheck, Info } from "lucide-react";
import PlddtChart from "@/components/PlddtChart";
import type { AnalyzeResponse } from "./api/analyze/route";

const MolViewer = dynamic(() => import("@/components/MolViewer"), { ssr: false });

const PRESETS = [
  { id: "P04637", label: "TP53", emoji: "🔴", desc: "Tumor suppressor • Human" },
  { id: "P42212", label: "GFP", emoji: "🟢", desc: "Green fluorescent • Jellyfish" },
  { id: "P0DTC2", label: "SARS-CoV-2 Spike", emoji: "🦠", desc: "Viral fusion protein" },
];

// Short, demo-friendly sequences (≤ 400 aa for ESMFold API)
const SEQ_PRESETS = [
  {
    label: "Ubiquitin (76 aa)",
    emoji: "🧪",
    name: "Ubiquitin",
    seq: "MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG",
  },
  {
    label: "Insulin A+B (51 aa)",
    emoji: "💉",
    name: "Insulin",
    seq: "GIVEQCCTSICSLYQLENYCNFVNQHLCGSHLVEALYLVCGERGFFYTPKT",
  },
  {
    label: "Lysozyme C (130 aa)",
    emoji: "🥚",
    name: "Lysozyme C",
    seq: "KVFERCELARTLKRLGMDGYRGISLANWMCLAKWESGYNTRATNYNAGDRSTDYGIFQINSRYWCNDGKTPGAVNACHLSCSALLQDNIADAVACAKRVVRDPQGIRAWVAWRNRCQNRDVRQYVQGCGV",
  },
];

type Lang = "en" | "ko";
type InputMode = "id" | "sequence";
type ColorMode = "plddt" | "spectrum" | "alphamissense";

interface Slot {
  query: string;
  result: AnalyzeResponse | null;
  report: string | null;
  loading: boolean;
  reportLoading: boolean;
  error: string | null;
}

const emptySlot: Slot = { query: "", result: null, report: null, loading: false, reportLoading: false, error: null };

const TXT = {
  en: {
    tagline: "From structure to insight in 30 seconds.",
    sub: (a: string, b: string) => `Paste a ${a} or ${b}. We fetch the structure, ground facts via UniProt, and generate a hallucination-controlled report.`,
    inputModeId: "ID lookup",
    inputModeSeq: "Sequence (ESMFold)",
    placeholderId: "e.g., P04637 or 1TUP",
    placeholderSeq: "Paste amino acid sequence (20-400 aa)",
    seqLabel: "Label (optional)",
    analyze: "Analyze",
    try: "Try:",
    compare: "Compare a 2nd protein",
    closeCompare: "Hide compare",
    coloring: "Coloring:",
    colorPlddt: "pLDDT",
    colorSpectrum: "Spectrum",
    colorAm: "AlphaMissense",
    aiReport: "AI Structural Report",
    grounded: "Grounded in UniProt facts (temperature 0.2)",
    notGrounded: "Limited grounding (no UniProt mapping)",
    loadingStruct: "Fetching structure & confidence...",
    loadingReport: "Generating grounded report...",
    empty: "No structure loaded. Pick a preset above or enter an ID/sequence.",
    legendPlddt: ["Very high ≥90", "High 70-90", "Low 50-70", "Very low <50"],
    legendAm: ["High path. ≥0.7", "Medium 0.45-0.7", "Low <0.3"],
    amTitle: "AlphaMissense",
    amAvail: "available",
    amMiss: "not available",
    meanPlddt: "Mean pLDDT",
    perResidue: "Per-residue confidence (pLDDT)",
    failed: "Analysis failed",
    factsBlock: "UniProt facts used (anti-hallucination)",
    noFacts: "No UniProt mapping — report will be limited",
  },
  ko: {
    tagline: "구조에서 인사이트까지, 30초.",
    sub: (a: string, b: string) => `${a} 또는 ${b}를 입력하세요. 구조를 가져와 UniProt fact로 grounding하고, 환각이 통제된 리포트를 생성합니다.`,
    inputModeId: "ID 조회",
    inputModeSeq: "서열 입력 (ESMFold)",
    placeholderId: "예: P04637 또는 1TUP",
    placeholderSeq: "아미노산 서열을 붙여넣으세요 (20-400 aa)",
    seqLabel: "이름 (선택)",
    analyze: "분석",
    try: "예시:",
    compare: "두 번째 단백질과 비교",
    closeCompare: "비교 닫기",
    coloring: "컬러링:",
    colorPlddt: "pLDDT",
    colorSpectrum: "Spectrum",
    colorAm: "AlphaMissense",
    aiReport: "AI 구조 리포트",
    grounded: "UniProt fact에 기반 (temperature 0.2)",
    notGrounded: "제한된 grounding (UniProt 매핑 없음)",
    loadingStruct: "구조 및 신뢰도 가져오는 중...",
    loadingReport: "Grounded 리포트 생성 중...",
    empty: "구조가 로드되지 않았습니다. 위 프리셋 또는 ID/서열을 입력하세요.",
    legendPlddt: ["매우 높음 ≥90", "높음 70-90", "낮음 50-70", "매우 낮음 <50"],
    legendAm: ["높은 병원성 ≥0.7", "중간 0.45-0.7", "낮음 <0.3"],
    amTitle: "AlphaMissense",
    amAvail: "사용 가능",
    amMiss: "없음",
    meanPlddt: "평균 pLDDT",
    perResidue: "잔기별 신뢰도 (pLDDT)",
    failed: "분석 실패",
    factsBlock: "UniProt fact 활용 (할루시네이션 방지)",
    noFacts: "UniProt 매핑 없음 — 리포트가 제한됨",
  },
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<InputMode>("id");
  const [colorMode, setColorMode] = useState<ColorMode>("plddt");
  const [compareOpen, setCompareOpen] = useState(false);

  const [slotA, setSlotA] = useState<Slot>(emptySlot);
  const [slotB, setSlotB] = useState<Slot>(emptySlot);

  const [seqInput, setSeqInput] = useState("");
  const [seqLabel, setSeqLabel] = useState("");

  const t = TXT[lang];

  // Track the language used for the currently displayed report. When the user
  // toggles language while a result is on screen, automatically regenerate
  // only the report (no need to refetch the structure).
  const slotALastLangRef = useRef<Lang | null>(null);
  const slotBLastLangRef = useRef<Lang | null>(null);

  async function regenerateReport(slot: Slot, setSlot: (s: Slot) => void) {
    if (!slot.result) return;
    setSlot({ ...slot, reportLoading: true, report: null });
    try {
      const rRes = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          info: slot.result.info,
          plddt: slot.result.plddt,
          regions: slot.result.regions,
          facts: slot.result.facts,
          lang,
        }),
      });
      const rJson = await rRes.json();
      if (!rRes.ok) throw new Error(rJson.error || "Report failed");
      setSlot({ ...slot, reportLoading: false, report: rJson.report });
    } catch (e: any) {
      setSlot({ ...slot, reportLoading: false, error: e?.message || "Unknown error" });
    }
  }

  useEffect(() => {
    if (slotA.result && slotALastLangRef.current && slotALastLangRef.current !== lang && !slotA.reportLoading) {
      slotALastLangRef.current = lang;
      regenerateReport(slotA, setSlotA);
    } else if (slotA.result && !slotALastLangRef.current) {
      slotALastLangRef.current = lang;
    }
    if (slotB.result && slotBLastLangRef.current && slotBLastLangRef.current !== lang && !slotB.reportLoading) {
      slotBLastLangRef.current = lang;
      regenerateReport(slotB, setSlotB);
    } else if (slotB.result && !slotBLastLangRef.current) {
      slotBLastLangRef.current = lang;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, slotA.result, slotB.result]);

  async function runForSlot(slot: Slot, setSlot: (s: Slot) => void, payload: any) {
    setSlot({ ...slot, loading: true, error: null, result: null, report: null });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSlot({ ...slot, loading: false, result: data, reportLoading: true, error: null, report: null });
      // Kick off report
      const rRes = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          info: data.info,
          plddt: data.plddt,
          regions: data.regions,
          facts: data.facts,
          lang,
        }),
      });
      const rJson = await rRes.json();
      if (!rRes.ok) throw new Error(rJson.error || "Report failed");
      setSlot({ ...slot, loading: false, result: data, reportLoading: false, report: rJson.report, error: null });
    } catch (e: any) {
      setSlot({ ...slot, loading: false, reportLoading: false, error: e?.message || "Unknown error" });
    }
  }

  function analyzeSlotA(q: string) {
    if (mode === "id") runForSlot(slotA, setSlotA, { mode: "id", query: q });
    else runForSlot(slotA, setSlotA, { mode: "sequence", sequence: seqInput, label: seqLabel });
  }
  function analyzeSlotB(q: string) {
    runForSlot(slotB, setSlotB, { mode: "id", query: q });
  }

  function onSubmitA(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "id") {
      if (!slotA.query.trim()) return;
      analyzeSlotA(slotA.query.trim());
    } else {
      if (!seqInput.trim()) return;
      analyzeSlotA("");
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/70 backdrop-blur sticky top-0 z-20 bg-[#070b14]/85">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg">🧬</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FoldScout</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-400" /> grounded structural review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/about"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-xs border border-slate-700 text-slate-200"
            >
              <Info className="w-3.5 h-3.5" />
              {lang === "ko" ? "소개" : "About"}
            </Link>
            <button
              onClick={() => setLang(lang === "en" ? "ko" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-xs border border-slate-700"
            >
              <Languages className="w-3.5 h-3.5" />
              {lang === "en" ? "한국어로" : "English"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <section className="mb-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent">{t.tagline}</h2>
          <p className="text-slate-400 mb-5 max-w-2xl text-sm">
            {t.sub(
              `${lang === "ko" ? "UniProt ID" : "UniProt ID"}`,
              `${lang === "ko" ? "PDB ID" : "PDB ID"}`
            )}
          </p>

          {/* Mode toggle */}
          <div className="inline-flex bg-slate-900/70 border border-slate-700 rounded-lg p-1 mb-3 text-sm">
            <button
              onClick={() => setMode("id")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 ${mode === "id" ? "bg-cyan-500 text-slate-900 font-medium" : "text-slate-300"}`}
            >
              <Search className="w-3.5 h-3.5" /> {t.inputModeId}
            </button>
            <button
              onClick={() => setMode("sequence")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 ${mode === "sequence" ? "bg-cyan-500 text-slate-900 font-medium" : "text-slate-300"}`}
            >
              <Type className="w-3.5 h-3.5" /> {t.inputModeSeq}
            </button>
          </div>

          <form onSubmit={onSubmitA} className="space-y-2">
            {mode === "id" ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={slotA.query}
                    onChange={(e) => setSlotA({ ...slotA, query: e.target.value })}
                    placeholder={t.placeholderId}
                    className="w-full bg-slate-900/70 border border-slate-700 focus:border-cyan-500 outline-none rounded-lg pl-10 pr-4 py-3 font-mono text-sm"
                  />
                </div>
                <button type="submit" disabled={slotA.loading || !slotA.query.trim()} className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 font-medium text-slate-900 flex items-center gap-2">
                  {slotA.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {t.analyze}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={seqLabel}
                  onChange={(e) => setSeqLabel(e.target.value)}
                  placeholder={t.seqLabel}
                  className="w-full bg-slate-900/70 border border-slate-700 focus:border-cyan-500 outline-none rounded-lg px-4 py-2 text-sm"
                />
                <textarea
                  value={seqInput}
                  onChange={(e) => setSeqInput(e.target.value)}
                  placeholder={t.placeholderSeq}
                  rows={4}
                  className="w-full bg-slate-900/70 border border-slate-700 focus:border-cyan-500 outline-none rounded-lg px-4 py-3 font-mono text-xs"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={slotA.loading || !seqInput.trim()} className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 font-medium text-slate-900 flex items-center gap-2">
                    {slotA.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} ESMFold + {t.analyze}
                  </button>
                  <span className="text-xs text-slate-500 ml-2">{t.try}</span>
                  {SEQ_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setSeqInput(p.seq); setSeqLabel(p.name); }}
                      disabled={slotA.loading}
                      className="px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span>{p.emoji}</span>
                      <span className="font-medium">{p.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {lang === "ko" ? "ESMFold는 단일 도메인(≤400 aa)에 가장 잘 작동합니다." : "ESMFold works best on single domains (≤400 aa)."}
                </p>
              </div>
            )}
          </form>

          {mode === "id" && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-slate-500 self-center mr-1">{t.try}</span>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSlotA({ ...emptySlot, query: p.id }); analyzeSlotA(p.id); }}
                  disabled={slotA.loading}
                  className="px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>{p.emoji}</span>
                  <span className="font-medium">{p.label}</span>
                  <span className="text-slate-500 hidden sm:inline">• {p.desc}</span>
                </button>
              ))}

              <button
                onClick={() => setCompareOpen(!compareOpen)}
                className="ml-auto px-3 py-1.5 rounded-full bg-violet-900/40 hover:bg-violet-900/60 border border-violet-700 text-xs flex items-center gap-1.5 text-violet-200"
              >
                <GitCompare className="w-3.5 h-3.5" />
                {compareOpen ? t.closeCompare : t.compare}
              </button>
            </div>
          )}

          {compareOpen && mode === "id" && (
            <div className="mt-3 p-3 rounded-lg bg-violet-950/20 border border-violet-900/50 flex gap-2">
              <div className="relative flex-1">
                <GitCompare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                <input
                  value={slotB.query}
                  onChange={(e) => setSlotB({ ...slotB, query: e.target.value })}
                  placeholder={`B: ${t.placeholderId}`}
                  className="w-full bg-slate-900/70 border border-violet-800 focus:border-violet-500 outline-none rounded-lg pl-10 pr-4 py-2 font-mono text-sm"
                />
              </div>
              <button onClick={() => slotB.query.trim() && analyzeSlotB(slotB.query.trim())} disabled={slotB.loading || !slotB.query.trim()} className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 font-medium text-white text-sm flex items-center gap-1.5">
                {slotB.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} B
              </button>
            </div>
          )}
        </section>

        {/* Coloring controls */}
        {(slotA.result || slotB.result) && (
          <div className="flex items-center gap-2 mb-4 text-xs">
            <span className="text-slate-400">{t.coloring}</span>
            {(["plddt", "spectrum", "alphamissense"] as ColorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setColorMode(m)}
                disabled={m === "alphamissense" && !slotA.result?.alphaMissense && !slotB.result?.alphaMissense}
                className={`px-2.5 py-1 rounded-md border ${colorMode === m ? "bg-cyan-500/20 border-cyan-500 text-cyan-200" : "bg-slate-800/50 border-slate-700 text-slate-300"} disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {m === "plddt" ? t.colorPlddt : m === "spectrum" ? t.colorSpectrum : t.colorAm}
              </button>
            ))}
          </div>
        )}

        {/* Empty / loading */}
        {!slotA.result && !slotA.loading && !slotA.error && (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
            <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t.empty}</p>
          </div>
        )}
        {slotA.loading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{t.loadingStruct}</p>
          </div>
        )}
        {slotA.error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="font-medium text-red-200">{t.failed}</p>
              <p className="text-sm text-red-300/80">{slotA.error}</p>
            </div>
          </div>
        )}

        {/* Single or compare */}
        {slotA.result && (
          <div className={`grid gap-6 ${compareOpen && slotB.result ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
            <ProteinPanel slot={slotA} t={t} colorMode={colorMode} />
            {compareOpen && slotB.result && <ProteinPanel slot={slotB} t={t} colorMode={colorMode} compareTone />}
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
          Built for Genspark Hackathon · AlphaFold DB · RCSB PDB · UniProt · ESMFold · AlphaMissense · Gemini 2.5
        </footer>
      </div>
    </main>
  );
}

function ProteinPanel({ slot, t, colorMode, compareTone }: { slot: Slot; t: typeof TXT["en"]; colorMode: ColorMode; compareTone?: boolean }) {
  const r = slot.result!;
  return (
    <div className={`space-y-4 ${compareTone ? "border-l-2 border-violet-700/40 pl-4" : ""}`}>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              {compareTone && <GitCompare className="w-3.5 h-3.5 text-violet-400" />}
              {r.info.proteinName || r.info.id}
            </h3>
            <p className="text-xs text-slate-400">
              {r.info.source.toUpperCase()} • <span className="font-mono">{r.info.id}</span>
              {r.info.organism ? ` • ${r.info.organism}` : ""}
              {r.info.length ? ` • ${r.info.length} aa` : ""}
              {r.amAvailable && (
                <span className="ml-2 text-emerald-300/80">• {t.amTitle} {t.amAvail}</span>
              )}
            </p>
          </div>
          {r.plddt && (
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t.meanPlddt}</div>
              <div className="text-lg font-bold text-cyan-300">{r.plddt.mean.toFixed(1)}</div>
            </div>
          )}
        </div>
        <div className="h-[380px] bg-black">
          <MolViewer pdbText={r.pdbText} colorMode={colorMode} amPerResidue={r.alphaMissense} />
        </div>
      </div>

      {r.plddt && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h4 className="font-semibold text-sm">{t.perResidue}</h4>
            <div className="flex gap-3 text-[10px]">
              <Legend color="#1e40af" label={t.legendPlddt[0]} />
              <Legend color="#0ea5e9" label={t.legendPlddt[1]} />
              <Legend color="#eab308" label={t.legendPlddt[2]} />
              <Legend color="#f97316" label={t.legendPlddt[3]} />
            </div>
          </div>
          <PlddtChart stats={r.plddt} />
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h4 className="font-semibold text-sm">{t.aiReport}</h4>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-300/80">
            <ShieldCheck className="w-3 h-3" />
            {r.facts ? t.grounded : t.notGrounded}
          </span>
        </div>
        {slot.reportLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> {t.loadingReport}
          </div>
        )}
        {slot.report && (
          <div
            className="prose prose-invert prose-sm max-w-none prose-headings:text-cyan-300 prose-headings:font-semibold prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-2 prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-slate-100 prose-li:text-slate-300"
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(slot.report) }}
          />
        )}
        {r.facts && (
          <details className="mt-4 text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-300">{t.factsBlock} ({r.facts.features.length})</summary>
            <ul className="mt-2 space-y-1 font-mono text-[11px]">
              {r.facts.features.map((f, i) => (
                <li key={i}>
                  <span className="text-cyan-400">{f.type}</span> {f.start}-{f.end}
                  {f.description ? <span className="text-slate-400"> — {f.description}</span> : null}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function simpleMarkdown(md: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${inline(escape(line.replace(/^##\s+/, "")))}</h2>`;
    } else if (/^#\s+/.test(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${inline(escape(line.replace(/^#\s+/, "")))}</h2>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(escape(line.replace(/^[-*]\s+/, "")))}</li>`;
    } else if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${inline(escape(line))}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
  function inline(s: string) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1 rounded text-xs">$1</code>');
  }
}
