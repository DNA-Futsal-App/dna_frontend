"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { clientApi } from "@/lib/client-api";

export function useApiData<T>(url: string) {
  const [data, setData] =
    useState<T | null>(null);
  const [error, setError] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const requestId =
    useRef(0);

  const load = useCallback(async () => {
    const currentRequestId =
      ++requestId.current;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const result =
        await clientApi<T>(
          url,
          {
            cache: "no-store",
          },
        );

      if (
        currentRequestId !==
        requestId.current
      ) {
        return;
      }

      setData(result);
    } catch (err) {
      if (
        currentRequestId !==
        requestId.current
      ) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os dados.",
      );
    } finally {
      if (
        currentRequestId ===
        requestId.current
      ) {
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    const currentRequestId = ++requestId.current;

    async function loadInitialData() {
      try {
        const result = await clientApi<T>(url, {
          cache: "no-store",
        });

        if (currentRequestId !== requestId.current) {
          return;
        }

        setData(result);
        setError("");
      } catch (err) {
        if (currentRequestId !== requestId.current) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "NÃ£o foi possÃ­vel carregar os dados.",
        );
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      requestId.current += 1;
    };
  }, [url]);

  return {
    data,
    error,
    loading,
    reload: load,
  };
}
