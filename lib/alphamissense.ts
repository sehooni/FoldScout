// AlphaMissense per-residue mean pathogenicity from AlphaFold DB CSV
// CSV columns: protein_variant,am_pathogenicity,am_class
// We aggregate per residue (mean over the 19 substitutions).

export interface AmResidue {
  residue: number;
  meanPathogenicity: number; // 0..1
  topClass: "likely_pathogenic" | "likely_benign" | "ambiguous";
}

export async function fetchAlphaMissense(amUrl: string): Promise<AmResidue[] | null> {
  let res: Response;
  try {
    res = await fetch(amUrl, {
      cache: "no-store",
      headers: { "User-Agent": "FoldScout/0.1 (research)" },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  const lines = text.split("\n");
  if (lines.length < 2) return null;

  const perRes = new Map<number, { sum: number; count: number; pathCount: number; benignCount: number }>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 3) continue;
    const variant = cols[0]; // e.g., "M1A"
    const score = parseFloat(cols[1]);
    const cls = cols[2];
    const m = variant.match(/^[A-Z](\d+)[A-Z]$/);
    if (!m) continue;
    const resNum = parseInt(m[1], 10);
    if (Number.isNaN(score)) continue;
    const entry = perRes.get(resNum) ?? { sum: 0, count: 0, pathCount: 0, benignCount: 0 };
    entry.sum += score;
    entry.count++;
    if (cls === "likely_pathogenic") entry.pathCount++;
    else if (cls === "likely_benign") entry.benignCount++;
    perRes.set(resNum, entry);
  }

  const out: AmResidue[] = [];
  for (const [residue, e] of perRes.entries()) {
    const mean = e.sum / Math.max(1, e.count);
    let topClass: AmResidue["topClass"] = "ambiguous";
    if (e.pathCount > e.benignCount && e.pathCount > e.count - e.pathCount - e.benignCount) topClass = "likely_pathogenic";
    else if (e.benignCount > e.pathCount && e.benignCount > e.count - e.pathCount - e.benignCount) topClass = "likely_benign";
    out.push({ residue, meanPathogenicity: mean, topClass });
  }
  return out.sort((a, b) => a.residue - b.residue);
}
