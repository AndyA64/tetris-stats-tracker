// UI layer: reads/writes localStorage and renders the page using the pure logic in stats.js.
(() => {
  const KEY = "tetris-tracker:v1";
  const $ = (sel) => document.querySelector(sel);
  const fmt = (n) => (n == null ? "–" : n.toLocaleString());
  const pct = (r) => (r == null ? "–" : `${Math.round(r * 100)}%`);

  let games = load();

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(games)); }
    catch { showError("Couldn't save: browser storage is unavailable."); }
  }
  function showError(msg = "") { $("#error").textContent = msg; }
  function newId() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }

  // Build DOM with textContent only, so imported data can never inject HTML.
  function el(tag, props = {}, ...kids) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids);
    return node;
  }

  function renderSummary() {
    const s = Stats.summarize(games);
    const trend = s.trend == null ? "–" : `${s.trend > 0 ? "+" : ""}${s.trend.toLocaleString()}`;
    const cards = [
      ["Games", fmt(s.count)], ["Best score", fmt(s.best)], ["Average", fmt(s.average)],
      ["Tetris rate", pct(s.tetrisRate)], ["Total lines", fmt(s.totalLines)], ["Trend (last 5)", trend],
    ];
    $("#summary").replaceChildren(...cards.map(([label, value]) => el("div", { className: "stat" }, el("b", { textContent: value }), el("span", { textContent: label }))));
  }

  function renderChart() {
    const box = $("#chart");
    const data = Stats.sortGames(games);
    if (data.length < 2) { box.replaceChildren(el("p", { className: "dim", textContent: "Log at least 2 games to see your trend." })); return; }

    const NS = "http://www.w3.org/2000/svg", W = 600, H = 200, P = 24;
    const max = Math.max(...data.map((g) => g.score)) || 1;
    const x = (i) => P + (i * (W - 2 * P)) / (data.length - 1);
    const y = (v) => H - P - (v / max) * (H - 2 * P);
    const svg = (tag, attrs) => Object.entries(attrs).reduce((n, [k, v]) => (n.setAttribute(k, v), n), document.createElementNS(NS, tag));

    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Line chart of score per game" });
    root.append(svg("polyline", { points: data.map((g, i) => `${x(i)},${y(g.score)}`).join(" "), fill: "none", stroke: "#6ee7d8", "stroke-width": 2 }));
    data.forEach((g, i) => {
      const dot = svg("circle", { cx: x(i), cy: y(g.score), r: g.score === max ? 5 : 3, fill: g.score === max ? "#ffb454" : "#6ee7d8" });
      dot.append(Object.assign(svg("title", {}), { textContent: `${g.date}: ${g.score.toLocaleString()}` }));
      root.append(dot);
    });
    box.replaceChildren(root);
  }

  function renderTable() {
    const head = el("thead", {}, el("tr", {}, ...["Date", "Score", "Lines", "Start lvl", "Tetris rate", ""].map((h) => el("th", { textContent: h }))));
    const rows = Stats.sortGames(games).reverse().map((g) => el("tr", {},
      el("td", { textContent: g.date }), el("td", { textContent: fmt(g.score) }), el("td", { textContent: fmt(g.lines) }),
      el("td", { textContent: g.startLevel }), el("td", { textContent: pct(Stats.tetrisRate(g)) }),
      el("td", {}, el("button", { type: "button", textContent: "✕", ariaLabel: `Delete game from ${g.date}`, onclick: () => remove(g.id) }))));
    $("#history").replaceChildren(head, el("tbody", {}, ...rows));
  }

  function render() { renderSummary(); renderChart(); renderTable(); }
  function remove(id) { games = games.filter((g) => g.id !== id); save(); render(); }

  $("#form").addEventListener("submit", (e) => {
    e.preventDefault();
    const result = Stats.validate(Object.fromEntries(new FormData(e.target)));
    if (!result.ok) return showError(result.error);
    showError();
    games.push({ id: newId(), ...result.game });
    save(); render();
    e.target.reset();
    e.target.date.value = today();
    e.target.score.focus();
  });

  $("#export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(games, null, 2)], { type: "application/json" }));
    el("a", { href: url, download: "tetris-stats.json" }).click();
    URL.revokeObjectURL(url);
  });

  $("#import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text());
      if (!Array.isArray(incoming)) throw new Error();
      const valid = incoming.map((g) => Stats.validate(g)).filter((r) => r.ok).map((r) => ({ id: newId(), ...r.game }));
      games = games.concat(valid);
      save(); render();
      showError(`Imported ${valid.length} of ${incoming.length} games.`);
    } catch { showError("That file isn't a valid export."); }
    e.target.value = "";
  });

  $("#clear").addEventListener("click", () => {
    if (games.length && confirm("Delete all logged games? This can't be undone.")) { games = []; save(); render(); }
  });

  function today() { return new Date().toLocaleDateString("en-CA"); } // YYYY-MM-DD in local time
  $("#form").date.value = today();
  render();
})();
