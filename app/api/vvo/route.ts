import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { defaultNetwork } from "@/lib/network-data";
import { runVvo } from "@/lib/vvo";
import type { NetworkModel } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const db = await getDb();
  const collection = db.collection<NetworkModel>("networks");

  if (body.action === "resetCapBanks") {
    const current =
      ((await collection.findOne({ id: "default" }, { projection: { _id: 0 } })) as NetworkModel | null) ??
      defaultNetwork();
    for (const node of current.nodes) {
      if (node.capBank) node.capBank.status = "off";
    }
    current.updatedAt = new Date().toISOString();
    await collection.updateOne({ id: "default" }, { $set: current }, { upsert: true });
    return NextResponse.json({ network: current });
  }

  const network =
    ((await collection.findOne({ id: "default" }, { projection: { _id: 0 } })) as NetworkModel | null) ??
    defaultNetwork();
  const result = runVvo(network);
  await collection.updateOne({ id: "default" }, { $set: result.network }, { upsert: true });
  await db.collection("runLogs").insertOne({ type: "VVO", result, at: new Date().toISOString() });
  return NextResponse.json(result);
}
