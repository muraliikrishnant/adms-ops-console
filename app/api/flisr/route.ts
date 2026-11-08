import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runFlisr } from "@/lib/flisr";
import { defaultNetwork } from "@/lib/network-data";
import type { NetworkModel } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const db = await getDb();
  const collection = db.collection<NetworkModel>("networks");

  if (body.action === "restoreNormal") {
    const network = defaultNetwork();
    await collection.updateOne({ id: "default" }, { $set: network }, { upsert: true });
    return NextResponse.json({ network });
  }

  if (!body.faultedEdgeId) {
    return NextResponse.json({ error: "faultedEdgeId is required" }, { status: 400 });
  }

  const network =
    ((await collection.findOne({ id: "default" }, { projection: { _id: 0 } })) as NetworkModel | null) ??
    defaultNetwork();
  try {
    const result = runFlisr(network, body.faultedEdgeId);
    await collection.updateOne({ id: "default" }, { $set: result.network }, { upsert: true });
    await db.collection("runLogs").insertOne({ type: "FLISR", result, at: new Date().toISOString() });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "FLISR run failed" }, { status: 400 });
  }
}
