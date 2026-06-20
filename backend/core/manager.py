from __future__ import annotations

import asyncio

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import (
    Battery,
    Device,
    DeviceType,
    EnergyLog,
    StrategyType,
    SystemSettings,
)

from core.devices import ApplianceFactory
from core.domain import (
    BatteryState,
    DeviceState,
    EnergyDecision,
    EnergySnapshot,
    HomeState,
    PricingState,
    utc_now,
)
from core.strategies import EnergyManagementStrategy, strategy_for
from core.weather import WeatherAdapter


class EnergyManager:
    """Singleton coordinating the Smart Home EMS simulation."""

    _instance: "EnergyManager | None" = None

    def __new__(cls, weather_adapter: WeatherAdapter | None = None) -> "EnergyManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, weather_adapter: WeatherAdapter | None = None) -> None:
        if self._initialized:
            return
        self.weather_adapter = weather_adapter or WeatherAdapter()
        self._last_device_update: DeviceState | None = None
        self._lock = asyncio.Lock()
        self._initialized = True

    def update(self, device_state: DeviceState) -> None:
        """Observer callback used by simulated devices."""
        self._last_device_update = device_state

    async def reset_seed_data(self, db: AsyncSession, user_id: int) -> None:
        """Clear one user's simulation tables and recreate demo data from current code."""
        await db.execute(delete(EnergyLog).where(EnergyLog.user_id == user_id))
        await db.execute(delete(Device).where(Device.user_id == user_id))
        await db.execute(delete(Battery).where(Battery.user_id == user_id))
        await db.execute(delete(SystemSettings).where(SystemSettings.user_id == user_id))
        await db.commit()
        await self.ensure_seed_data(db, user_id)

    async def ensure_seed_data(self, db: AsyncSession, user_id: int) -> None:
        if await db.scalar(select(Battery.id).where(Battery.user_id == user_id).limit(1)) is None:
            db.add(
                Battery(
                    user_id=user_id,
                    total_capacity_kwh=13.5,
                    current_charge_kwh=7.4,
                    min_safe_percentage=20.0,
                    max_charge_rate_kw=3.2,
                    max_discharge_rate_kw=3.2,
                )
            )

        if await db.scalar(
            select(SystemSettings.id).where(SystemSettings.user_id == user_id).limit(1)
        ) is None:
            db.add(
                SystemSettings(
                    user_id=user_id,
                    active_strategy=StrategyType.ECO_FRIENDLY,
                    grid_buy_price=0.95,
                    grid_sell_price=0.42,
                    tariff_provider="PGE",
                    battery_export_threshold_percentage=80.0,
                    location_name="Wroclaw",
                    latitude=51.1078,
                    longitude=17.0385,
                )
            )

        if await db.scalar(select(Device.id).where(Device.user_id == user_id).limit(1)) is None:
            for simulated in ApplianceFactory.default_home():
                db.add(
                    Device(
                        user_id=user_id,
                        name=simulated.name,
                        type=simulated.type,
                        max_power_kw=simulated.max_power_kw,
                        current_power_kw=simulated.current_power_kw,
                        is_active=simulated.is_active,
                    )
                )

        await db.commit()

    async def run_cycle(
        self,
        db: AsyncSession,
        user_id: int,
        interval_seconds: int = 1800,
    ) -> EnergySnapshot:
        """Run one EMS tick and persist the resulting flow snapshot.

        The simulation treats every tick as an interval of energy use. Device
        power is converted from kW to kWh, solar output is estimated from the
        WeatherAdapter, then the selected Strategy decides grid and battery flow.
        """
        if interval_seconds <= 0:
            raise ValueError("Simulation interval must be greater than zero.")

        async with self._lock:
            await self.ensure_seed_data(db, user_id)
            settings = await self._get_settings(db, user_id)
            battery = await self._get_battery(db, user_id)
            devices = list(
                (await db.execute(select(Device).where(Device.user_id == user_id)))
                .scalars()
                .all()
            )
            strategy: EnergyManagementStrategy = strategy_for(settings.active_strategy)

            interval_hours = interval_seconds / 3600
            weather = self.weather_adapter.condition_for_preset(settings.weather_preset)
            if weather is None:
                weather = await self.weather_adapter.get_condition(
                    settings.latitude,
                    settings.longitude,
                )
            consumption_kwh = self._calculate_consumption(devices, interval_hours)
            production_kwh = self._calculate_production(devices, weather.solar_factor, interval_hours)
            battery_state = self._battery_state(battery)
            home_state = HomeState(
                consumption_kwh=consumption_kwh,
                production_kwh=production_kwh,
                battery=battery_state,
                pricing=PricingState(settings.grid_buy_price, settings.grid_sell_price),
                weather=weather,
                interval_hours=interval_hours,
                battery_export_threshold_percentage=(
                    settings.battery_export_threshold_percentage
                ),
            )
            decision = strategy.calculate_flow(home_state)
            self._validate_decision(home_state, decision)

            battery.current_charge_kwh = min(
                battery.total_capacity_kwh,
                max(
                    0.0,
                    battery.current_charge_kwh
                    + decision.battery_charged_kwh
                    - decision.battery_discharged_kwh,
                ),
            )
            log = EnergyLog(
                user_id=user_id,
                interval_seconds=interval_seconds,
                total_consumption_kwh=round(consumption_kwh, 4),
                total_production_kwh=round(production_kwh, 4),
                grid_bought_kwh=round(decision.grid_bought_kwh, 4),
                grid_sold_kwh=round(decision.grid_sold_kwh, 4),
                battery_charged_kwh=round(decision.battery_charged_kwh, 4),
                battery_discharged_kwh=round(decision.battery_discharged_kwh, 4),
                cost=round(decision.cost, 4),
                revenue=round(decision.revenue, 4),
                strategy=decision.strategy,
                weather_cloud_cover=weather.cloud_cover,
                solar_factor=weather.solar_factor,
            )
            db.add(log)
            await db.commit()
            await db.refresh(battery)

            return EnergySnapshot(
                timestamp=utc_now(),
                interval_seconds=interval_seconds,
                total_consumption_kwh=round(consumption_kwh, 4),
                total_production_kwh=round(production_kwh, 4),
                battery_charge_kwh=round(battery.current_charge_kwh, 4),
                battery_soc_percentage=battery.state_of_charge_percentage,
                strategy=decision.strategy,
                weather=weather,
                decision=decision,
            )

    @staticmethod
    def _calculate_consumption(devices: list[Device], interval_hours: float) -> float:
        return sum(
            device.current_power_kw * interval_hours
            for device in devices
            if device.type == DeviceType.APPLIANCE and device.is_active
        )

    @staticmethod
    def _calculate_production(
        devices: list[Device],
        solar_factor: float,
        interval_hours: float,
    ) -> float:
        return sum(
            device.max_power_kw * solar_factor * interval_hours
            for device in devices
            if device.type == DeviceType.SOLAR and device.is_active
        )

    @staticmethod
    def _battery_state(battery: Battery) -> BatteryState:
        if battery.total_capacity_kwh <= 0:
            raise RuntimeError("Battery capacity must be greater than zero.")
        if not 0 <= battery.current_charge_kwh <= battery.total_capacity_kwh:
            raise RuntimeError("Battery charge must remain within its capacity.")
        if not 0 <= battery.min_safe_percentage <= 100:
            raise RuntimeError("Battery safety reserve must be between 0 and 100%.")
        if battery.max_charge_rate_kw <= 0 or battery.max_discharge_rate_kw <= 0:
            raise RuntimeError("Battery charge and discharge rates must be positive.")
        return BatteryState(
            total_capacity_kwh=battery.total_capacity_kwh,
            current_charge_kwh=battery.current_charge_kwh,
            min_safe_percentage=battery.min_safe_percentage,
            max_charge_rate_kw=battery.max_charge_rate_kw,
            max_discharge_rate_kw=battery.max_discharge_rate_kw,
        )

    @staticmethod
    def _validate_decision(
        home_state: HomeState,
        decision: EnergyDecision,
    ) -> None:
        tolerance = 1e-8
        if home_state.interval_hours <= 0:
            raise RuntimeError("Simulation interval must be positive.")
        if home_state.consumption_kwh < 0 or home_state.production_kwh < 0:
            raise RuntimeError("Consumption and production cannot be negative.")
        if (
            home_state.pricing.grid_buy_price < 0
            or home_state.pricing.grid_sell_price < 0
        ):
            raise RuntimeError("Grid prices cannot be negative.")
        if not 0 <= home_state.battery_export_threshold_percentage <= 100:
            raise RuntimeError("Battery export threshold must be between 0 and 100%.")

        flows = {
            "grid bought": decision.grid_bought_kwh,
            "grid sold": decision.grid_sold_kwh,
            "battery charged": decision.battery_charged_kwh,
            "battery discharged": decision.battery_discharged_kwh,
        }
        if any(value < -tolerance for value in flows.values()):
            raise RuntimeError("Energy strategy returned a negative energy flow.")

        max_charge = min(
            home_state.battery.available_capacity_kwh,
            home_state.battery.max_charge_rate_kw * home_state.interval_hours,
        )
        max_discharge = min(
            home_state.battery.current_charge_kwh,
            home_state.battery.max_discharge_rate_kw * home_state.interval_hours,
        )
        if decision.battery_charged_kwh > max_charge + tolerance:
            raise RuntimeError("Energy strategy exceeded the battery charge limit.")
        if decision.battery_discharged_kwh > max_discharge + tolerance:
            raise RuntimeError("Energy strategy exceeded the battery discharge limit.")
        if (
            decision.battery_charged_kwh > tolerance
            and decision.battery_discharged_kwh > tolerance
        ):
            raise RuntimeError("Battery cannot charge and discharge in the same cycle.")

        supplied = (
            home_state.production_kwh
            + decision.grid_bought_kwh
            + decision.battery_discharged_kwh
        )
        used = (
            home_state.consumption_kwh
            + decision.grid_sold_kwh
            + decision.battery_charged_kwh
        )
        if abs(supplied - used) > tolerance:
            raise RuntimeError("Energy strategy does not conserve energy.")

        expected_cost = decision.grid_bought_kwh * home_state.pricing.grid_buy_price
        expected_revenue = decision.grid_sold_kwh * home_state.pricing.grid_sell_price
        if abs(decision.cost - expected_cost) > tolerance:
            raise RuntimeError("Energy strategy calculated an inconsistent grid cost.")
        if abs(decision.revenue - expected_revenue) > tolerance:
            raise RuntimeError("Energy strategy calculated inconsistent grid revenue.")

    @staticmethod
    async def _get_battery(db: AsyncSession, user_id: int) -> Battery:
        battery = await db.scalar(select(Battery).where(Battery.user_id == user_id).limit(1))
        if battery is None:
            raise RuntimeError("Battery seed data was not created.")
        return battery

    @staticmethod
    async def _get_settings(db: AsyncSession, user_id: int) -> SystemSettings:
        settings = await db.scalar(
            select(SystemSettings).where(SystemSettings.user_id == user_id).limit(1)
        )
        if settings is None:
            raise RuntimeError("System settings seed data was not created.")
        return settings


energy_manager = EnergyManager()
