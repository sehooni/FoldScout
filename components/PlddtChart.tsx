"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import type { PlddtStats } from "@/lib/alphafold";

interface Props {
  stats: PlddtStats;
}

export default function PlddtChart({ stats }: Props) {
  const data = stats.perResidue.map((v, i) => ({ residue: i + 1, plddt: v }));

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          {/* Confidence bands */}
          <ReferenceArea y1={90} y2={100} fill="#1e40af" fillOpacity={0.08} />
          <ReferenceArea y1={70} y2={90} fill="#0ea5e9" fillOpacity={0.08} />
          <ReferenceArea y1={50} y2={70} fill="#eab308" fillOpacity={0.08} />
          <ReferenceArea y1={0} y2={50} fill="#f97316" fillOpacity={0.08} />
          <XAxis dataKey="residue" stroke="#9ca3af" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} stroke="#9ca3af" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#e5e7eb" }}
            formatter={(v: number) => [v.toFixed(1), "pLDDT"]}
            labelFormatter={(l) => `Residue ${l}`}
          />
          <Line type="monotone" dataKey="plddt" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
