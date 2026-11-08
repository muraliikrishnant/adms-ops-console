"use client";

import { useEffect, useState } from "react";
import OneLineDiagram from "@/components/OneLineDiagram";
import { Button, Card, SwitchBadge } from "@/components/ui";
import { sampleGisExtract } from "@/lib/sample-gis-extract";
import type { NetworkModel } from "@/lib/types";

export default function NetworkPage() {
  const [network, setNetwork] = useState<NetworkModel | null>(null);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
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

  async function reset() {
    setLoading(true);
    await fetch("/api/network", { method: "POST", body: JSON.stringify({ action: "reset" }) });
    await load();
    setLoading(false);
  }

  async function doImport() {
    setLoading(true);
    setImportMsg(null);
    try {
      const payload = JSON.parse(importText);
      const res = await fetch("/api/network/import", { method: "POST", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportMsg(
        `Imported "${data.network.name}": ${data.summary.nodesImported} nodes, ${data.summary.edgesImported} edges, ${data.summary.sourcesFound} source(s), ${data.summary.capBanksFound} cap bank(s).`,
      );
      await load();
    } catch (err) {
      setImportMsg(`Import failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setLoading(false);
  }

  if (!network) return <p className="text-slate-400">Loading network…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Network / GIS Model</h1>
        <Button variant="secondary" onClick={reset} disabled={loading}>
          Reset to sample feeder
        </Button>
      </div>

      <Card title={`One-line diagram: ${network.name}`}>
        <OneLineDiagram network={network} />
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Nodes">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th>ID</th>
                <th>Label</th>
                <th>Load (P/Q pu)</th>
                <th>Cap Bank</th>
              </tr>
            </thead>
            <tbody>
              {network.nodes.map((n) => (
                <tr key={n.id} className="border-t border-slate-800">
                  <td className="py-1">{n.id}</td>
                  <td>{n.label}</td>
                  <td>{n.isSource ? "source" : `${n.loadP.toFixed(2)} / ${n.loadQ.toFixed(2)}`}</td>
                  <td>{n.capBank ? `${n.capBank.id} (${n.capBank.status})` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Edges / switches">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th>Edge</th>
                <th>From → To</th>
                <th>Switch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {network.edges.map((e) => (
                <tr key={e.id} className="border-t border-slate-800">
                  <td className="py-1">{e.id}</td>
                  <td>
                    {e.from} → {e.to}
                  </td>
                  <td>
                    {e.switch.id}
                    {e.switch.isBreaker ? " (breaker)" : ""}
                  </td>
                  <td>
                    <SwitchBadge status={e.switch.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="GIS extract import">
        <p className="text-sm text-slate-400 mb-2">
          Paste a GeoJSON-style extract (Point features = buses, LineString features = line segments with a
          switch) to simulate loading a network model translated from a utility GIS, replacing the current
          network.
        </p>
        <div className="flex gap-2 mb-2">
          <Button variant="secondary" onClick={() => setImportText(JSON.stringify(sampleGisExtract, null, 2))}>
            Load sample GIS extract
          </Button>
          <Button onClick={doImport} disabled={loading || !importText.trim()}>
            Import &amp; load into network
          </Button>
        </div>
        <textarea
          className="w-full h-48 bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono"
          placeholder="Paste GeoJSON FeatureCollection here…"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        {importMsg && <p className="text-sm mt-2 text-slate-300">{importMsg}</p>}
      </Card>
    </div>
  );
}
