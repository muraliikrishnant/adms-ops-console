import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { defaultNetwork } from "@/lib/network-data";
import { computeDpf } from "@/lib/powerflow";
import type { NetworkModel, TestLogEntry } from "@/lib/types";
import { Card, Stat } from "@/components/ui";

async function DashboardStats() {
  await connection();
  if (!process.env.MONGODB_URI) {
    return (
      <Card title="Database not connected">
        <p className="text-sm text-slate-400">
          Set <code className="text-slate-200">MONGODB_URI</code> (see <code className="text-slate-200">.env.local.example</code>)
          to connect MongoDB and see live network status, voltage summary, and recent test events here.
        </p>
      </Card>
    );
  }
  const db = await getDb();
  const network = ((await db
    .collection<NetworkModel>("networks")
    .findOne({ id: "default" }, { projection: { _id: 0 } })) as NetworkModel | null) ?? defaultNetwork();
  const dpf = computeDpf(network);
  const recentTests = await db
    .collection<TestLogEntry>("testLogs")
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const openSwitches = network.edges.filter((e) => e.switch.status === "open").length;
  const capBanksOn = network.nodes.filter((n) => n.capBank?.status === "on").length;
  const capBanksTotal = network.nodes.filter((n) => n.capBank).length;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <Stat label="Network" value={network.name} />
        </Card>
        <Card>
          <Stat
            label="Min / Max Voltage"
            value={`${dpf.minVpu.toFixed(3)} / ${dpf.maxVpu.toFixed(3)} pu`}
            tone={dpf.violations.length ? "bad" : "good"}
          />
        </Card>
        <Card>
          <Stat label="Open Switches" value={String(openSwitches)} />
        </Card>
        <Card>
          <Stat label="Cap Banks On" value={`${capBanksOn} / ${capBanksTotal}`} />
        </Card>
      </div>

      <Card title="Recent test events">
        {recentTests.length === 0 ? (
          <p className="text-sm text-slate-500">No test events logged yet.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {recentTests.map((t, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{t.title}</span>
                <span className="text-slate-500 shrink-0">{t.scenarioType}</span>
              </li>
            ))}
          </ul>
        )}
        <Link className="text-sky-400 hover:underline text-sm block mt-2" href="/tests">
          View full test log →
        </Link>
      </Card>
    </>
  );
}

function StatsFallback() {
  return <p className="text-sm text-slate-500">Loading network status…</p>;
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">ADMS Ops Console</h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          A working mini Advanced Distribution Management System: a MongoDB-backed feeder model with
          Distribution Power Flow (DPF), Fault Location, Isolation &amp; Service Restoration (FLISR), and
          Volt/VAR Control &amp; Optimization (VVC/VVO) — plus a GIS-style import pipeline and a customer
          test-event log, mirroring the applications an Associate DMS Application Engineer configures,
          tests, and supports at a utility.
        </p>
      </div>

      <Card title="Quick actions">
        <div className="flex flex-col gap-2 text-sm">
          <Link className="text-sky-400 hover:underline" href="/network">
            View one-line diagram &amp; import a GIS extract →
          </Link>
          <Link className="text-sky-400 hover:underline" href="/dpf">
            Run Distribution Power Flow →
          </Link>
          <Link className="text-sky-400 hover:underline" href="/flisr">
            Simulate a fault and watch FLISR restore service →
          </Link>
          <Link className="text-sky-400 hover:underline" href="/vvo">
            Run VVC/VVO to resolve voltage violations →
          </Link>
        </div>
      </Card>

      <Suspense fallback={<StatsFallback />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
