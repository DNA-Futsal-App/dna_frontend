"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Check, LoaderCircle, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";
import type { CoachAccessLinkInfo } from "@/lib/awards-types";

export default function CoachAccessRegisterPage(){
 const router=useRouter(); const [checking,setChecking]=useState(true); const [access,setAccess]=useState<CoachAccessLinkInfo|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 useEffect(()=>{clientApi<CoachAccessLinkInfo>("/api/awards/coach-invite/current").then(r=>{if(!r.available)throw new Error("Este link não está mais disponível.");setAccess(r);}).catch(e=>setError(e instanceof Error?e.message:"Não foi possível validar o credenciamento.")).finally(()=>setChecking(false));},[]);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!access)return;const form=new FormData(event.currentTarget);const password=String(form.get("password")??"");if(password!==form.get("passwordConfirmation")){setError("As senhas precisam ser iguais.");return;}setLoading(true);setError("");try{await clientApi("/api/auth/register",{method:"POST",body:JSON.stringify({name:form.get("name"),email:form.get("email"),phone:form.get("phone"),password,childInstagram:null,eventId:null,categoryId:null,divisionId:null,teamId:null})});router.push(`/verificar-email?login=${encodeURIComponent(String(form.get("email")))}`);}catch(e){setError(e instanceof Error?e.message:"Não foi possível criar sua conta.");setLoading(false);}}
 if(checking)return <AuthShell awardBranding eyebrow="Júri técnico" title="Validando seu acesso." description="Conferindo o link de credenciamento."><LoaderCircle className="mx-auto size-10 animate-spin text-cyan"/></AuthShell>;
 if(!access)return <AuthShell awardBranding eyebrow="Júri técnico" title="Credenciamento necessário." description={error||"Abra novamente o link fornecido pela organização."}><Link href="/" className="btn-ghost w-full">Voltar ao DNA Futsal</Link></AuthShell>;
 return <AuthShell awardBranding eyebrow="Cadastro de treinador" title="Crie sua conta." description={`Credenciamento para ${access.editionName}. Depois do login você informará onde treina.`}><form onSubmit={submit} className="grid gap-5">
  <label className="grid gap-1.5 text-sm font-bold">Nome completo<input className="field" name="name" autoComplete="name" minLength={2} maxLength={120} required/></label>
  <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold">E-mail<input className="field" name="email" type="email" required/></label><label className="grid gap-1.5 text-sm font-bold">Telefone<input className="field" name="phone" type="tel" required/></label></div>
  <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold">Senha<input className="field" name="password" type="password" minLength={10} maxLength={72} required/></label><label className="grid gap-1.5 text-sm font-bold">Confirmar senha<input className="field" name="passwordConfirmation" type="password" minLength={10} required/></label></div>
  <p className="flex gap-2 text-xs text-muted"><Check className="size-4 shrink-0 text-cyan"/>Após confirmar o e-mail, entre na conta e defina seu primeiro contexto.</p>
  {error?<p className="rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]">{error}</p>:null}
  <button className="btn-primary w-full" disabled={loading}>{loading?<LoaderCircle className="size-5 animate-spin"/>:<UserRoundPlus className="size-5"/>}{loading?"Criando conta...":"Criar minha conta"}</button>
 </form><p className="mt-6 text-center text-sm text-muted">Já possui conta? <Link href="/entrar" className="font-black text-cyan">Entrar</Link></p></AuthShell>;
}
