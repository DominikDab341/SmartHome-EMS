from __future__ import annotations

from abc import ABC, abstractmethod

from database.models import StrategyType

from core.domain import EnergyDecision, HomeState


class EnergyManagementStrategy(ABC):
    """Base Strategy interface for energy flow calculations."""

    strategy_type: StrategyType
    label: str

    @abstractmethod
    def calculate_flow(self, state: HomeState) -> EnergyDecision:
        """Return grid and battery flows for the current simulation tick."""


class EcoFriendlyStrategy(EnergyManagementStrategy):
    """Use all available battery power before buying energy from the grid."""

    strategy_type = StrategyType.ECO_FRIENDLY
    label = "Eco Friendly"

    def calculate_flow(self, state: HomeState) -> EnergyDecision:
        surplus = state.production_kwh - state.consumption_kwh
        decision = EnergyDecision(strategy=self.strategy_type)

        if surplus >= 0:
            charge = min(
                surplus,
                state.battery.available_capacity_kwh,
                state.battery.max_charge_rate_kw * state.interval_hours,
            )
            decision.battery_charged_kwh = charge
            decision.grid_sold_kwh = max(0.0, surplus - charge)
            decision.revenue = decision.grid_sold_kwh * state.pricing.grid_sell_price
            decision.note = "Nadwyżka z fotowoltaiki najpierw ładuje baterię."
            return decision

        shortage = abs(surplus)
        discharge = min(
            shortage,
            state.battery.current_charge_kwh,
            state.battery.max_discharge_rate_kw * state.interval_hours,
        )
        decision.battery_discharged_kwh = discharge
        decision.grid_bought_kwh = max(0.0, shortage - discharge)
        decision.cost = decision.grid_bought_kwh * state.pricing.grid_buy_price
        decision.note = (
            "Bateria pokrywa całe możliwe zapotrzebowanie, również poniżej "
            "ustawionej rezerwy bezpieczeństwa."
        )
        return decision


class GridPurchaseStrategy(EnergyManagementStrategy):
    """Buy consumption from the grid and charge the battery to an export threshold."""

    strategy_type = StrategyType.MAXIMIZE_PROFIT
    label = "Full Grid Purchase"

    def calculate_flow(self, state: HomeState) -> EnergyDecision:
        target_charge_kwh = state.battery.total_capacity_kwh * (
            state.battery_export_threshold_percentage / 100
        )
        capacity_to_threshold_kwh = max(
            0.0,
            target_charge_kwh - state.battery.current_charge_kwh,
        )
        charge = min(
            state.production_kwh,
            capacity_to_threshold_kwh,
            state.battery.max_charge_rate_kw * state.interval_hours,
        )
        decision = EnergyDecision(
            strategy=self.strategy_type,
            grid_bought_kwh=state.consumption_kwh,
            grid_sold_kwh=max(0.0, state.production_kwh - charge),
            battery_charged_kwh=charge,
        )
        decision.cost = decision.grid_bought_kwh * state.pricing.grid_buy_price
        decision.revenue = decision.grid_sold_kwh * state.pricing.grid_sell_price
        decision.note = (
            "Całe zużycie domu jest kupowane z sieci. Fotowoltaika ładuje "
            f"baterię do {state.battery_export_threshold_percentage:.0f}%, "
            "a pozostała energia jest oddawana do sieci."
        )
        return decision


class BatteryLifePreservationStrategy(EnergyManagementStrategy):
    """Use full discharge power while preserving the configured 20% reserve."""

    strategy_type = StrategyType.BATTERY_LIFE
    label = "Battery Life Preservation"

    def calculate_flow(self, state: HomeState) -> EnergyDecision:
        surplus = state.production_kwh - state.consumption_kwh
        decision = EnergyDecision(strategy=self.strategy_type)

        if surplus >= 0:
            charge = min(
                surplus,
                state.battery.available_capacity_kwh,
                state.battery.max_charge_rate_kw * state.interval_hours,
            )
            decision.battery_charged_kwh = charge
            decision.grid_sold_kwh = max(0.0, surplus - charge)
            decision.revenue = decision.grid_sold_kwh * state.pricing.grid_sell_price
            decision.note = "Nadwyżka z fotowoltaiki ładuje chroniony magazyn energii."
            return decision

        shortage = abs(surplus)
        discharge = min(
            shortage,
            state.battery.safely_available_discharge_kwh,
            state.battery.max_discharge_rate_kw * state.interval_hours,
        )
        decision.battery_discharged_kwh = discharge
        decision.grid_bought_kwh = max(0.0, shortage - discharge)
        decision.cost = decision.grid_bought_kwh * state.pricing.grid_buy_price
        decision.note = (
            "Bateria używa pełnej dozwolonej mocy rozładowania, ale zatrzymuje "
            f"się na poziomie {state.battery.min_safe_percentage:.0f}%."
        )
        return decision


def strategy_for(strategy_type: StrategyType) -> EnergyManagementStrategy:
    strategies: dict[StrategyType, EnergyManagementStrategy] = {
        StrategyType.MAXIMIZE_PROFIT: GridPurchaseStrategy(),
        StrategyType.ECO_FRIENDLY: EcoFriendlyStrategy(),
        StrategyType.BATTERY_LIFE: BatteryLifePreservationStrategy(),
    }
    return strategies[strategy_type]
