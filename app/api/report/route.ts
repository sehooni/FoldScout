import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { StructureInfo, PlddtStats, ConfidenceRegion } from "@/lib/alphafold";
import { factsAsPromptBlock, type UniProtFacts } from "@/lib/uniprot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Lang = "en" | "ko";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

    const {
      info,
      plddt,
      regions,
      facts,
      lang = "en",
    }: {
      info: StructureInfo;
      plddt: PlddtStats | null;
      regions: ConfidenceRegion[];
      facts: UniProtFacts | null;
      lang?: Lang;
    } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2,         // low — discourage embellishment
        topP: 0.85,
        maxOutputTokens: 3000,
      },
    });

    const regionSummary = regions
      .slice(0, 12)
      .map(
        (r) =>
          `  - residues ${r.start}-${r.end} (${r.end - r.start + 1} aa): ${r.category} confidence (mean pLDDT ${r.meanPlddt.toFixed(1)})`
      )
      .join("\n");

    const factsBlock = facts ? factsAsPromptBlock(facts) : "UNIPROT GROUND TRUTH: (not available — this structure has no UniProt mapping or is a user-supplied sequence)";

    const isKo = lang === "ko";
    const langInstruction = isKo
      ? "Write the entire report in natural, expert Korean (한국어). Use precise structural biology terminology. Keep section headings exactly as given below (English emoji + Korean text)."
      : "Write the entire report in clear, expert English.";

    const sectionHeads = isKo
      ? {
          overview: "## 🧬 개요 (Overview)",
          confidence: "## 📊 구조 신뢰도 (Structural Confidence)",
          functional: "## 🎯 기능적 해석 (Functional Interpretation)",
          caveats: "## ⚠️ 주의사항 (Caveats)",
          nextSteps: "## 🔬 권장 후속 분석 (Suggested Next Steps)",
        }
      : {
          overview: "## 🧬 Overview",
          confidence: "## 📊 Structural Confidence",
          functional: "## 🎯 Functional Interpretation",
          caveats: "## ⚠️ Caveats",
          nextSteps: "## 🔬 Suggested Next Steps",
        };

    const prompt = `You are a careful structural biology research assistant. Generate a concise, expert-level structural report grounded ONLY in the data provided below.

### STRICT ANTI-HALLUCINATION RULES
1. Do NOT invent residue numbers, domain boundaries, or motifs that are not present in the UNIPROT GROUND TRUTH block or the CONFIDENCE METRICS block.
2. When referring to a domain or site, ALWAYS use the residue range exactly as given in UNIPROT GROUND TRUTH.
3. If UniProt data is unavailable, you MUST say "UniProt annotations are not available for this entry" in the Functional Interpretation section, and describe ONLY what can be inferred from the per-residue pLDDT pattern.
4. Do NOT cite specific publications, PDB IDs, or numeric experimental values unless they appear verbatim in the provided data.
5. If unsure, write "this is uncertain" rather than guessing.
6. Be concise (under 350 words total).

### STRUCTURE INFO
- Source: ${info.source.toUpperCase()}
- ID: ${info.id}
${info.uniprotId ? `- UniProt: ${info.uniprotId}` : ""}
${info.proteinName ? `- Title: ${info.proteinName}` : ""}
${info.organism ? `- Organism: ${info.organism}` : ""}
${info.length ? `- Length: ${info.length} aa` : ""}

### CONFIDENCE METRICS${plddt ? `
- Mean pLDDT: ${plddt.mean.toFixed(1)}
- Very high (≥90): ${plddt.bins.veryHigh} residues
- High (70-90): ${plddt.bins.high} residues
- Low (50-70): ${plddt.bins.low} residues
- Very low (<50): ${plddt.bins.veryLow} residues` : "\n- This is an experimental PDB structure (no pLDDT available)."}

### NOTABLE CONFIDENCE REGIONS${regions.length > 0 ? `\n${regionSummary}` : "\n  (no regions extracted)"}

### ${factsBlock}

### OUTPUT FORMAT (markdown, use these headings VERBATIM)

${sectionHeads.overview}
2-3 sentences from UniProt FUNCTION (paraphrased). If no UniProt data, state that and describe based on structural data only.

${sectionHeads.confidence}
Quantitatively summarize reliability. Identify which residue ranges to trust and which to treat with caution. Tie low-confidence stretches to "Disordered" or "Compositional bias" features from UniProt if they overlap.

${sectionHeads.functional}
Map the listed UniProt features (Domain / Binding site / Active site / Motif / DNA binding / etc.) onto the structural confidence. Example phrasing: "The DNA-binding region (residues X-Y, from UniProt) overlaps very high confidence residues (mean pLDDT Z)." Do NOT introduce features not in the ground truth.

${sectionHeads.caveats}
Highlight where the model may be unreliable (low pLDDT stretches, disordered termini, missing domains in static predictions, etc.).

${sectionHeads.nextSteps}
2-3 concrete next analyses (e.g., MD on a specific residue range, docking against a listed binding site, mutagenesis at a listed Active site). Each step must reference a residue range already given.

${langInstruction}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const finishReason = result.response.candidates?.[0]?.finishReason;
    console.log("[report] lang=", lang, "len=", text.length, "finishReason=", finishReason);

    return NextResponse.json({ report: text, finishReason });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
