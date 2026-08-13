import { NextResponse } from "next/server";
import { demoEnabled, setDemoCookie } from "@/lib/backend";

export async function POST() {
  if (!demoEnabled()) return NextResponse.json({ detail: "Demonstração desativada." }, { status: 404 });
  const response = NextResponse.json({ ok: true });
  setDemoCookie(response);
  return response;
}
