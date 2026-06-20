from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from api.schemas import DeviceCreate
from core.devices import SimulatedDevice
from core.geocoding import (
    GeocodingAdapter,
    GeocodingServiceError,
    LocationNotFoundError,
)
from core.manager import EnergyManager
from core.tariffs import TariffScrapeError, TariffScraper
from core.weather import WeatherAdapter
from database.models import DeviceType, StrategyType

from core.domain import BatteryState, HomeState, PricingState, WeatherCondition
from core.strategies import strategy_for


def _state(
    consumption: float,
    production: float,
    charge: float = 5.0,
    export_threshold: float = 80.0,
) -> HomeState:
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
        battery_export_threshold_percentage=export_threshold,
    )


def test_eco_strategy_uses_battery_below_safety_reserve() -> None:
    decision = strategy_for(StrategyType.ECO_FRIENDLY).calculate_flow(
        _state(2.0, 1.0, charge=2.0)
    )

    assert decision.battery_discharged_kwh == 1.0
    assert decision.grid_bought_kwh == 0


def test_eco_strategy_uses_full_configured_discharge_power() -> None:
    decision = strategy_for(StrategyType.ECO_FRIENDLY).calculate_flow(_state(4.0, 1.0))

    assert decision.battery_discharged_kwh == 3.0
    assert decision.grid_bought_kwh == 0


def test_grid_purchase_strategy_buys_consumption_and_charges_to_threshold() -> None:
    decision = strategy_for(StrategyType.MAXIMIZE_PROFIT).calculate_flow(
        _state(4.0, 4.0, charge=5.0, export_threshold=80.0)
    )

    assert decision.grid_bought_kwh == 4.0
    assert decision.grid_sold_kwh == 1.0
    assert decision.battery_charged_kwh == 3.0
    assert decision.battery_discharged_kwh == 0
    assert decision.cost > 0
    assert decision.revenue > 0


def test_grid_purchase_strategy_exports_everything_above_threshold() -> None:
    decision = strategy_for(StrategyType.MAXIMIZE_PROFIT).calculate_flow(
        _state(2.0, 3.0, charge=8.0, export_threshold=80.0)
    )

    assert decision.grid_bought_kwh == 2.0
    assert decision.grid_sold_kwh == 3.0
    assert decision.battery_charged_kwh == 0


def test_battery_life_strategy_stops_at_twenty_percent() -> None:
    decision = strategy_for(StrategyType.BATTERY_LIFE).calculate_flow(
        _state(3.0, 0.0, charge=2.0)
    )

    assert decision.battery_discharged_kwh == 0
    assert decision.grid_bought_kwh == 3.0


def test_battery_life_strategy_uses_full_power_above_reserve() -> None:
    decision = strategy_for(StrategyType.BATTERY_LIFE).calculate_flow(
        _state(5.0, 0.0, charge=6.0)
    )

    assert decision.battery_discharged_kwh == 3.0
    assert decision.grid_bought_kwh == 2.0


def test_all_strategies_conserve_energy_and_respect_battery_limits() -> None:
    for strategy_type in StrategyType:
        for consumption in (0.0, 0.5, 3.0, 12.0):
            for production in (0.0, 0.5, 3.0, 12.0):
                for charge in (0.0, 2.0, 5.0, 10.0):
                    for interval_hours in (1 / 60, 0.5, 1.0):
                        state = _state(consumption, production, charge)
                        state.interval_hours = interval_hours
                        decision = strategy_for(strategy_type).calculate_flow(state)

                        EnergyManager._validate_decision(state, decision)

                        final_charge = (
                            charge
                            + decision.battery_charged_kwh
                            - decision.battery_discharged_kwh
                        )
                        assert 0 <= final_charge <= state.battery.total_capacity_kwh


def test_battery_protection_never_crosses_reserve() -> None:
    state = _state(20.0, 0.0, charge=2.01)
    decision = strategy_for(StrategyType.BATTERY_LIFE).calculate_flow(state)

    final_charge = state.battery.current_charge_kwh - decision.battery_discharged_kwh
    assert final_charge == pytest.approx(state.battery.min_safe_charge_kwh)


def test_solar_factor_is_zero_at_night() -> None:
    assert WeatherAdapter._solar_factor(0.0, is_day=False) == 0.0
    assert WeatherAdapter._solar_factor(100.0, is_day=False) == 0.0


def test_production_is_zero_when_solar_factor_is_zero() -> None:
    devices = [
        SimpleNamespace(
            type=DeviceType.SOLAR,
            is_active=True,
            max_power_kw=10.0,
        )
    ]

    assert EnergyManager._calculate_production(devices, 0.0, 0.5) == 0.0


