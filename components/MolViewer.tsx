"use client";

import { useEffect, useRef } from "react";

interface Props {
  pdbText: string;
  colorByPlddt: boolean;
}

// Use 3Dmol.js via CDN — much lighter than Mol* and renders fast
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

export default function MolViewer({ pdbText, colorByPlddt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await load3Dmol();
      if (cancelled || !containerRef.current || !window.$3Dmol) return;

      // Clean up previous viewer
      containerRef.current.innerHTML = "";

      const viewer = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "black",
        antialias: true,
      });
      viewerRef.current = viewer;

      viewer.addModel(pdbText, "pdb");

      if (colorByPlddt) {
        // pLDDT-style coloring based on B-factor
        viewer.setStyle(
          {},
          {
            cartoon: {
              colorfunc: (atom: any) => {
                const b = atom.b ?? 50;
                if (b >= 90) return "#1e40af"; // very high - blue
                if (b >= 70) return "#0ea5e9"; // high - sky
                if (b >= 50) return "#eab308"; // low - yellow
                return "#f97316"; // very low - orange
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
  }, [pdbText, colorByPlddt]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" style={{ position: "relative" }} />
    </div>
  );
}
