# AI Agent Constitution (System Rules)

Zasady te MUSZĄ być bezwzględnie przestrzegane przez każdego Agenta pracującego nad systemem Smart Home EMS.

## 1. Styl i Standardy Kodu
- **Python (Backend)**: 
  - Używaj typowania w każdym miejscu (Type Hints).
  - Trzymaj się standardu PEP 8 (używaj formattera Black/Ruff).
  - Całość logiki bazowej (OOP) implementuj asynchronicznie (gdzie to konieczne, np. baza danych) używając `asyncio`.
- **TypeScript & React (Frontend)**:
  - Zawsze używaj komponentów funkcyjnych (Functional Components) i hooków. Brak klas w Reakcie.
  - Kod ma być w pełni otypowany. Unikaj typu `any` za wszelką cenę.
  - Wygląd musi być nowoczesny (Dark Mode, Glassmorphism, TailwindCSS).

## 2. Programowanie Obiektowe (OOP)
- Kod logiki Smart Home MUSI wyraźnie implementować wzorce projektowe opisane w `architecture.md`.
- Strategie zarządzania energią muszą być odseparowane i łatwo rozszerzalne.
- Nie duplikuj kodu. Stosuj polimorfizm i dziedziczenie.
- Wstrzykuj zależności (Dependency Injection), szczególnie dla konfiguracji, bazy danych oraz adapterów API.

## 3. Komunikacja i Dokumentacja
- Dokumentuj bardziej skomplikowane algorytmy (np. kalkulację przepływów prądu) w docstringach.
- Zmiany w bazie danych bezwzględnie realizuj za pomocą migracji Alembic. Agentowi NIE WOLNO modyfikować struktury tabel bezpośrednio przez zapytania SQL.

## 4. Ograniczenia i Symulacja
- Pamiętaj, że system tylko **symuluje** przepływy prądu. Oznacza to, że potrzebujesz mechanizmu "Tick", czyli pętli w tle (np. `asyncio.sleep(10)` albo cronjoba w FastAPI), która będzie wywoływała akcje i zapisywała logi do bazy.