def test_consumption_ignores_inactive_and_solar_devices() -> None:
    devices = [
        SimpleNamespace(
            type=DeviceType.APPLIANCE,
            is_active=True,
            current_power_kw=2.0,
        ),
        SimpleNamespace(
            type=DeviceType.APPLIANCE,
            is_active=False,
            current_power_kw=5.0,
        ),
        SimpleNamespace(
            type=DeviceType.SOLAR,
            is_active=True,
            current_power_kw=10.0,
        ),
    ]

    assert EnergyManager._calculate_consumption(devices, 0.5) == 1.0


def test_device_create_rejects_current_power_above_maximum() -> None:
    with pytest.raises(ValidationError):
        DeviceCreate(
            name="Invalid heater",
            type=DeviceType.APPLIANCE,
            max_power_kw=1.0,
            current_power_kw=2.0,
        )


def test_turning_device_off_preserves_configured_power() -> None:
    device = SimulatedDevice(
        name="Heat pump",
        type=DeviceType.APPLIANCE,
        max_power_kw=3.0,
        current_power_kw=2.0,
    )

    device.turn_off()
    assert device.is_active is False
    assert device.current_power_kw == 2.0

    device.turn_on()
    assert device.is_active is True
    assert device.current_power_kw == 2.0


def test_geocoding_payload_is_converted_to_location() -> None:
    location = GeocodingAdapter._location_from_payload(
        {
            "results": [
                {
                    "name": "Gdańsk",
                    "country": "Polska",
                    "latitude": 54.35227,
                    "longitude": 18.64912,
                }
            ]
        }
    )

    assert location.name == "Gdańsk, Polska"
    assert location.latitude == pytest.approx(54.35227)
    assert location.longitude == pytest.approx(18.64912)


def test_geocoding_rejects_empty_results() -> None:
    with pytest.raises(LocationNotFoundError):
        GeocodingAdapter._location_from_payload({"results": []})


def test_geocoding_rejects_invalid_coordinates() -> None:
    with pytest.raises(GeocodingServiceError):
        GeocodingAdapter._location_from_payload(
            {
                "results": [
                    {
                        "name": "Invalid",
                        "latitude": 200,
                        "longitude": 20,
                    }
                ]
            }
        )


def test_pge_tariff_price_is_extracted_from_official_markup() -> None:
    page = (
        "<p>Cena ca&#322;odobowa&nbsp;"
        "<strong class=\"regular\">0,6189</strong>&nbsp;z&#322;/kWh</p>"
    )

    assert TariffScraper._extract_pge_buy_price(page) == pytest.approx(0.6189)


def test_tauron_net_mwh_price_is_converted_to_gross_kwh() -> None:
    page = (
        "<p>Cena energii elektrycznej wyniesie "
        "497 zł netto za megawatogodzinę.</p>"
    )

    assert TariffScraper._extract_tauron_buy_price(page) == pytest.approx(0.6175)


def test_latest_pse_rcem_is_extracted_with_period() -> None:
    page = """
    <table><tbody>
      <tr><th><strong>2026</strong></th></tr>
      <tr><td>kwiecień</td></tr>
      <tr><td>RCEm</td><td>132,92</td><td>11.05.2026</td></tr>
      <tr><td>skorygowana RCEm*</td><td>-</td></tr>
      <tr><td>maj</td></tr>
      <tr><td>RCEm</td><td>191,37</td><td>11.06.2026</td></tr>
      <tr><td>skorygowana RCEm*</td><td>-</td></tr>
    </tbody></table>
    """

    price, period = TariffScraper._extract_latest_rcem(page, 2026)

    assert price == pytest.approx(0.19137)
    assert period == "maj 2026"


def test_corrected_rcem_replaces_original_price_for_latest_period() -> None:
    page = """
    <table><tbody>
      <tr><th><strong>2026</strong></th></tr>
      <tr><td>maj</td></tr>
      <tr><td>RCEm</td><td>191,37</td></tr>
      <tr><td>skorygowana RCEm*</td><td>188,50</td></tr>
    </tbody></table>
    """

    price, period = TariffScraper._extract_latest_rcem(page, 2026)

    assert price == pytest.approx(0.1885)
    assert period == "maj 2026"


def test_tariff_scraper_fails_when_price_is_missing() -> None:
    with pytest.raises(TariffScrapeError):
        TariffScraper._extract_pge_buy_price("<html></html>")
