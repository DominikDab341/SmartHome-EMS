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
    """Prefer self-consumption and battery usage before buying grid energy."""

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
            decision.note = "Renewable surplus charged the battery first."
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
        decision.note = "Battery reduced grid consumption."
        return decision


class MaximizeProfitStrategy(EnergyManagementStrategy):
    """Sell surplus aggressively and preserve battery for expensive shortages."""

    strategy_type = StrategyType.MAXIMIZE_PROFIT
    label = "Maximize Profit"

    def calculate_flow(self, state: HomeState) -> EnergyDecision:
        surplus = state.production_kwh - state.consumption_kwh
        decision = EnergyDecision(strategy=self.strategy_type)

        if surplus >= 0:
            charge_limit = state.battery.max_charge_rate_kw * state.interval_hours
            keep_reserve = state.battery.state_of_charge_percentage < 60
            charge = min(surplus * 0.35, state.battery.available_capacity_kwh, charge_limit)
            if not keep_reserve:
                charge = 0.0
            decision.battery_charged_kwh = charge
            decision.grid_sold_kwh = max(0.0, surplus - charge)
            decision.revenue = decision.grid_sold_kwh * state.pricing.grid_sell_price
            decision.note = "Surplus prioritized for sale to the grid."
            return decision

        shortage = abs(surplus)
        discharge = 0.0
        if state.pricing.grid_buy_price > 0.75:
            discharge = min(
                shortage,
                state.battery.safely_available_discharge_kwh,
                state.battery.max_discharge_rate_kw * state.interval_hours,
            )
        decision.battery_discharged_kwh = discharge
        decision.grid_bought_kwh = max(0.0, shortage - discharge)
        decision.cost = decision.grid_bought_kwh * state.pricing.grid_buy_price
        decision.note = "Battery used only when buying energy is expensive."
        return decision


class BatteryLifePreservationStrategy(EnergyManagementStrategy):
    """Minimize battery cycling and never cross a conservative reserve."""

    strategy_type = StrategyType.BATTERY_LIFE
    label = "Battery Life Preservation"

    def calculate_flow(self, state: HomeState) -> EnergyDecision:
        surplus = state.production_kwh - state.consumption_kwh
        decision = EnergyDecision(strategy=self.strategy_type)
        reserve_kwh = max(
            state.battery.min_safe_charge_kwh,
            state.battery.total_capacity_kwh * 0.35,
        )

        if surplus >= 0:
            charge = min(
                surplus,
                state.battery.available_capacity_kwh,
                state.battery.max_charge_rate_kw * state.interval_hours * 0.6,
            )
            decision.battery_charged_kwh = charge
            decision.grid_sold_kwh = max(0.0, surplus - charge)
            decision.revenue = decision.grid_sold_kwh * state.pricing.grid_sell_price
            decision.note = "Battery charged gently to reduce wear."
            return decision

        shortage = abs(surplus)
        safe_discharge = max(0.0, state.battery.current_charge_kwh - reserve_kwh)
        discharge = min(
            shortage * 0.45,
            safe_discharge,
            state.battery.max_discharge_rate_kw * state.interval_hours * 0.6,
        )
        decision.battery_discharged_kwh = discharge
        decision.grid_bought_kwh = max(0.0, shortage - discharge)
        decision.cost = decision.grid_bought_kwh * state.pricing.grid_buy_price
        decision.note = "Battery reserve preserved for longevity."
        return decision


def strategy_for(strategy_type: StrategyType) -> EnergyManagementStrategy:
    strategies: dict[StrategyType, EnergyManagementStrategy] = {
        StrategyType.MAXIMIZE_PROFIT: MaximizeProfitStrategy(),
        StrategyType.ECO_FRIENDLY: EcoFriendlyStrategy(),
        StrategyType.BATTERY_LIFE: BatteryLifePreservationStrategy(),
    }
    return strategies[strategy_type]
