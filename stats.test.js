const test = require("node:test");
const assert = require("node:assert");
const Stats = require("./stats.js");

const g = (id, date, score, lines = 100, tetrises = null) => ({ id, date, score, lines, startLevel: 18, tetrises });

test("summarize handles an empty list", () => {
  const s = Stats.summarize([]);
  assert.strictEqual(s.count, 0);
  assert.strictEqual(s.best, null);
  assert.strictEqual(s.average, null);
  assert.strictEqual(s.trend, null);
});

test("summarize computes best, average and lines", () => {
  const s = Stats.summarize([g(1, "2026-01-01", 100000), g(2, "2026-01-02", 300000)]);
  assert.strictEqual(s.best, 300000);
  assert.strictEqual(s.average, 200000);
  assert.strictEqual(s.totalLines, 200);
});

test("tetris rate = lines from tetrises / total lines", () => {
  assert.strictEqual(Stats.tetrisRate(g(1, "2026-01-01", 1, 100, 20)), 0.8);
  assert.strictEqual(Stats.tetrisRate(g(1, "2026-01-01", 1, 100, null)), null);
});

test("trend compares last 5 games with the 5 before", () => {
  const games = Array.from({ length: 10 }, (_, i) => g(i, `2026-01-${String(i + 1).padStart(2, "0")}`, i < 5 ? 100 : 200));
  assert.strictEqual(Stats.summarize(games).trend, 100);
});

test("validate accepts a good game and rejects bad input", () => {
  assert.ok(Stats.validate({ date: "2026-05-01", score: "250000", lines: "120", startLevel: "18", tetrises: "20" }).ok);
  assert.ok(!Stats.validate({ date: "2026-05-01", score: "-5", lines: "10" }).ok);
  assert.ok(!Stats.validate({ date: "2026-05-01", score: "100", lines: "10", tetrises: "5" }).ok);
  assert.ok(!Stats.validate({ date: "nope", score: "100", lines: "10" }).ok);
});
