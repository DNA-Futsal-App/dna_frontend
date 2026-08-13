import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("dna_access") || cookieStore.has("dna_refresh") || (process.env.DEMO_MODE === "true" && cookieStore.get("dna_demo")?.value === "1");
  if (!hasSession) redirect("/entrar");
  return <AppShell>{children}</AppShell>;
}
