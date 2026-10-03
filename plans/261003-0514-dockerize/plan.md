---
title: Dockerize the game
status: completed
priority: P1
effort: medium
branch: chore/dockerize-game
tags: [docker, compose]
created: 2026-10-03
---

# Dockerize the game

## Outcome and scope

Run the existing built frontend, REST API and Socket.IO backend with `docker compose up --build` at http://localhost:8080. Persist SQLite results across container recreation. Keep the current native development workflow and application contracts unchanged. No cloud deployment, database migration, or hot-reload container workflow.

## Reviewed implementation

- Build frontend assets with Node 24, including the existing asset integrity check; serve with unprivileged Nginx and proxy `/api/` and `/socket.io/` to the backend.
- Use Python 3.12 and Gunicorn with one threaded worker, matching Flask-SocketIO's documented deployment and the in-memory room manager.
- Initialize only an absent database using the existing Flask command. Mount a named volume at the existing instance path; do not modify an existing database on startup.
- Exclude dependencies, credentials, local databases, and working documents from build contexts.
- Document start, stop, rebuild, persistence, and single-worker constraints in the existing getting-started guide.

## Acceptance and validation

- [x] `docker compose config` passes; both images build. The frontend build runs
  the existing asset integrity check through `npm run prebuild`, then Vite.
- [x] Fresh SQLite initializes under `app` UID/GID `10001:10001`; the backend
  remains a single threaded Gunicorn worker. Nginx runs as UID `101`.
- [x] The smoke check passes root HTML, the PNG asset, SPA fallback, API
  health/config, Engine.IO polling, WebSocket `101`, and open POST/GET run
  requests through Nginx.
- [x] After `docker compose down` and `up`, the prior run
  `da47c14d-22d1-4cdb-9705-eb5612340b1e` is still returned from SQLite.
- [x] Build-context allowlisting plus the explicit bottom exclusions prevent
  databases from entering the image; the corrected image was checked and has
  no database file. All five Nginx temporary paths use `/tmp`.
- [x] Docker usage and persistence guidance is documented in
  `docs/START_HERE.md`. Verification containers were stopped after testing.

No application behavior changed.

## Risk and rollback

Online rooms live in memory and reset on backend restart. Keep one backend worker and replica. Existing host database stays outside the Docker build; Docker starts with a separate volume. Remove Docker configuration to revert; `docker compose down` preserves saved runs.
