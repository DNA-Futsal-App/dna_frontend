import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasServerSessionCookie } from "@/lib/backend";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasSession = await hasServerSessionCookie();

  if (!hasSession) {
    redirect("/entrar");
  }

  return <AppShell>{children}</AppShell>;
}