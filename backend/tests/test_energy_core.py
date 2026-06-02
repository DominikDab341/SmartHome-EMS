from database.models import StrategyType

from core.domain import BatteryState, HomeState, PricingState, WeatherCondition
from core.strategies import strategy_for


def _state(consumption: float, production: float, charge: float = 5.0) -> HomeState:
    return HomeState(
        consumption_kwh=consumption,
        production_kwh=production,
        battery=BatteryState(
            total_capacity_kwh=10.0,
            current_charge_kwh=charge,
            min_safe_percentage=20.0,
            max_charge_rate_kw=3.0,
            max_discharge_rate_kw=3.0,
        ),
        pricing=PricingState(grid_buy_price=0.95, grid_sell_price=0.45),
        weather=WeatherCondition(cloud_cover=20.0, solar_factor=0.83, temperature_c=22.0),
        interval_hours=1.0,
    )


def test_eco_strategy_uses_battery_before_grid() -> None:
    decision = strategy_for(StrategyType.ECO_FRIENDLY).calculate_flow(_state(4.0, 1.0))

    assert decision.battery_discharged_kwh > 0
    assert decision.grid_bought_kwh == 0


def test_profit_strategy_sells_surplus() -> None:
    decision = strategy_for(StrategyType.MAXIMIZE_PROFIT).calculate_flow(_state(1.0, 4.0, 8.0))

    assert decision.grid_sold_kwh > 0
    assert decision.revenue > 0


def test_battery_life_strategy_keeps_conservative_reserve() -> None:
    decision = strategy_for(StrategyType.BATTERY_LIFE).calculate_flow(_state(8.0, 0.0, 3.6))

    assert decision.battery_discharged_kwh <= 0.6
    assert decision.grid_bought_kwh > 0
