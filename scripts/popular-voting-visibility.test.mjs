import test from "node:test";
import assert from "node:assert/strict";
import { visibleVotingContexts } from "../lib/popular-voting-visibility.ts";

const context = (status, contestCategory) => ({ status, contestCategory });

test("mantém somente votações abertas ou agendadas", () => {
  const open = context("OPEN", "BEAUTIFUL_GOAL");
  const scheduled = context("SCHEDULED", "BEST_DRIBBLE");
  const closed = context("CLOSED", "FREE_KICK_GOAL");
  const unscheduled = context("NOT_SCHEDULED", "BEST_SAVE");
  assert.deepEqual(visibleVotingContexts([closed, open, unscheduled, scheduled]), [open, scheduled]);
});

test("sem modalidades disponíveis, não expõe categorias encerradas", () => {
  assert.deepEqual(visibleVotingContexts([context("CLOSED", "BEAUTIFUL_GOAL")]), []);
  assert.deepEqual(visibleVotingContexts([]), []);
});

test("preserva todas as modalidades elegíveis de um grupo misto", () => {
  const available = [context("OPEN", "BEAUTIFUL_GOAL"), context("SCHEDULED", "BEST_DRIBBLE")];
  const result = visibleVotingContexts([...available, context("CLOSED", "BEST_SAVE")]);
  assert.deepEqual(result, available);
});
