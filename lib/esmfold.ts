// ESMFold via the ESM Atlas API (no key, rate-limited)
// Accepts raw amino acid sequence; returns a PDB string with pLDDT in B-factor column.

export async function predictWithESMFold(sequence: string): Promise<string> {
  const cleaned = sequence
    .replace(/^>.*\n/, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!/^[ACDEFGHIKLMNPQRSTVWY]+$/.test(cleaned)) {
    throw new Error("Sequence contains non-standard amino acid letters.");
  }
  if (cleaned.length < 20) throw new Error("Sequence too short (min 20 aa).");
  if (cleaned.length > 400) throw new Error("Sequence too long for live ESMFold demo (max 400 aa).");

  const res = await fetch("https://api.esmatlas.com/foldSequence/v1/pdb/", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "FoldScout/0.1 (research)",
    },
    body: cleaned,
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ESMFold API error ${res.status}: ${t.slice(0, 120)}`);
  }
  const pdb = await res.text();
  if (!pdb.includes("ATOM")) throw new Error("ESMFold returned no structure.");
  return pdb;
}
