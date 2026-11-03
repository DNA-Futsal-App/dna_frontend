import { notFound } from "next/navigation";
import { VoteDetailClient } from "@/components/popular-voting/vote-detail-client";
import type { ContestCategory, Gender } from "@/lib/popular-voting-types";

type Props = { params: Promise<{ editionId: string; eventId: string; divisionId: string;
  categoryId: string; gender: string; contestCategory: string }> };
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
  return <VoteDetailClient editionId={p.editionId} eventId={eventId} divisionId={divisionId}
    categoryId={categoryId} gender={gender} contestCategory={contestCategory}/>;
}
