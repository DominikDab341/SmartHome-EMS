# System Architecture: Smart Home EMS

## 1. High-Level Architecture
System opiera się na architekturze klient-serwer z wykorzystaniem bazy relacyjnej. 
Został podzielony na 3 główne warstwy:
- **Frontend (Client)**: Aplikacja SPA (Single Page Application) w React.
- **Backend (API + Core Logic)**: Aplikacja FastAPI (Python) zarządzająca logiką biznesową (Energy Manager).
- **Database**: PostgreSQL przechowujący stan systemu, urządzenia oraz historię użycia (Energy Logs).

## 2. Pętle i Przepływ Danych (Data Flow)
Rdzeniem systemu jest `EnergyManager`. Cykl działania (np. uruchamiany co minutę w tle):
1. Pobranie danych pogodowych z `WeatherAdapter` (Open-Meteo).
2. Pobranie aktualnego zużycia ze wszystkich aktywnych `Device` (np. Home Appliances).
3. Estymacja produkcji z paneli słonecznych (bazując na pogodzie).
4. Obliczenie bilansu energetycznego (Produkcja - Zużycie).
5. Podjęcie akcji na podstawie aktywnej **Strategii** (np. ładuj baterię / sprzedaj do sieci).
6. Zapisanie zdarzenia i nowego bilansu do tabeli `EnergyLog`.

## 3. Zastosowane Wzorce Projektowe (OOP)
Projekt akademicki wymaga silnego skupienia na paradygmacie obiektowym. Zastosowano:
*   **Strategy**: `EnergyManagementStrategy` -> `MaximizeProfitStrategy`, `EcoFriendlyStrategy`, `BatteryLifePreservationStrategy`.
*   **Observer**: Urządzenia emitują zmiany stanów, `EnergyManager` subskrybuje i aktualizuje system.
*   **Factory Method**: `ApplianceFactory` do dynamicznego instancjonowania sprzętów na podstawie bazy.
*   **Adapter**: `WeatherAdapter` ujednolica interfejs komunikacji z zewnętrznym API pogodowym.
*   **Singleton**: `EnergyManager` gwarantuje pojedynczy punkt sterowania zasilaniem.

## 4. Modele Relacyjne (Baza Danych)
*   **devices**: id, name, type (appliance/solar), max_power_usage, is_active
*   **battery**: id, total_capacity_kwh, current_charge_kwh, min_safe_percentage
*   **settings**: id, active_strategy, grid_buy_price, grid_sell_price
*   **energy_logs**: id, timestamp, total_consumption, total_production, grid_bought, grid_sold, battery_charged, battery_discharged
