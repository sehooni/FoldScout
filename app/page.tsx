"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search, Loader2, Sparkles, Database, AlertCircle, ExternalLink } from "lucide-react";
import PlddtChart from "@/components/PlddtChart";
import type { AnalyzeResponse } from "./api/analyze/route";

const MolViewer = dynamic(() => import("@/components/MolViewer"), { ssr: false });

const PRESETS = [
  { id: "P04637", label: "TP53 (Tumor Suppressor)", emoji: "🔴", desc: "AlphaFold • Human • Cancer-related" },
  { id: "P42212", label: "GFP (Green Fluorescent Protein)", emoji: "🟢", desc: "AlphaFold • Jellyfish • Iconic" },
  { id: "P0DTC2", label: "SARS-CoV-2 Spike", emoji: "🦠", desc: "AlphaFold • Virus • Pandemic relevance" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalyze(q: string) {
    setError(null);
    setResult(null);
    setReport(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze");
      setResult(data);
      // Kick off report generation in parallel
      generateReport(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(data: AnalyzeResponse) {
    setReportLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ info: data.info, plddt: data.plddt, regions: data.regions }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to generate report");
      setReport(j.report);
    } catch (e: unknown) {
      setReport(`*Failed to generate AI report: ${e instanceof Error ? e.message : "unknown"}*`);
    } finally {
      setReportLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    runAnalyze(query.trim());
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/70 backdrop-blur sticky top-0 z-10 bg-[#070b14]/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg">
              🧬
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FoldScout</h1>
              <p className="text-xs text-slate-400">AI-powered structural review for the AlphaFold era</p>
            </div>
          </div>
          <a
            href="https://github.com/sehooni"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-slate-200 transition"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero / Search */}
        <section className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent">
            From structure to insight in 30 seconds.
          </h2>
          <p className="text-slate-400 mb-6 max-w-2xl">
            Paste a <span className="font-mono text-cyan-300">UniProt ID</span> or{" "}
            <span className="font-mono text-cyan-300">PDB ID</span>. We fetch the structure, map confidence, and
            generate an expert-level report with Gemini.
          </p>

          <form onSubmit={onSubmit} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., P04637  or  1TUP"
                className="w-full bg-slate-900/70 border border-slate-700 focus:border-cyan-500 outline-none rounded-lg pl-10 pr-4 py-3 font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-900 transition flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center mr-2">Try:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setQuery(p.id);
                  runAnalyze(p.id);
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-xs flex items-center gap-1.5 disabled:opacity-50 transition"
              >
                <span>{p.emoji}</span>
                <span className="font-medium">{p.label}</span>
                <span className="text-slate-500 hidden sm:inline">• {p.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="font-medium text-red-200">Analysis failed</p>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
            <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No structure loaded. Pick a preset above or enter an ID.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-400">Fetching structure & parsing confidence...</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left: viewer + chart */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">
                      {result.info.proteinName || result.info.id}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {result.info.source.toUpperCase()} •{" "}
                      <span className="font-mono">{result.info.id}</span>
                      {result.info.organism ? ` • ${result.info.organism}` : ""}
                      {result.info.length ? ` • ${result.info.length} aa` : ""}
                    </p>
                  </div>
                  {result.plddt && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Mean pLDDT</div>
                      <div className="text-lg font-bold text-cyan-300">{result.plddt.mean.toFixed(1)}</div>
                    </div>
                  )}
                </div>
                <div className="h-[420px] bg-black">
                  <MolViewer pdbText={result.pdbText} colorByPlddt={!!result.plddt} />
                </div>
              </div>

              {result.plddt && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Per-residue confidence (pLDDT)</h3>
                    <div className="flex gap-3 text-xs">
                      <Legend color="#1e40af" label="Very high ≥90" />
                      <Legend color="#0ea5e9" label="High 70-90" />
                      <Legend color="#eab308" label="Low 50-70" />
                      <Legend color="#f97316" label="Very low <50" />
                    </div>
                  </div>
                  <PlddtChart stats={result.plddt} />
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <Stat label="Very high" value={result.plddt.bins.veryHigh} color="text-blue-400" />
                    <Stat label="High" value={result.plddt.bins.high} color="text-sky-400" />
                    <Stat label="Low" value={result.plddt.bins.low} color="text-yellow-400" />
                    <Stat label="Very low" value={result.plddt.bins.veryLow} color="text-orange-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Right: AI report */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-sm">AI Structural Report</h3>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500">Gemini</span>
                </div>
                {reportLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating expert review...
                  </div>
                )}
                {report && (
                  <div
                    className="prose prose-invert prose-sm max-w-none prose-headings:text-cyan-300 prose-headings:font-semibold prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-slate-100"
                    dangerouslySetInnerHTML={{ __html: simpleMarkdown(report) }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
          Built for Genspark Hackathon · Powered by AlphaFold DB, RCSB PDB, Mol*, and Gemini
        </footer>
      </div>
    </main>
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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Minimal markdown -> HTML (headings, bold, italic, lists, paragraphs)
function simpleMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
