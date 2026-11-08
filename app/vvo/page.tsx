"use client";

import { useEffect, useState } from "react";
import OneLineDiagram from "@/components/OneLineDiagram";
import { Button, Card } from "@/components/ui";
import type { NetworkModel, VvoResult } from "@/lib/types";

export default function VvoPage() {
  const [network, setNetwork] = useState<NetworkModel | null>(null);
  const [result, setResult] = useState<VvoResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/network");
    setNetwork(await res.json());
  }

  useEffect(() => {
    fetch("/api/network")
      .then((res) => res.json())
      .then(setNetwork);
  }, []);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/vvo", { method: "POST" });
    setResult(await res.json());
    setLoading(false);
  }

  async function resetCaps() {
    setLoading(true);
    await fetch("/api/vvo", { method: "POST", body: JSON.stringify({ action: "resetCapBanks" }) });
    setResult(null);
    await load();
    setLoading(false);
  }

  if (!network) return <p className="text-slate-400">Loading network…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">VVC/VVO — Volt/VAR Control &amp; Optimization</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={resetCaps} disabled={loading}>
            Reset capacitor banks
          </Button>
          <Button onClick={run} disabled={loading}>
            {loading ? "Optimizing…" : "Run VVO"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-400 max-w-3xl">
        Greedily switches in capacitor banks — most depressed voltage first — validating each switching
        action against a fresh power flow, then relieves any resulting overvoltage, to keep every energized
        bus within the 0.95–1.05 pu band.
      </p>

      <Card title="One-line diagram">
        <OneLineDiagram network={result?.network ?? network} dpf={result?.dpfAfter} />
      </Card>

      {result && (
        <>
          <Card title="Optimization log">
            <ol className="text-sm list-decimal pl-5 space-y-1">
              {result.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Card>

          <Card title="Capacitor bank actions">
            {result.actions.length === 0 ? (
              <p className="text-sm text-slate-500">No switching actions were taken.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-left">
                  <tr>
                    <th>Cap Bank</th>
                    <th>Action</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.actions.map((a, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="py-1">{a.capBankId}</td>
                      <td>{a.action}</td>
                      <td>{a.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Before">
              <p className="text-sm text-slate-400">
                Min/Max voltage: {result.dpfBefore.minVpu.toFixed(4)} / {result.dpfBefore.maxVpu.toFixed(4)} pu
              </p>
              <p className="text-sm text-slate-400">Violations: {result.dpfBefore.violations.length ? result.dpfBefore.violations.join(", ") : "none"}</p>
            </Card>
            <Card title="After">
              <p className="text-sm text-slate-400">
                Min/Max voltage: {result.dpfAfter.minVpu.toFixed(4)} / {result.dpfAfter.maxVpu.toFixed(4)} pu
              </p>
              <p className="text-sm text-slate-400">Violations: {result.dpfAfter.violations.length ? result.dpfAfter.violations.join(", ") : "none"}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
