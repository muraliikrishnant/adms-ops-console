import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { TestLogEntry } from "@/lib/types";

export async function GET() {
  const db = await getDb();
  const entries = await db
    .collection<TestLogEntry>("testLogs")
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.scenarioType) {
    return NextResponse.json({ error: "title and scenarioType are required" }, { status: 400 });
  }
  const entry: TestLogEntry = {
    title: String(body.title),
    scenarioType: body.scenarioType,
    passFail: body.passFail ?? "n/a",
    notes: String(body.notes ?? ""),
    createdAt: new Date().toISOString(),
  };
  const db = await getDb();
  await db.collection<TestLogEntry>("testLogs").insertOne(entry);
  return NextResponse.json(entry, { status: 201 });
}
