// Pure logic (no DOM) so it can be unit tested with `npm test`.
// Works in the browser (global `Stats`) and in Node (module.exports).
const Stats = {
  /** Validate raw form/import input. Returns { ok, game } or { ok: false, error }. */
  validate(input) {
    const fail = (error) => ({ ok: false, error });
    const toNum = (v) => (v === "" || v == null ? NaN : Number(v));

    const date = String(input.date || "");
    const score = toNum(input.score);
    const lines = toNum(input.lines);
    const startLevel = input.startLevel === "" || input.startLevel == null ? 0 : Number(input.startLevel);
    const tetrises = input.tetrises === "" || input.tetrises == null ? null : Number(input.tetrises);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return fail("Enter a valid date.");
    if (!Number.isInteger(score) || score < 0 || score > 99999999) return fail("Score must be a whole number from 0 to 99,999,999.");
    if (!Number.isInteger(lines) || lines < 0 || lines > 9999) return fail("Lines must be a whole number from 0 to 9,999.");
    if (!Number.isInteger(startLevel) || startLevel < 0 || startLevel > 29) return fail("Start level must be a whole number from 0 to 29.");
    if (tetrises !== null && (!Number.isInteger(tetrises) || tetrises < 0 || tetrises * 4 > lines)) {
      return fail("Tetrises must be a whole number and can't use more than your total lines (4 lines each).");
    }
    return { ok: true, game: { date, score, lines, startLevel, tetrises } };
  },

  /** Oldest first: by date, then by id (creation order). */
  sortGames(games) {
    return [...games].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  },

  /** Share of lines cleared as tetrises (0..1), or null if tetrises weren't logged. */
  tetrisRate(game) {
    if (game.tetrises == null || game.lines <= 0) return null;
    return (game.tetrises * 4) / game.lines;
  },

  average(nums) {
    return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
  },

  summarize(games) {
    const sorted = Stats.sortGames(games);
    const scores = sorted.map((g) => g.score);
    const withRate = sorted.filter((g) => g.tetrises != null && g.lines > 0);
    const rateLines = withRate.reduce((a, g) => a + g.lines, 0);
    const rateTetrisLines = withRate.reduce((a, g) => a + g.tetrises * 4, 0);

    const recent = scores.slice(-5);
    const previous = scores.slice(-10, -5);

    return {
      count: sorted.length,
      best: scores.length ? Math.max(...scores) : null,
      average: Stats.average(scores),
      totalLines: sorted.reduce((a, g) => a + g.lines, 0),
      tetrisRate: rateLines ? rateTetrisLines / rateLines : null,
      // Average of the last 5 games minus the 5 before them (needs at least 1 earlier game).
      trend: previous.length ? Stats.average(recent) - Stats.average(previous) : null,
    };
  },
};

if (typeof module !== "undefined") module.exports = Stats;
