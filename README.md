## IC Review Backend

Fetches ICP governance proposals and emails topic-based recipient groups. Runs an hourly background job that:
- Retrieves latest proposals from `https://ic-api.internetcomputer.org/api/v3/proposals`
- Filters by topics and status
- De-duplicates already-notified proposals
- Sends HTML emails with links to each proposal

### Requirements
- Node.js >= 18 (uses ESM)

### Setup
```bash
nvm use
npm install
```

### Run
```bash
npm run dev
# or
npm start

# Docker
docker compose up --build -d
docker compose logs -f ic-review
```

Server starts on port 3001 by default.

### Endpoint
- GET `/` — health/info


### Config (brief)
- Upstream API: `https://ic-api.internetcomputer.org/api/v3/proposals`
- Email via SMTP: set `SMTP_*`, `MAIL_FROM`, `MAIL_TO` (fallback)
- Per-topic recipients: edit `server/config.js`
- Dashboard URL override: `PROPOSAL_DASHBOARD_BASE_URL`

Docker:
- Image contains only dependencies; `server/` is bind-mounted for live edits
- Data stored under `/app/data`
