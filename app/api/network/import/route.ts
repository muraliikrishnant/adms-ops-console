import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { importFromGeoJson } from "@/lib/gis-import";
import type { NetworkModel, TestLogEntry } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const { network, summary } = importFromGeoJson(body, body.name ?? "Imported Feeder");
    const db = await getDb();
    await db.collection<NetworkModel>("networks").updateOne({ id: "default" }, { $set: network }, { upsert: true });
    await db.collection<TestLogEntry>("testLogs").insertOne({
      title: `GIS extract imported: ${network.name}`,
      scenarioType: "GIS_IMPORT",
      passFail: "n/a",
      notes: `Imported ${summary.nodesImported} nodes, ${summary.edgesImported} edges, ${summary.sourcesFound} source(s), ${summary.capBanksFound} capacitor bank(s).`,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ network, summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 400 });
  }
}
