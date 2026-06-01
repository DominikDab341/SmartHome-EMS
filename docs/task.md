# Task List: Smart Home EMS

## Faza 1: Inicjalizacja i Środowisko
- [ ] Utworzenie struktury katalogów (`backend`, `frontend`, `docker`)
- [ ] Stworzenie `docker-compose.yml` dla bazy danych PostgreSQL
- [ ] Inicjalizacja projektu FastAPI w Pythonie (z `pyproject.toml` lub `requirements.txt`)
- [ ] Inicjalizacja projektu React + TypeScript (Vite) z TailwindCSS

## Faza 2: Backend (Baza Danych i Modele)
- [ ] Konfiguracja połączenia z PostgreSQL (SQLAlchemy asyncpg)
- [ ] Inicjalizacja Alembic do migracji
- [ ] Implementacja modeli bazy danych: `Device`, `Battery`, `SystemSettings`, `EnergyLog`
- [ ] Wygenerowanie i aplikacja pierwszej migracji bazy

## Faza 3: Backend (Logika Biznesowa i Wzorce OOP)
- [ ] Implementacja Wzorca Strategii (`EnergyManagementStrategy`, `MaximizeProfitStrategy`, `EcoFriendlyStrategy`, `BatteryLifePreservationStrategy`)
- [ ] Implementacja Wzorca Obserwatora (urządzenia powiadamiające o zmianie stanu)
- [ ] Implementacja Fabryk (`ApplianceFactory`)
- [ ] Integracja z Open-Meteo (Wzorzec Adaptera)
- [ ] Core: `EnergyManager` (Singleton) nadzorujący całość przepływów

## Faza 4: Backend (API Endpoints)
- [ ] Endpointy urządzeń (CRUD, włączanie/wyłączanie do symulacji)
- [ ] Endpointy magazynu energii (odczyt stanu SoC)
- [ ] Endpointy strategii (wybór trybu z poziomu frontendu)
- [ ] Endpointy statystyk/historii (odczyt logów do wykresów)
- [ ] Endpoint ustawień (zmiana cen prądu)

## Faza 5: Frontend (UI/UX)
- [ ] Przygotowanie podstawowego widoku Dashboard (Dark mode, glassmorphism)
- [ ] Integracja z API z wykorzystaniem React Query / Axios
- [ ] Komponent statusu baterii z płynnymi animacjami (wskazanie %)
- [ ] Karta wyboru strategii systemu
- [ ] Karta produkcji z OZE (Słońce, powiązana z pogodą)
- [ ] Lista urządzeń z symulowanym statusem (On/Off, suwaki symulacji zużycia)
- [ ] Wykres zużycia vs produkcja w czasie

## Faza 6: Testy i Symulacja
- [ ] Dodanie skryptu symulacyjnego, który np. co minutę generuje ruch (zmianę zużycia, warunki pogodowe)
- [ ] Podpięcie bazy i frontendowe obserwowanie reagującego systemu
