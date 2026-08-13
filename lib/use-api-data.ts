"use client";

import { useCallback, useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";

export function useApiData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await clientApi<T>(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let active = true;
    clientApi<T>(url)
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar os dados."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url]);
  return { data, error, loading, reload: load };
}
