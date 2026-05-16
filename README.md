# 🧬 FoldScout

**AI-powered structural review for the AlphaFold era.**

From PDB ID or UniProt ID to expert-level structural insight in 30 seconds.

> Submitted to **Genspark Hackathon 2026** · Category: **Agent & Automation (Research Agent)**

---

## ✨ What it does

1. Paste a **UniProt ID** (e.g. `P04637`) or **PDB ID** (e.g. `1TUP`)
2. FoldScout fetches the structure from **AlphaFold DB** or **RCSB PDB**
3. It parses **per-residue pLDDT**, identifies confidence regions, and renders the structure in 3D (pLDDT-colored)
4. **Gemini** generates an expert-level structural report: overview, confidence assessment, functional hypotheses, caveats, and suggested next steps

The whole flow is < 30 seconds.

## 🎯 Why this matters

After AlphaFold, the bottleneck shifted from *predicting* structures to *interpreting* them. Every structural biologist still opens PyMOL, manually colors by B-factor, scrolls through pLDDT plots, and writes their own quick assessment. FoldScout automates that first-pass review so researchers can focus on the science.

## 🚀 Quickstart

```bash
cd foldscout
cp .env.local.example .env.local       # add your GEMINI_API_KEY
npm install
PORT=3737 npm run dev
```

Open http://localhost:3737

### Demo presets

| Preset | UniProt | Why |
|---|---|---|
| 🔴 TP53 | `P04637` | Cancer-related, mixed disorder/structure |
| 🟢 GFP | `P42212` | Iconic, visually beautiful β-barrel |
| 🦠 SARS-CoV-2 Spike | `P0DTC2` | Pandemic relevance, large multidomain |

## 🛠 Stack

- **Next.js 16** (App Router, Turbopack)
- **3Dmol.js** for fast WebGL structure rendering with pLDDT coloring
- **Recharts** for per-residue confidence plots
- **AlphaFold DB API** + **RCSB PDB API** for structures
- **Google Gemini** (`gemini-2.0-flash-exp`) for the structural report

## 📁 Project layout

```
foldscout/
├── app/
│   ├── page.tsx              # Main UI
│   ├── api/analyze/route.ts  # Fetches structure + parses pLDDT
│   └── api/report/route.ts   # Calls Gemini for the AI report
├── components/
│   ├── MolViewer.tsx         # 3Dmol.js wrapper
│   └── PlddtChart.tsx        # Recharts plot
└── lib/
    └── alphafold.ts          # Parsing helpers + API calls
```

## 🧪 Built by

**Sehoon Park** ([@sehooni](https://github.com/sehooni)) · Post-Master Researcher @ KBSI · Structural biology + agentic AI

Built in 90 minutes for Genspark Hackathon 2026.
