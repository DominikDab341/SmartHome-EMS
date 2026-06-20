from __future__ import annotations

from dataclasses import dataclass, field

from database.models import Device, DeviceType

from core.domain import DeviceEvent, DeviceEventType, DeviceState, Observer, utc_now


@dataclass
class SimulatedDevice:
    """Observer Subject used by the EnergyManager simulation."""

    name: str
    type: DeviceType
    max_power_kw: float
    house_id: int = 0
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

    def notify(self, action: DeviceEventType) -> None:
        event = DeviceEvent(
            house_id=self.house_id,
            action=action,
            device=self.to_state(),
            timestamp=utc_now(),
        )
        for observer in self._observers:
            observer.update(event)

    def turn_on(self, *, notify: bool = True) -> None:
        self.is_active = True
        if self.type == DeviceType.SOLAR:
            self.current_power_kw = 0.0
        elif self.current_power_kw <= 0:
            self.current_power_kw = min(
                self.max_power_kw,
                max(0.1, self.max_power_kw * 0.65),
            )
        if notify:
            self.notify(DeviceEventType.TURNED_ON)

    def turn_off(self, *, notify: bool = True) -> None:
        self.is_active = False
        if notify:
            self.notify(DeviceEventType.TURNED_OFF)

    def set_power(self, power_kw: float, *, notify: bool = True) -> None:
        self.current_power_kw = max(0.0, min(power_kw, self.max_power_kw))
        if self.type == DeviceType.APPLIANCE:
            self.is_active = self.current_power_kw > 0
        if notify:
            self.notify(DeviceEventType.POWER_CHANGED)

    def reconfigure(
        self,
        *,
        name: str,
        device_type: DeviceType,
        max_power_kw: float,
        current_power_kw: float,
        is_active: bool,
        notify: bool = True,
    ) -> None:
        if current_power_kw > max_power_kw:
            raise ValueError("Current power cannot exceed maximum power")
        self.name = name
        self.type = device_type
        self.max_power_kw = max_power_kw
        self.current_power_kw = 0.0 if device_type == DeviceType.SOLAR else current_power_kw
        self.is_active = is_active
        if notify:
            self.notify(DeviceEventType.UPDATED)

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

    @staticmethod
    def from_persisted_device(device: Device) -> SimulatedDevice:
        if device.user_id is None:
            raise ValueError("Persisted device must belong to a house")
        return SimulatedDevice(
            id=device.id,
            house_id=device.user_id,
            name=device.name,
            type=device.type,
            max_power_kw=device.max_power_kw,
            current_power_kw=device.current_power_kw,
            is_active=device.is_active,
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
