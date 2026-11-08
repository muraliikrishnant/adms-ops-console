"use client";

import { useEffect, useState } from "react";
import OneLineDiagram from "@/components/OneLineDiagram";
import { Button, Card, Stat, VoltageBadge } from "@/components/ui";
import type { DpfResult, NetworkModel } from "@/lib/types";

export default function DpfPage() {
  const [network, setNetwork] = useState<NetworkModel | null>(null);
  const [result, setResult] = useState<DpfResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/network")
      .then((r) => r.json())
      .then(setNetwork);
  }, []);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/dpf", { method: "POST" });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Distribution Power Flow (DPF)</h1>
        <Button onClick={run} disabled={loading || !network}>
          {loading ? "Running…" : "Run DPF"}
        </Button>
      </div>
      <p className="text-sm text-slate-400 max-w-3xl">
        Simplified radial power flow (LinDistFlow / Baran-Wu linearized branch model) on the current feeder:
        cumulative downstream P/Q is summed per branch, then bus voltage magnitude is propagated from each
        energized source. Flags any bus outside the 0.95–1.05 pu band.
      </p>

      {network && (
        <Card title="One-line diagram">
          <OneLineDiagram network={network} dpf={result ?? undefined} />
        </Card>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <Stat label="Min Voltage" value={`${result.minVpu.toFixed(4)} pu`} tone={result.minVpu < 0.95 ? "bad" : "good"} />
            </Card>
            <Card>
              <Stat label="Max Voltage" value={`${result.maxVpu.toFixed(4)} pu`} tone={result.maxVpu > 1.05 ? "bad" : "good"} />
            </Card>
            <Card>
              <Stat label="Total Losses" value={`${result.totalLossP.toFixed(5)} pu`} />
            </Card>
            <Card>
              <Stat label="Violations" value={String(result.violations.length)} tone={result.violations.length ? "bad" : "good"} />
            </Card>
          </div>

          <Card title="Bus voltages">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th>Node</th>
                  <th>Voltage</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {result.nodeResults.map((n) => (
                  <tr key={n.nodeId} className="border-t border-slate-800">
                    <td className="py-1">{n.nodeId}</td>
                    <td>
                      <VoltageBadge vpu={n.vpu} energized={n.status === "energized"} />
                    </td>
                    <td>{n.sourceId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
