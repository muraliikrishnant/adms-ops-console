import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { defaultNetwork } from "@/lib/network-data";
import { computeDpf } from "@/lib/powerflow";
import type { NetworkModel } from "@/lib/types";

export async function POST() {
  const db = await getDb();
  const network = ((await db
    .collection<NetworkModel>("networks")
    .findOne({ id: "default" }, { projection: { _id: 0 } })) as NetworkModel | null) ?? defaultNetwork();
  const result = computeDpf(network);
  await db.collection("runLogs").insertOne({
    type: "DPF",
    result,
    at: new Date().toISOString(),
  });
  return NextResponse.json(result);
}
