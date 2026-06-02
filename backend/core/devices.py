from __future__ import annotations

from dataclasses import dataclass, field

from database.models import DeviceType

from core.domain import DeviceState, Observer


@dataclass
class SimulatedDevice:
    """Observer Subject used by the EnergyManager simulation."""

    name: str
    type: DeviceType
    max_power_kw: float
    id: int | None = None
    current_power_kw: float = 0.0
    is_active: bool = True
    _observers: list[Observer] = field(default_factory=list, init=False, repr=False)

    def attach(self, observer: Observer) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        if observer in self._observers:
            self._observers.remove(observer)

    def notify(self) -> None:
        state = self.to_state()
        for observer in self._observers:
            observer.update(state)

    def turn_on(self) -> None:
        self.is_active = True
        if self.current_power_kw <= 0:
            self.current_power_kw = self.max_power_kw
        self.notify()

    def turn_off(self) -> None:
        self.is_active = False
        self.current_power_kw = 0.0
        self.notify()

    def set_power(self, power_kw: float) -> None:
        self.current_power_kw = max(0.0, min(power_kw, self.max_power_kw))
        self.notify()

    def to_state(self) -> DeviceState:
        return DeviceState(
            id=self.id,
            name=self.name,
            type=self.type,
            max_power_kw=self.max_power_kw,
            current_power_kw=self.current_power_kw,
            is_active=self.is_active,
        )


class ApplianceFactory:
    """Factory Method for creating appliance instances from symbolic names."""

    _templates: dict[str, tuple[str, DeviceType, float, float]] = {
        "fridge": ("Fridge", DeviceType.APPLIANCE, 0.18, 0.12),
        "washer": ("Washing Machine", DeviceType.APPLIANCE, 2.0, 1.4),
        "heat_pump": ("Heat Pump", DeviceType.APPLIANCE, 3.2, 2.1),
        "oven": ("Oven", DeviceType.APPLIANCE, 2.4, 1.9),
        "ev_charger": ("EV Charger", DeviceType.APPLIANCE, 7.4, 0.0),
        "solar": ("PV Array", DeviceType.SOLAR, 5.5, 0.0),
    }

    @classmethod
    def create_appliance(cls, appliance_type: str) -> SimulatedDevice:
        try:
            name, device_type, max_power_kw, current_power_kw = cls._templates[appliance_type]
        except KeyError as exc:
            raise ValueError(f"Unknown appliance type: {appliance_type}") from exc
        return SimulatedDevice(
            name=name,
            type=device_type,
            max_power_kw=max_power_kw,
            current_power_kw=current_power_kw,
            is_active=current_power_kw > 0 or device_type == DeviceType.SOLAR,
        )

    @classmethod
    def default_home(cls) -> list[SimulatedDevice]:
        return [
            cls.create_appliance("fridge"),
            cls.create_appliance("heat_pump"),
            cls.create_appliance("washer"),
            cls.create_appliance("ev_charger"),
            cls.create_appliance("solar"),
        ]
