"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { clientApi } from "@/lib/client-api";

export function useApiData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const requestId = useRef(0);

  const request = useCallback(async (clearCurrentData: boolean) => {
    const currentRequestId = ++requestId.current;
    if (clearCurrentData) { setLoading(true); setData(null); }
    setError("");
    try {
      const result = await clientApi<T>(url, { cache: "no-store" });
      if (currentRequestId !== requestId.current) return;
      setData(result);
    } catch (err) {
      if (currentRequestId !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      if (currentRequestId === requestId.current) { setResolvedUrl(url); setLoading(false); }
    }
  }, [url]);

  const load = useCallback(() => request(true), [request]);
  const refresh = useCallback(() => request(false), [request]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      requestId.current += 1;
    };
  }, [load]);

  return { data, error, loading: loading || resolvedUrl !== url, reload: load, refresh };
}
