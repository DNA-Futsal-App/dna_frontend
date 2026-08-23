"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    params.get("expired")
      ? "Sua sessão expirou. Entre novamente para continuar."
      : "",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    await clientApi("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        login: form.get("login"),
        password: form.get("password"),
      }),
    });

    window.location.replace("/app");
  }

  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entre em quadra."
      description="Use seu e-mail ou telefone e acompanhe tudo do seu time."
    >
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-bold text-ivory">
          E-mail ou telefone
          <input
            className="field"
            name="login"
            autoComplete="username"
            inputMode="email"
            required
            placeholder="voce@email.com ou (11) 99999-9999"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-ivory">
          Senha
          <span className="relative">
            <input
              className="field pr-12"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-muted hover:text-cyan"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </span>
        </label>
        <div className="flex justify-end">
          <Link
            href="/esqueci-senha"
            className="text-sm font-bold text-cyan hover:text-white"
          >
            Esqueci minha senha
          </Link>
        </div>
        {error ? (
          <p
            className="rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <button className="btn-primary mt-1 w-full" disabled={loading}>
          {loading ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <LogIn className="size-5" />
          )}
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não faz parte?{" "}
        <Link
          href="/cadastro"
          className="font-black text-amber hover:text-white"
        >
          Crie sua conta
        </Link>
      </p>
    </AuthShell>
  );
}
