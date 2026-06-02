# Smart Home EMS

Projekt systemu zarządzania energią w domu inteligentnym zgodny z dokumentacją SDD z folderu `docs`.

## Zakres

- Backend FastAPI z asynchronicznym SQLAlchemy, Alembic i PostgreSQL.
- Modele: użytkownicy, urządzenia, bateria, ustawienia systemu i logi energii.
- Wzorce OOP: Strategy, Observer, Factory Method, Adapter i Singleton.
- Symulacja przepływu energii z zapisem historii do bazy.
- Integracja pogodowa przez adapter Open-Meteo z fallbackiem offline.
- Dashboard React + TypeScript z baterią, strategią, urządzeniami i historią zużycia/produkcji.

## Uruchomienie

Backend i baza:

```bash
docker compose up -d --build
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Adresy:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Przydatne komendy

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest tests/test_energy_core.py
alembic upgrade head
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Główne endpointy EMS

- `GET /api/ems/dashboard`
- `GET /api/ems/devices`
- `POST /api/ems/devices`
- `PATCH /api/ems/devices/{device_id}`
- `POST /api/ems/devices/{device_id}/toggle`
- `GET /api/ems/battery`
- `PATCH /api/ems/battery`
- `GET /api/ems/settings`
- `PATCH /api/ems/settings`
- `POST /api/ems/strategy`
- `GET /api/ems/logs`
- `POST /api/ems/simulation/tick`
