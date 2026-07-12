# Servigic AI Service

FastAPI microservice (P8/P9 of the master brief): LangChain agents + a small PyTorch ML layer, containerized separately from the Next.js app. Called server-to-server only — never exposed to browsers.

## Run locally (without Docker)

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in ANTHROPIC_API_KEY + a real INTERNAL_SERVICE_KEY
uvicorn app.main:app --reload --port 8000
```

## Run via Docker Compose

From the repo root:
```bash
docker compose --profile ai up -d
```
(the `ai` profile is opt-in — see `docker-compose.yml` — so `docker compose up` alone stays Postgres-only for people not touching the AI layer)

## Endpoints

All routes require an `X-Internal-Key` header matching `INTERNAL_SERVICE_KEY` — the Next.js app is the only caller, via `src/lib/aiService.ts`.

- `POST /triage/job` — category + urgency + budget suggestion from a job description
- `POST /leads/qualify` — priority score + bilingual outreach draft per lead
- `POST /disputes/summarize` — neutral summary + suggested resolution for an admin
- `POST /ml/bid-win-probability` — win-probability hint for a provider's bid
- `POST /ml/demand-heatmap` — zone/hour demand forecast

## Without ANTHROPIC_API_KEY

Every agent has a keyword/statistical heuristic fallback (see the `_heuristic_*` functions in `app/agents/`) so the endpoints always return a sane response — the feature just won't be LLM-quality until a real key is set. Nothing errors or blocks the main app.

## Training the bid-win model

The model starts in heuristic mode (no `models/bid_win_model.pt` file). Once you have real bid history:

1. In the admin panel, hit `GET /api/admin/ml/bid-training-data` (or curl it) to export resolved bids as JSON.
2. `python -m app.ml.train_bid_win path/to/export.json` (needs ~200+ resolved bids to be worth it).
3. Restart the service — it picks up `models/bid_win_model.pt` automatically.
