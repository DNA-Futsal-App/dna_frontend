"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play } from "lucide-react";

export function DemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  return (
    <button type="button" className="btn-secondary" disabled={loading} onClick={async () => {
      setLoading(true);
      const response = await fetch("/api/auth/demo", { method: "POST" });
      if (response.ok) router.push("/app");
      else setLoading(false);
    }}>
      <Play className="size-4 fill-current" aria-hidden="true" />{loading ? "Abrindo..." : "Explorar demonstração"}
    </button>
  );
}
