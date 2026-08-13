import { NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";

export async function GET() {
  if (demoEnabled()) {
    return NextResponse.json([
      { id: "sub-7", name: "Sub-7" },
      { id: "sub-9", name: "Sub-9" },
      { id: "sub-11", name: "Sub-11" },
      { id: "sub-13", name: "Sub-13" },
      { id: "sub-15", name: "Sub-15" },
      { id: "sub-17", name: "Sub-17" },
      { id: "sub-20", name: "Sub-20" },
    ]);
  }
  return proxyPublic("/api/v1/public/catalog/categories");
}
