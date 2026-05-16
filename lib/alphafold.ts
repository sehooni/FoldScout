// AlphaFold DB & RCSB PDB API helpers

export interface StructureInfo {
  source: "alphafold" | "pdb";
  id: string;
  uniprotId?: string;
  pdbUrl: string;       // .pdb or .cif download URL
  cifUrl?: string;
  paeUrl?: string;
  organism?: string;
  proteinName?: string;
  sequence?: string;
  length?: number;
}

export interface PlddtStats {
  mean: number;
  perResidue: number[];      // 0..100
  bins: { veryHigh: number; high: number; low: number; veryLow: number }; // counts
}

// Try AlphaFold DB by UniProt ID
export async function fetchAlphaFold(uniprotId: string): Promise<StructureInfo | null> {
  const url = `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId.toUpperCase()}`;
  console.log("[fetchAlphaFold] GET", url);
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "FoldScout/0.1 (research)",
        "Accept": "application/json",
      },
    });
  } catch (e) {
    console.error("[fetchAlphaFold] fetch threw:", e);
    return null;
  }
  console.log("[fetchAlphaFold] status", res.status);
  if (!res.ok) return null;
  const data = await res.json();
  console.log("[fetchAlphaFold] data length", Array.isArray(data) ? data.length : "not array");
  if (!Array.isArray(data) || data.length === 0) return null;
  const entry = data[0];
  return {
    source: "alphafold",
    id: entry.entryId,
    uniprotId: entry.uniprotAccession,
    pdbUrl: entry.pdbUrl,
    cifUrl: entry.cifUrl,
    paeUrl: entry.paeImageUrl,
    organism: entry.organismScientificName,
    proteinName: entry.uniprotDescription,
    sequence: entry.uniprotSequence,
    length: entry.uniprotEnd,
  };
}

// Fetch PDB structure (experimental) by 4-letter PDB ID
export async function fetchPdb(pdbId: string): Promise<StructureInfo | null> {
  const id = pdbId.toLowerCase();
  const pdbUrl = `https://files.rcsb.org/download/${id}.pdb`;
  const head = await fetch(pdbUrl, { method: "HEAD" });
  if (!head.ok) return null;

  // Get metadata
  let proteinName: string | undefined;
  let organism: string | undefined;
  let length: number | undefined;
  try {
    const metaRes = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${id.toUpperCase()}`);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      proteinName = meta?.struct?.title;
    }
  } catch {}

  return {
    source: "pdb",
    id: id.toUpperCase(),
    pdbUrl,
    cifUrl: `https://files.rcsb.org/download/${id}.cif`,
    proteinName,
    organism,
    length,
  };
}

// Parse pLDDT from a PDB file (B-factor column for AlphaFold structures)
export function parsePlddtFromPdb(pdbText: string): PlddtStats | null {
  const lines = pdbText.split("\n");
  const perResidueMap = new Map<number, number>(); // resSeq -> B-factor (CA atom)
  for (const line of lines) {
    if (!line.startsWith("ATOM")) continue;
    const atomName = line.slice(12, 16).trim();
    if (atomName !== "CA") continue;
    const resSeq = parseInt(line.slice(22, 26).trim(), 10);
    const bfactor = parseFloat(line.slice(60, 66).trim());
    if (!Number.isNaN(resSeq) && !Number.isNaN(bfactor)) {
      perResidueMap.set(resSeq, bfactor);
    }
  }
  if (perResidueMap.size === 0) return null;

  const sorted = Array.from(perResidueMap.entries()).sort((a, b) => a[0] - b[0]);
  const perResidue = sorted.map(([, v]) => v);
  const sum = perResidue.reduce((a, b) => a + b, 0);
  const mean = sum / perResidue.length;

  const bins = { veryHigh: 0, high: 0, low: 0, veryLow: 0 };
  for (const v of perResidue) {
    if (v >= 90) bins.veryHigh++;
    else if (v >= 70) bins.high++;
    else if (v >= 50) bins.low++;
    else bins.veryLow++;
  }
  return { mean, perResidue, bins };
}

// Identify confidence regions (consecutive low-confidence stretches)
export interface ConfidenceRegion {
  start: number;
  end: number;
  meanPlddt: number;
  category: "very-high" | "high" | "low" | "very-low";
}

export function getConfidenceRegions(stats: PlddtStats, minLen = 5): ConfidenceRegion[] {
  const regions: ConfidenceRegion[] = [];
  const cat = (v: number): ConfidenceRegion["category"] => {
    if (v >= 90) return "very-high";
    if (v >= 70) return "high";
    if (v >= 50) return "low";
    return "very-low";
  };
  let i = 0;
  while (i < stats.perResidue.length) {
    const c = cat(stats.perResidue[i]);
    let j = i;
    let sum = 0;
    while (j < stats.perResidue.length && cat(stats.perResidue[j]) === c) {
      sum += stats.perResidue[j];
      j++;
    }
    const len = j - i;
    if (len >= minLen) {
      regions.push({
        start: i + 1,
        end: j,
        meanPlddt: sum / len,
        category: c,
      });
    }
    i = j;
  }
  return regions;
}
