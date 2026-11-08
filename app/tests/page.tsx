"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import type { TestLogEntry } from "@/lib/types";

const SCENARIO_TYPES: TestLogEntry["scenarioType"][] = ["DPF", "FLISR", "VVO", "GIS_IMPORT", "OTHER"];

export default function TestsPage() {
  const [entries, setEntries] = useState<TestLogEntry[]>([]);
  const [title, setTitle] = useState("");
  const [scenarioType, setScenarioType] = useState<TestLogEntry["scenarioType"]>("FLISR");
  const [passFail, setPassFail] = useState<TestLogEntry["passFail"]>("pass");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/tests");
    setEntries(await res.json());
  }

  useEffect(() => {
    fetch("/api/tests")
      .then((res) => res.json())
      .then(setEntries);
  }, []);

  async function submit() {
    if (!title.trim()) return;
    setLoading(true);
    await fetch("/api/tests", {
      method: "POST",
      body: JSON.stringify({ title, scenarioType, passFail, notes }),
    });
    setTitle("");
    setNotes("");
    await load();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Customer Test Event Log</h1>
      <p className="text-sm text-slate-400 max-w-3xl">
        A lightweight log for recording customer-facing or internal test events against DPF, FLISR, VVO, or
        a GIS import — the kind of record kept during factory/site acceptance testing.
      </p>

      <Card title="Log a test event">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-sm"
            placeholder="Test title (e.g. 'FLISR restoration on L4 fault')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-sm flex-1"
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as TestLogEntry["scenarioType"])}
            >
              {SCENARIO_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-sm"
              value={passFail}
              onChange={(e) => setPassFail(e.target.value as TestLogEntry["passFail"])}
            >
              <option value="pass">pass</option>
              <option value="fail">fail</option>
              <option value="n/a">n/a</option>
            </select>
          </div>
          <textarea
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-sm md:col-span-2"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="mt-2">
          <Button onClick={submit} disabled={loading || !title.trim()}>
            Log event
          </Button>
        </div>
      </Card>

      <Card title="Test events">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No test events logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th>When</th>
                <th>Title</th>
                <th>Scenario</th>
                <th>Result</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-t border-slate-800 align-top">
                  <td className="py-1 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                  <td>{e.title}</td>
                  <td>{e.scenarioType}</td>
                  <td>{e.passFail}</td>
                  <td className="text-slate-400">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
