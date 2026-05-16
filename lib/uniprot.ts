// UniProt REST API — grounding facts (anti-hallucination)

export interface UniProtFeature {
  type: string;          // "Domain", "Region", "Binding site", "Active site", "DNA binding", "Motif"
  start: number;
  end: number;
  description?: string;
}

export interface UniProtFacts {
  accession: string;
  proteinName?: string;
  shortNames?: string[];
  geneName?: string;
  organism?: string;
  length?: number;
  functionText?: string;             // 1-2 sentence functional summary from CC FUNCTION
  features: UniProtFeature[];        // structured features
  reviewed: boolean;
}

const FEATURE_KEEP = new Set([
  "Chain",
  "Domain",
  "Region",
  "Motif",
  "DNA binding",
  "Binding site",
  "Active site",
  "Site",
  "Transmembrane",
  "Topological domain",
  "Signal",
  "Propeptide",
  "Compositional bias",
  "Zinc finger",
]);

export async function fetchUniProtFacts(accession: string): Promise<UniProtFacts | null> {
  const url = `https://rest.uniprot.org/uniprotkb/${accession.toUpperCase()}.json`;
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "FoldScout/0.1 (research)",
        Accept: "application/json",
      },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const d: any = await res.json();

  const features: UniProtFeature[] = [];
  for (const f of (d.features ?? []) as any[]) {
    if (!FEATURE_KEEP.has(f.type)) continue;
    const s = f.location?.start?.value;
    const e = f.location?.end?.value;
    if (typeof s !== "number" || typeof e !== "number") continue;
    features.push({
      type: f.type,
      start: s,
      end: e,
      description: f.description || undefined,
    });
  }

  // Collapse some noisy categories: keep top 12 most informative regions
  const compact = compactFeatures(features);

  // function comment
  let functionText: string | undefined;
  for (const c of (d.comments ?? []) as any[]) {
    if (c.commentType === "FUNCTION" && Array.isArray(c.texts) && c.texts.length > 0) {
      functionText = c.texts.map((t: any) => t.value).join(" ");
      break;
    }
  }

  const proteinName =
    d.proteinDescription?.recommendedName?.fullName?.value ??
    d.proteinDescription?.submissionNames?.[0]?.fullName?.value;
  const shortNames = (d.proteinDescription?.recommendedName?.shortNames ?? []).map(
    (n: any) => n.value
  );
  const geneName = d.genes?.[0]?.geneName?.value;
  const organism = d.organism?.scientificName;
  const length = d.sequence?.length;

  return {
    accession: d.primaryAccession ?? accession.toUpperCase(),
    proteinName,
    shortNames,
    geneName,
    organism,
    length,
    functionText: functionText?.slice(0, 600),
    features: compact,
    reviewed: d.entryType === "UniProtKB reviewed (Swiss-Prot)",
  };
}

function compactFeatures(features: UniProtFeature[]): UniProtFeature[] {
  // Priority: keep all DNA binding / Active site / Binding site / Domain / Motif / Zinc finger
  // Limit Region/Compositional bias to those with informative descriptions
  const priority = (f: UniProtFeature) => {
    if (["Active site", "Binding site", "DNA binding", "Domain", "Motif", "Zinc finger", "Transmembrane", "Signal"].includes(f.type))
      return 0;
    if (f.type === "Region" && f.description) {
      const desc = f.description.toLowerCase();
      // Skip super-generic "Interaction with X" — keep functional ones
      if (desc.startsWith("interaction with")) return 3;
      if (desc.includes("disordered") || desc.includes("oligomer") || desc.includes("transactiv") || desc.includes("activation") || desc.includes("repression") || desc.includes("basic") || desc.includes("kinase") || desc.includes("nuclear") || desc.includes("membrane"))
        return 1;
      return 2;
    }
    if (f.type === "Compositional bias") return 2;
    return 3;
  };
  const sorted = [...features].sort((a, b) => priority(a) - priority(b));
  return sorted.slice(0, 14);
}

export function factsAsPromptBlock(facts: UniProtFacts): string {
  const lines: string[] = [];
  lines.push(`UNIPROT GROUND TRUTH (do not contradict; do not invent residue numbers not listed here)`);
  lines.push(`- Accession: ${facts.accession}${facts.reviewed ? " (reviewed / Swiss-Prot)" : " (unreviewed / TrEMBL)"}`);
  if (facts.proteinName) lines.push(`- Protein: ${facts.proteinName}`);
  if (facts.geneName) lines.push(`- Gene: ${facts.geneName}`);
  if (facts.organism) lines.push(`- Organism: ${facts.organism}`);
  if (facts.length) lines.push(`- Length: ${facts.length} aa`);
  if (facts.functionText) lines.push(`- UniProt FUNCTION: ${facts.functionText}`);
  if (facts.features.length > 0) {
    lines.push(`- Annotated features (from UniProt, authoritative):`);
    for (const f of facts.features) {
      const desc = f.description ? ` — ${f.description}` : "";
      lines.push(`    • ${f.type} ${f.start}-${f.end}${desc}`);
    }
  } else {
    lines.push(`- No structured features annotated in UniProt.`);
  }
  return lines.join("\n");
}
