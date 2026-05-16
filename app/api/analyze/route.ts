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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AnalyzeResponse {
  info: StructureInfo;
  plddt: PlddtStats | null;
  regions: ConfidenceRegion[];
  pdbText: string;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const cleaned = query.trim().toUpperCase();

    let info: StructureInfo | null = null;

    // Heuristic: 4 chars = PDB ID, else try UniProt (AlphaFold)
    if (/^[0-9][A-Z0-9]{3}$/.test(cleaned)) {
      info = await fetchPdb(cleaned);
    } else {
      info = await fetchAlphaFold(cleaned);
      if (!info && cleaned.length === 4) {
        info = await fetchPdb(cleaned);
      }
    }

    if (!info) {
      return NextResponse.json(
        { error: `Structure not found for "${query}". Try a UniProt ID (e.g., P04637) or PDB ID (e.g., 1TUP).` },
        { status: 404 }
      );
    }

    // Fetch the PDB file
    const pdbRes = await fetch(info.pdbUrl);
    if (!pdbRes.ok) {
      return NextResponse.json({ error: "Failed to download structure file" }, { status: 502 });
    }
    const pdbText = await pdbRes.text();

    const plddt = parsePlddtFromPdb(pdbText);
    const regions = plddt ? getConfidenceRegions(plddt) : [];

    return NextResponse.json({ info, plddt, regions, pdbText } as AnalyzeResponse);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
