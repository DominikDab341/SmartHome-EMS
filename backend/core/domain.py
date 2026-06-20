from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from database.models import DeviceType, StrategyType


@dataclass(slots=True)
class WeatherCondition:
    cloud_cover: float
    solar_factor: float
    temperature_c: float


@dataclass(slots=True)
class DeviceState:
    id: int | None
    name: str
    type: DeviceType
    max_power_kw: float
    current_power_kw: float
    is_active: bool

    @property
    def effective_power_kw(self) -> float:
        return self.current_power_kw if self.is_active else 0.0


class DeviceEventType(str, enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    POWER_CHANGED = "power_changed"
    TURNED_ON = "turned_on"
    TURNED_OFF = "turned_off"
    DELETED = "deleted"


@dataclass(slots=True)
class DeviceEvent:
    house_id: int
    action: DeviceEventType
    device: DeviceState
    timestamp: datetime


@dataclass(slots=True)
class BatteryState:
    total_capacity_kwh: float
    current_charge_kwh: float
    min_safe_percentage: float
    max_charge_rate_kw: float
    max_discharge_rate_kw: float

    @property
    def min_safe_charge_kwh(self) -> float:
        return self.total_capacity_kwh * (self.min_safe_percentage / 100)

    @property
    def available_capacity_kwh(self) -> float:
        return max(0.0, self.total_capacity_kwh - self.current_charge_kwh)

    @property
    def safely_available_discharge_kwh(self) -> float:
        return max(0.0, self.current_charge_kwh - self.min_safe_charge_kwh)

    @property
    def state_of_charge_percentage(self) -> float:
        if self.total_capacity_kwh <= 0:
            return 0.0
        return round((self.current_charge_kwh / self.total_capacity_kwh) * 100, 2)


@dataclass(slots=True)
class PricingState:
    grid_buy_price: float
    grid_sell_price: float


@dataclass(slots=True)
class HomeState:
    consumption_kwh: float
    production_kwh: float
    battery: BatteryState
    pricing: PricingState
    weather: WeatherCondition
    interval_hours: float
    battery_export_threshold_percentage: float = 80.0


@dataclass(slots=True)
class EnergyDecision:
    strategy: StrategyType
    grid_bought_kwh: float = 0.0
    grid_sold_kwh: float = 0.0
    battery_charged_kwh: float = 0.0
    battery_discharged_kwh: float = 0.0
    cost: float = 0.0
    revenue: float = 0.0
    note: str = ""


@dataclass(slots=True)
class EnergySnapshot:
    timestamp: datetime
    interval_seconds: int
    total_consumption_kwh: float
    total_production_kwh: float
    battery_charge_kwh: float
    battery_soc_percentage: float
    strategy: StrategyType
    weather: WeatherCondition
    decision: EnergyDecision


class Observer(Protocol):
    def update(self, event: DeviceEvent) -> None:
        """Receive a device domain event."""


class Subject(Protocol):
    def attach(self, observer: Observer) -> None:
        """Attach an observer."""

    def detach(self, observer: Observer) -> None:
        """Detach an observer."""

    def notify(self, action: DeviceEventType) -> None:
        """Notify observers."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
