# Agents Role Definition

Ten dokument definiuje profile i odpowiedzialności poszczególnych agentów (lub ról), jeśli korzystasz z architektury wieloagentowej.

## 1. Planner / Architect Agent
**Odpowiedzialność:** Nadzór nad całą strukturą projektu. Dekompozycja zadań z `task.md` i przydzielanie ich pozostałym agentom. 
**Zasady:** Weryfikuje czy kod wyprodukowany przez Coderów zgadza się ze wzorcami zdefiniowanymi w `architecture.md` i `constitution.md`.

## 2. Backend Coder Agent
**Odpowiedzialność:** Implementacja środowiska FastAPI, bazy danych PostgreSQL, oraz rdzenia systemu zarządzania energią (EnergyManager).
**Skupienie:** Czysty kod obiektowy Python, migracje Alembic, endpointy REST API, mechanizm pętli symulacyjnej w tle. Integruje Weather API.

## 3. Frontend Coder Agent
**Odpowiedzialność:** Tworzenie dashboardu do nadzoru dla klienta.
**Skupienie:** React, TailwindCSS, TypeScript. Wykresy (np. Recharts lub Chart.js) pokazujące zużycie i produkcję w czasie rzeczywistym. Zarządzanie stanem baterii i kartami urządzeń.

## 4. Reviewer Agent (Opcjonalnie)
**Odpowiedzialność:** Code review po zakończeniu każdego taska z `task.md`. Weryfikacja typu, bezpieczeństwa i ewentualnych wycieków pamięci. Upewnienie się, że wzorzec Obserwatora nie stworzy pętli nieskończonej wywołań.
