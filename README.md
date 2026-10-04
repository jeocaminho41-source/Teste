# ⚽ Futebol AI

Dashboard de futebol com partidas, classificação e assistente de IA em português.

## Incluído

- Dashboard responsivo para celular e desktop.
- Seleção de competição e temporada.
- Próximas partidas e partidas ao vivo.
- Tabela de classificação.
- Modo demonstração sem chave de futebol.
- Backend Express para proteger as chaves.
- Assistente Futebol AI usando a OpenAI Responses API.
- Integração com API-Football/API-Sports.
- Endpoint de saúde para verificar as integrações.

## Instalação

Requisitos: Node.js 20+.

1. Rode: npm install
2. Copie .env.example para .env.
3. Preencha API_FOOTBALL_KEY e OPENAI_API_KEY.
4. Se quiser, altere OPENAI_MODEL.
5. Rode: npm run dev
6. Abra http://localhost:3000

## Variáveis

PORT=3000
API_FOOTBALL_KEY=sua_chave_api_football
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-5
DEFAULT_LEAGUE=39
DEFAULT_SEASON=2026

## Competições

Premier League (39), La Liga (140), Serie A (135), Bundesliga (78), Ligue 1 (61), Brasileirão (71) e Copa do Mundo (1).

## Segurança

Nunca coloque chaves de API dentro de public/. O arquivo .env já está no .gitignore.

## Próximas evoluções

Páginas de times e jogadores, detalhes de partidas, eventos, escalações, estatísticas, confrontos diretos, previsões explicáveis, favoritos, notificações, autenticação, banco de dados e cache.

## Fontes

A camada de futebol usa API-Football/API-Sports. A IA usa a OpenAI Responses API.
