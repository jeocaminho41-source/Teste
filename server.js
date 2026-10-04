import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const FOOTBALL_BASE = "https://v3.football.api-sports.io";
const DEFAULT_LEAGUE = Number(process.env.DEFAULT_LEAGUE || 39);
const DEFAULT_SEASON = Number(process.env.DEFAULT_SEASON || 2026);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const leagues = {
  39: "Premier League",
  140: "La Liga",
  135: "Serie A",
  78: "Bundesliga",
  61: "Ligue 1",
  71: "Brasileirão",
  1: "Copa do Mundo"
};

function normalizeFixture(item) {
  return {
    id: item.fixture?.id,
    date: item.fixture?.date,
    status: item.fixture?.status?.short,
    statusLong: item.fixture?.status?.long,
    elapsed: item.fixture?.status?.elapsed,
    venue: item.fixture?.venue?.name || null,
    league: {
      id: item.league?.id,
      name: item.league?.name,
      round: item.league?.round
    },
    home: {
      id: item.teams?.home?.id,
      name: item.teams?.home?.name,
      logo: item.teams?.home?.logo,
      winner: item.teams?.home?.winner
    },
    away: {
      id: item.teams?.away?.id,
      name: item.teams?.away?.name,
      logo: item.teams?.away?.logo,
      winner: item.teams?.away?.winner
    },
    goals: {
      home: item.goals?.home,
      away: item.goals?.away
    }
  };
}

function demoFixtures() {
  return [
    {
      id: 1001,
      date: new Date(Date.now() + 45 * 60000).toISOString(),
      status: "NS",
      statusLong: "Not Started",
      elapsed: null,
      venue: "Estádio de Futebol",
      league: { id: 39, name: "Premier League", round: "Regular Season" },
      home: { id: 101, name: "Manchester City", logo: "", winner: null },
      away: { id: 102, name: "Arsenal", logo: "", winner: null },
      goals: { home: null, away: null }
    },
    {
      id: 1002,
      date: new Date(Date.now() - 30 * 60000).toISOString(),
      status: "2H",
      statusLong: "Second Half",
      elapsed: 68,
      venue: "Arena Principal",
      league: { id: 39, name: "Premier League", round: "Regular Season" },
      home: { id: 103, name: "Liverpool", logo: "", winner: null },
      away: { id: 104, name: "Chelsea", logo: "", winner: null },
      goals: { home: 2, away: 1 }
    }
  ];
}

function demoStandings() {
  return [
    { rank: 1, team: { id: 101, name: "Manchester City", logo: "" }, points: 28, played: 11, win: 9, draw: 1, lose: 1, goalsFor: 28, goalsAgainst: 9 },
    { rank: 2, team: { id: 103, name: "Liverpool", logo: "" }, points: 26, played: 11, win: 8, draw: 2, lose: 1, goalsFor: 24, goalsAgainst: 10 },
    { rank: 3, team: { id: 102, name: "Arsenal", logo: "" }, points: 24, played: 11, win: 7, draw: 3, lose: 1, goalsFor: 21, goalsAgainst: 8 },
    { rank: 4, team: { id: 104, name: "Chelsea", logo: "" }, points: 20, played: 11, win: 6, draw: 2, lose: 3, goalsFor: 19, goalsAgainst: 14 }
  ];
}

async function footballApi(endpoint, params = {}) {
  if (!process.env.API_FOOTBALL_KEY) return null;
  const url = new URL(endpoint, FOOTBALL_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY, Accept: "application/json" }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || (body.errors && Object.keys(body.errors).length)) {
    throw new Error("API-Football: " + JSON.stringify(body.errors || response.statusText));
  }
  return body;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    footballApiConfigured: Boolean(process.env.API_FOOTBALL_KEY),
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    defaultLeague: DEFAULT_LEAGUE,
    defaultSeason: DEFAULT_SEASON
  });
});

app.get("/api/leagues", (_req, res) => {
  res.json(Object.entries(leagues).map(([id, name]) => ({ id: Number(id), name })));
});

app.get("/api/matches", async (req, res) => {
  const league = Number(req.query.league || DEFAULT_LEAGUE);
  const season = Number(req.query.season || DEFAULT_SEASON);
  const mode = req.query.mode || "next";
  try {
    const params = { league, season };
    if (mode === "live") {
      delete params.league;
      delete params.season;
      params.live = "all";
    } else {
      params.next = Math.min(Number(req.query.limit || 12), 20);
    }
    const data = await footballApi("/fixtures", params);
    const fixtures = data?.response?.map(normalizeFixture) || demoFixtures();
    res.json({ source: data ? "api-football" : "demo", league, season, count: fixtures.length, matches: fixtures });
  } catch (error) {
    res.status(502).json({ error: error.message, matches: demoFixtures(), source: "demo-fallback" });
  }
});

app.get("/api/standings", async (req, res) => {
  const league = Number(req.query.league || DEFAULT_LEAGUE);
  const season = Number(req.query.season || DEFAULT_SEASON);
  try {
    const data = await footballApi("/standings", { league, season });
    const rows = data?.response?.[0]?.league?.standings?.[0] || [];
    const standings = rows.map((row) => ({
      rank: row.rank,
      team: { id: row.team?.id, name: row.team?.name, logo: row.team?.logo },
      points: row.points,
      played: row.all?.played,
      win: row.all?.win,
      draw: row.all?.draw,
      lose: row.all?.lose,
      goalsFor: row.all?.goals?.for,
      goalsAgainst: row.all?.goals?.against
    }));
    res.json({ source: data ? "api-football" : "demo", league, season, standings: standings.length ? standings : demoStandings() });
  } catch (error) {
    res.status(502).json({ error: error.message, standings: demoStandings(), source: "demo-fallback" });
  }
});

app.get("/api/fixture/:id", async (req, res) => {
  try {
    const data = await footballApi("/fixtures", { id: req.params.id });
    const fixture = data?.response?.[0];
    if (!fixture) return res.status(404).json({ error: "Partida não encontrada." });
    res.json({ fixture: normalizeFixture(fixture), raw: fixture });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post("/api/ai", async (req, res) => {
  const message = req.body?.message;
  const context = req.body?.context || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "Envie uma pergunta." });

  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      configured: false,
      answer: "O assistente está pronto, mas falta configurar OPENAI_API_KEY no arquivo .env. O painel de futebol continua funcionando com os dados disponíveis."
    });
  }

  const model = process.env.OPENAI_MODEL || "gpt-5";
  const instructions = [
    "Você é o Futebol AI, um analista de futebol objetivo.",
    "Responda em português do Brasil.",
    "Use o contexto fornecido como fonte principal.",
    "Nunca invente placares, estatísticas, escalações, notícias ou fatos.",
    "Se não houver dados suficientes, diga isso claramente.",
    "Previsões são probabilísticas, nunca garantias.",
    "Não dê instruções para apostas nem promova jogos de azar."
  ].join(" ");

  const input = "Pergunta do usuário:\n" + message + "\n\nContexto do painel:\n" + JSON.stringify(context).slice(0, 18000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, instructions, input, store: false })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message || "Falha ao chamar a IA." });

    const answer = data.output_text ||
      (data.output || []).flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text)
        .join("\n") ||
      "A IA não retornou texto.";

    res.json({ configured: true, answer, model });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get("/{*splat}", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log("Futebol AI rodando em http://localhost:" + PORT));
