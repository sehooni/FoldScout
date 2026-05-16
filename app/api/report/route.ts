import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { StructureInfo, PlddtStats, ConfidenceRegion } from "@/lib/alphafold";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    const {
      info,
      plddt,
      regions,
    }: {
      info: StructureInfo;
      plddt: PlddtStats | null;
      regions: ConfidenceRegion[];
    } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const regionSummary = regions
      .slice(0, 12)
      .map(
        (r) =>
          `  - residues ${r.start}-${r.end} (${r.end - r.start + 1} aa): ${r.category} confidence (mean pLDDT ${r.meanPlddt.toFixed(1)})`
      )
      .join("\n");

    const prompt = `You are a structural biology research assistant. Generate a concise, expert-level structural report for the following protein.

PROTEIN INFO
- Source: ${info.source.toUpperCase()}
- ID: ${info.id}
${info.uniprotId ? `- UniProt: ${info.uniprotId}` : ""}
${info.proteinName ? `- Name/Title: ${info.proteinName}` : ""}
${info.organism ? `- Organism: ${info.organism}` : ""}
${info.length ? `- Length: ${info.length} aa` : ""}

CONFIDENCE METRICS${plddt ? `
- Mean pLDDT: ${plddt.mean.toFixed(1)}
- Very high (≥90): ${plddt.bins.veryHigh} residues
- High (70-90): ${plddt.bins.high} residues
- Low (50-70): ${plddt.bins.low} residues
- Very low (<50): ${plddt.bins.veryLow} residues` : "\n- This is an experimental PDB structure (no pLDDT)."}

NOTABLE REGIONS${regions.length > 0 ? `\n${regionSummary}` : "\n  (none)"}

Write the report in clear English with these sections (use markdown headings):

## 🧬 Overview
2-3 sentences: what is this protein, what is it known for?

## 📊 Structural Confidence
Assess the overall reliability (for AlphaFold) or quality (for PDB). Highlight which regions to trust.

## 🎯 Functional Hypotheses
Based on the protein family/name, suggest likely binding sites, active sites, or interaction interfaces. Be specific about residue ranges where possible.

## ⚠️ Caveats
What should a researcher be careful about when using this structure?

## 🔬 Suggested Next Steps
2-3 concrete experiments or analyses (e.g., MD simulation, docking targets, mutagenesis candidates).

Keep the total under 400 words. Use a confident, expert tone. Do not invent specific numbers not given.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ report: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
