import assert from "node:assert/strict";
import test from "node:test";

// Same predicate as the voting page; each context has independent submission state.
const nextPending = (contexts, current) => contexts.find((item) =>
  item.contextId !== current && !item.submitted && item.state === "OPEN");

test("after voting in A1 Sub-12, A1 Sub-14 remains selectable", () => {
  const contexts = [
    { contextId: "sub12", state: "SUBMITTED", submitted: true },
    { contextId: "sub14", state: "OPEN", submitted: false },
  ];
  assert.equal(nextPending(contexts, "sub12")?.contextId, "sub14");
  assert.equal(nextPending(contexts, "sub14"), undefined);
});

test("closed or already submitted contexts are not offered as next vote", () => {
  const contexts = [
    { contextId: "sub12", state: "SUBMITTED", submitted: true },
    { contextId: "sub14", state: "CLOSED", submitted: false },
  ];
  assert.equal(nextPending(contexts, "sub12"), undefined);
});
