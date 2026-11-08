import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { defaultNetwork } from "@/lib/network-data";
import type { NetworkModel } from "@/lib/types";

export async function GET() {
  const db = await getDb();
  const collection = db.collection<NetworkModel>("networks");
  let network = (await collection.findOne(
    { id: "default" },
    { projection: { _id: 0 } },
  )) as NetworkModel | null;
  if (!network) {
    network = defaultNetwork();
    await collection.updateOne({ id: "default" }, { $set: network }, { upsert: true });
  }
  return NextResponse.json(network);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action !== "reset") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  const db = await getDb();
  const network = defaultNetwork();
  await db.collection<NetworkModel>("networks").updateOne({ id: "default" }, { $set: network }, { upsert: true });
  return NextResponse.json(network);
}
