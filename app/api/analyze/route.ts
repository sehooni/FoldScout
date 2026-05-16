import { NextRequest, NextResponse } from "next/server";
import {
  fetchAlphaFold,
  fetchPdb,
  parsePlddtFromPdb,
  getConfidenceRegions,
  type StructureInfo,
  type PlddtStats,
  type ConfidenceRegion,
} from "@/lib/alphafold";
import { fetchUniProtFacts, type UniProtFacts } from "@/lib/uniprot";
import { fetchAlphaMissense, type AmResidue } from "@/lib/alphamissense";
import { predictWithESMFold } from "@/lib/esmfold";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface AnalyzeResponse {
  info: StructureInfo;
  plddt: PlddtStats | null;
  regions: ConfidenceRegion[];
  pdbText: string;
  facts: UniProtFacts | null;
  alphaMissense: AmResidue[] | null;
  amAvailable: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = (body.mode as "id" | "sequence") ?? "id";

    if (mode === "sequence") {
      return handleSequence(body.sequence as string, body.label as string | undefined);
    }

    const query = (body.query as string)?.trim();
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    const cleaned = query.toUpperCase();
    let info: StructureInfo | null = null;
    let amUrl: string | undefined;

    if (/^[0-9][A-Z0-9]{3}$/.test(cleaned)) {
      info = await fetchPdb(cleaned);
    } else {
      const af = await fetchAlphaFoldDetailed(cleaned);
      info = af.info;
      amUrl = af.amAnnotationsUrl;
      if (!info && cleaned.length === 4) info = await fetchPdb(cleaned);
    }

    if (!info) {
      return NextResponse.json(
        { error: `Structure not found for "${query}". Try a UniProt ID (e.g., P04637) or PDB ID (e.g., 1TUP).` },
        { status: 404 }
      );
    }

    const pdbRes = await fetch(info.pdbUrl, { headers: { "User-Agent": "FoldScout/0.1" } });
    if (!pdbRes.ok) return NextResponse.json({ error: "Failed to download structure" }, { status: 502 });
    const pdbText = await pdbRes.text();

    const plddt = parsePlddtFromPdb(pdbText);
    const regions = plddt ? getConfidenceRegions(plddt) : [];

    // Parallel fetch: UniProt facts + AlphaMissense
    const upAcc = info.uniprotId || (mode === "id" && !/^[0-9][A-Z0-9]{3}$/.test(cleaned) ? cleaned : null);
    const [facts, alphaMissense] = await Promise.all([
      upAcc ? fetchUniProtFacts(upAcc).catch(() => null) : Promise.resolve(null),
      amUrl ? fetchAlphaMissense(amUrl).catch(() => null) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      info,
      plddt,
      regions,
      pdbText,
      facts,
      alphaMissense,
      amAvailable: !!amUrl,
    } as AnalyzeResponse);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function fetchAlphaFoldDetailed(
  uniprotId: string
): Promise<{ info: StructureInfo | null; amAnnotationsUrl?: string }> {
  const url = `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`;
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "FoldScout/0.1 (research)", Accept: "application/json" },
    });
  } catch {
    return { info: null };
  }
  if (!res.ok) return { info: null };
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return { info: null };
  const entry = data[0];
  const info: StructureInfo = {
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
  return { info, amAnnotationsUrl: entry.amAnnotationsUrl };
}

async function handleSequence(sequence: string, label?: string) {
  if (!sequence || typeof sequence !== "string") {
    return NextResponse.json({ error: "Missing sequence" }, { status: 400 });
  }
  try {
    const pdbText = await predictWithESMFold(sequence);
    const plddt = parsePlddtFromPdb(pdbText);
    const regions = plddt ? getConfidenceRegions(plddt) : [];
    const cleaned = sequence.replace(/^>.*\n/, "").replace(/\s+/g, "").toUpperCase();
    const info: StructureInfo = {
      source: "alphafold", // pretend, for UI consistency (ESMFold also gives pLDDT)
      id: label?.trim() || "ESMFold prediction",
      proteinName: label?.trim() || "User sequence (ESMFold)",
      sequence: cleaned,
      length: cleaned.length,
      pdbUrl: "",
    };
    return NextResponse.json({
      info,
      plddt,
      regions,
      pdbText,
      facts: null,
      alphaMissense: null,
      amAvailable: false,
    } as AnalyzeResponse);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ESMFold failed" },
      { status: 502 }
    );
  }
}
