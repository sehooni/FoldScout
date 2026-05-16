"use client";

import { useEffect, useRef } from "react";

interface Props {
  pdbText: string;
  colorMode: "plddt" | "spectrum" | "alphamissense";
  amPerResidue?: { residue: number; meanPathogenicity: number }[] | null;
}

declare global {
  interface Window {
    $3Dmol?: any;
  }
}

let loaderPromise: Promise<void> | null = null;

function load3Dmol(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.$3Dmol) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/3dmol@2.4.2/build/3Dmol-min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load 3Dmol.js"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export default function MolViewer({ pdbText, colorMode, amPerResidue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await load3Dmol();
      if (cancelled || !containerRef.current || !window.$3Dmol) return;

      containerRef.current.innerHTML = "";
      const viewer = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "black",
        antialias: true,
      });
      viewerRef.current = viewer;

      viewer.addModel(pdbText, "pdb");

      if (colorMode === "alphamissense" && amPerResidue && amPerResidue.length > 0) {
        const amMap = new Map(amPerResidue.map((r) => [r.residue, r.meanPathogenicity]));
        viewer.setStyle(
          {},
          {
            cartoon: {
              colorfunc: (atom: any) => {
                const v = amMap.get(atom.resi);
                if (v == null) return "#475569";
                // 0..1 → green to red
                if (v >= 0.7) return "#dc2626";       // high pathogenicity
                if (v >= 0.55) return "#f97316";
                if (v >= 0.45) return "#eab308";
                if (v >= 0.3) return "#84cc16";
                return "#10b981";                     // benign
              },
            },
          }
        );
      } else if (colorMode === "plddt") {
        viewer.setStyle(
          {},
          {
            cartoon: {
              colorfunc: (atom: any) => {
                const b = atom.b ?? 50;
                if (b >= 90) return "#1e40af";
                if (b >= 70) return "#0ea5e9";
                if (b >= 50) return "#eab308";
                return "#f97316";
              },
            },
          }
        );
      } else {
        viewer.setStyle({}, { cartoon: { color: "spectrum" } });
      }

      viewer.zoomTo();
      viewer.render();
      viewer.spin(true);
    };
    init().catch((e) => console.error("Viewer init failed:", e));
    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try {
          viewerRef.current.spin(false);
          viewerRef.current.clear();
        } catch {}
      }
    };
  }, [pdbText, colorMode, amPerResidue]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" style={{ position: "relative" }} />
    </div>
  );
}
