# Technology Stack

## Backend
- **Język**: Python 3.11+
- **Framework REST**: FastAPI
- **Serwer ASGI**: Uvicorn
- **ORM**: SQLAlchemy 2.0 (wersja asynchroniczna - `asyncpg`)
- **Migracje**: Alembic
- **Walidacja Danych**: Pydantic v2
- **Klient HTTP**: `httpx` (do połączeń z Open-Meteo)

## Frontend
- **Język**: TypeScript
- **Framework**: React 18
- **Narzędzie do budowania**: Vite
- **Stylowanie**: TailwindCSS + Vanilla CSS (w przypadku Custom Animations)
- **Komunikacja API**: Axios lub Fetch API (zależnie od preferencji agenta Frontendu)
- **Wykresy**: Recharts / Chart.js

## Baza Danych & Infrastruktura
- **Silnik DB**: PostgreSQL 15+
- **Konteneryzacja**: Docker + Docker Compose (do uruchamiania bazy i ewentualnie aplikacji)
