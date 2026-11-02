# Karlin_ux — Full-Stack Development Portfolio

A standalone full-stack web application and interactive showcase demonstrating
frontend, backend, database, security and deployment capabilities.

## Structure

- `Backend/` — Django + Django REST Framework API
- `Frontend/` — React + TypeScript + Vite SPA
- `docker-compose.yml` — local/production-like stack

## Quick start (development)

### Backend

```bash
cd Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # edit values
python manage.py migrate
python manage.py seed_showcase
OWNER_EMAIL=owner@karlin.local OWNER_PASSWORD='OwnerPass123!' python manage.py create_owner
python manage.py runserver
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Open http://localhost:5173

## Security

- Secrets only via environment variables; `.env` is git-ignored.
- Run `gitleaks detect --source . --no-git` before committing.
- Backend permissions enforced server-side; workspace isolation tested.

## Tests

```bash
cd Backend && python manage.py test
cd Frontend && npm run build
```

## Deployment

See `docker-compose.yml` and `Backend/Dockerfile`.

## Data separation

- Workspace Admin data is simulated and isolated per user.
- Super Admin sees genuine platform data only.
- Real and simulated data are never mixed.