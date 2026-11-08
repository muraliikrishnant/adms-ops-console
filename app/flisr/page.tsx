"use client";

import { useEffect, useState } from "react";
import OneLineDiagram from "@/components/OneLineDiagram";
import { Button, Card } from "@/components/ui";
import type { FlisrResult, NetworkModel } from "@/lib/types";

export default function FlisrPage() {
  const [network, setNetwork] = useState<NetworkModel | null>(null);
  const [faultedEdgeId, setFaultedEdgeId] = useState<string>("");
  const [result, setResult] = useState<FlisrResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/network");
    const data: NetworkModel = await res.json();
    setNetwork(data);
  }

  useEffect(() => {
    fetch("/api/network")
      .then((res) => res.json())
      .then((data: NetworkModel) => {
        setNetwork(data);
        setFaultedEdgeId((prev) => {
          if (prev) return prev;
          const firstNonTie = data.edges.find((e) => !e.switch.normallyOpen);
          return firstNonTie ? firstNonTie.id : prev;
        });
      });
  }, []);

  async function simulate() {
    setLoading(true);
    const res = await fetch("/api/flisr", { method: "POST", body: JSON.stringify({ faultedEdgeId }) });
    const data = await res.json();
    if (res.ok) setResult(data);
    setLoading(false);
  }

  async function restoreNormal() {
    setLoading(true);
    await fetch("/api/flisr", { method: "POST", body: JSON.stringify({ action: "restoreNormal" }) });
    setResult(null);
    await load();
    setLoading(false);
  }

  if (!network) return <p className="text-slate-400">Loading network…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">FLISR — Fault Location, Isolation &amp; Service Restoration</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={restoreNormal} disabled={loading}>
            Restore normal configuration
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-400 max-w-3xl">
        Pick a line segment to fault. The engine trips the nearest upstream breaker, isolates just the
        faulted segment, recloses to restore the unfaulted upstream section, and — if a normally-open tie
        exists — closes it to restore the orphaned downstream section from an alternate source.
      </p>

      <Card title="Simulate a fault">
        <div className="flex gap-2 items-center flex-wrap">
          <select
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-sm"
            value={faultedEdgeId}
            onChange={(e) => setFaultedEdgeId(e.target.value)}
          >
            {network.edges
              .filter((e) => !e.switch.normallyOpen)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} ({e.from} → {e.to})
                </option>
              ))}
          </select>
          <Button variant="danger" onClick={simulate} disabled={loading}>
            {loading ? "Simulating…" : "Simulate fault"}
          </Button>
        </div>
      </Card>

      <Card title="One-line diagram">
        <OneLineDiagram network={result?.network ?? network} dpf={result?.dpfAfter} />
      </Card>

      {result && (
        <>
          <Card title="Restoration log">
            <ol className="text-sm list-decimal pl-5 space-y-1">
              {result.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Card>

          <Card title="Switch actions">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th>Switch</th>
                  <th>Action</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.switchActions.map((a, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="py-1">{a.switchId}</td>
                    <td>{a.action}</td>
                    <td>{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Before fault">
              <p className="text-sm text-slate-400">
                Min/Max voltage: {result.dpfBefore.minVpu.toFixed(4)} / {result.dpfBefore.maxVpu.toFixed(4)} pu
              </p>
              <p className="text-sm text-slate-400">De-energized: {result.dpfBefore.deenergized.length ? result.dpfBefore.deenergized.join(", ") : "none"}</p>
            </Card>
            <Card title="After restoration">
              <p className="text-sm text-slate-400">
                Min/Max voltage: {result.dpfAfter.minVpu.toFixed(4)} / {result.dpfAfter.maxVpu.toFixed(4)} pu
              </p>
              <p className="text-sm text-slate-400">De-energized: {result.dpfAfter.deenergized.length ? result.dpfAfter.deenergized.join(", ") : "none"}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
