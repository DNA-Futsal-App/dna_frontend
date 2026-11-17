import test from "node:test";
import assert from "node:assert/strict";
import {
  orderedVoteCategories, orderedCoachBallotVotes,
  playerSlotLabels, voteCategoryLabel,
} from "../lib/coach-voting-display.ts";

const categories = [
  { id: "pivot", code: "PIVO", label: "Pivô", targetType: "ATHLETE", displayOrder: 40 },
  { id: "right", code: "JOGADOR_5", label: "Jogador 5", targetType: "ATHLETE", displayOrder: 45 },
  { id: "coach", code: "TECNICO", label: "Técnico", targetType: "COACH", displayOrder: 50 },
  { id: "left", code: "ALA", label: "Ala", targetType: "ATHLETE", displayOrder: 30 },
  { id: "keeper", code: "GOLEIRO", label: "Goleiro", targetType: "ATHLETE", displayOrder: 10 },
  { id: "fixed", code: "FIXO", label: "Fixo", targetType: "ATHLETE", displayOrder: 20 },
];

const expected = [
  "Melhor Goleiro:",
  "Melhor Jogador 1: (Fixo)",
  "Melhor Jogador 2: (Ala Esq.)",
  "Melhor Jogador 3: (Ala Dir.)",
  "Melhor Jogador 4: (Pivô)",
  "Melhor Treinador:",
];

test("seis escolhas na ordem pedida, mantendo os IDs de votação", () => {
  const original = categories.map((item) => item.id);
  const ordered = orderedVoteCategories(categories);
  assert.deepEqual(ordered.map((item) => item.id), ["keeper", "fixed", "left", "right", "pivot", "coach"]);
  assert.deepEqual(ordered.map((item) => voteCategoryLabel(item, playerSlotLabels(categories))), expected);
  assert.deepEqual(categories.map((item) => item.id), original);
});

test("comprovante mantém a mesma ordem independente da ordenação do backend", () => {
  const receipt = categories.map((item) => ({ voteCategoryCode: item.code, candidateName: item.id }));
  const ordered = orderedCoachBallotVotes(receipt);
  assert.deepEqual(ordered.map((item) => item.candidateName), ["keeper", "fixed", "left", "right", "pivot", "coach"]);
  assert.equal(receipt[0].candidateName, "pivot");
});

test("não inventa uma categoria ausente nem muda rótulos desconhecidos", () => {
  const withoutRight = categories.filter((item) => item.code !== "JOGADOR_5");
  const slots = playerSlotLabels(withoutRight);
  assert.equal(Object.keys(slots).length, 5);
  assert.equal(slots.pivot, "Melhor Jogador 4: (Pivô)");
  assert.equal(voteCategoryLabel({ ...categories[0], id: "custom", code: "CUSTOM", label: "Extra" }, slots), "Extra");
});
