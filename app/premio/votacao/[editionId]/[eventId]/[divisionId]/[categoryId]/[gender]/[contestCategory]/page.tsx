import { notFound } from "next/navigation";
import { proxyPublic } from "@/lib/backend";
import { VoteDetailClient } from "@/components/popular-voting/vote-detail-client";
import type { ContestCategory, Gender, VotingContext } from "@/lib/popular-voting-types";

type Props = { params: Promise<{ editionId: string; eventId: string; divisionId: string;
  categoryId: string; gender: string; contestCategory: string }> };
// A consulta do status precisa acontecer em cada novo acesso, sem cache de página.
export const dynamic = "force-dynamic";

const categories: ContestCategory[] = ["BEAUTIFUL_GOAL", "BEST_DRIBBLE", "FREE_KICK_GOAL", "BEST_SAVE"];

export default async function VotingContextPage({ params }: Props) {
  const p = await params;
  const eventId = Number(p.eventId);
  const divisionId = Number(p.divisionId);
  const categoryId = Number(p.categoryId);
  const gender: Gender = p.gender as Gender;
  const contestCategory = p.contestCategory as ContestCategory;
  if (!/^[0-9a-fA-F-]{36}$/.test(p.editionId)
    || ![eventId, divisionId, categoryId].every((value) => Number.isSafeInteger(value) && value > 0)
    || !["MALE", "FEMALE"].includes(gender)
    || !categories.includes(contestCategory)) notFound();
  // O endpoint público é a fonte autoritativa para o status calculado no backend.
  // Ele contempla tanto o fim natural da janela quanto o fechamento manual.
  const response = await proxyPublic(
    `/api/v1/public/awards/popular-voting/editions/${p.editionId}/contexts`,
  );
  if (response.status === 404) notFound();
  // Uma indisponibilidade do backend não deve ser confundida com votação encerrada.
  if (!response.ok) throw new Error("Não foi possível consultar o status da votação.");

  const contexts = (await response.json()) as VotingContext[];
  const eligible = contexts.some((item) =>
    item.eventId === eventId
    && item.divisionId === divisionId
    && item.categoryId === categoryId
    && item.gender === gender
    && item.contestCategory === contestCategory
    && (item.status === "OPEN" || item.status === "SCHEDULED")
  );
  if (!eligible) notFound();

  return <VoteDetailClient editionId={p.editionId} eventId={eventId} divisionId={divisionId}
    categoryId={categoryId} gender={gender} contestCategory={contestCategory}/>;
}
