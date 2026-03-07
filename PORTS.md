# Port Configuration

| Service         | Port | Locked in                          |
|-----------------|------|------------------------------------|
| Backend (API)   | 3000 | `nodemon.json` env.PORT + `.env` PORT=3000 |
| Frontend (Vite) | 5173 | `client/vite.config.js` port + strictPort |
| PostgreSQL      | 5432 | `docker-compose.yml`               |
| Redis           | 6379 | `docker-compose.yml`               |
| Railway (prod)  | 8080 | Railway injects `PORT=8080` env var; `src/config/index.js` reads it |

## Rules
- Backend local dev is **always** 3000. If 3000 is occupied: `lsof -ti tcp:3000 | xargs kill -9`
- Frontend local dev is **always** 5173. If 5173 is occupied: `lsof -ti tcp:5173 | xargs kill -9`
- `strictPort: true` in vite.config.js means Vite will error (not silently switch ports) if 5173 is taken.
- In production (Railway) the PORT env var overrides the 3000 default automatically.
