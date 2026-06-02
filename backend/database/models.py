import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Float, Integer, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserRole(enum.Enum):
    """Roles available in the SmartHome EMS system."""
    ADMIN = "ADMIN"
    OWNER = "OWNER"
    RESIDENT = "RESIDENT"


class DeviceType(enum.Enum):
    """Supported device categories in the energy simulation."""

    APPLIANCE = "appliance"
    SOLAR = "solar"


class StrategyType(enum.Enum):
    """Energy management strategies exposed through the API."""

    MAXIMIZE_PROFIT = "maximize_profit"
    ECO_FRIENDLY = "eco_friendly"
    BATTERY_LIFE = "battery_life"


class User(Base):
    """Represents a system user tied to a single house."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="userrole", create_type=True),
        nullable=False,
        default=UserRole.RESIDENT,
    )

    # add house_id when house model is ready
    house_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r} role={self.role.value}>"


class Device(Base):
    """A simulated home appliance or renewable production device."""

    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(96), nullable=False, index=True)
    type: Mapped[DeviceType] = mapped_column(
        SAEnum(DeviceType, name="devicetype", create_type=True),
        nullable=False,
        default=DeviceType.APPLIANCE,
    )
    max_power_kw: Mapped[float] = mapped_column(Float, nullable=False)
    current_power_kw: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return (
            f"<Device id={self.id} name={self.name!r} type={self.type.value} "
            f"active={self.is_active}>"
        )


class Battery(Base):
    """Current state of the home battery storage."""

    __tablename__ = "batteries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    total_capacity_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)
    current_charge_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    min_safe_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=20.0)
    max_charge_rate_kw: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)
    max_discharge_rate_kw: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)

    @property
    def state_of_charge_percentage(self) -> float:
        if self.total_capacity_kwh <= 0:
            return 0.0
        return round((self.current_charge_kwh / self.total_capacity_kwh) * 100, 2)


class SystemSettings(Base):
    """Configurable EMS settings controlled by the user."""

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    active_strategy: Mapped[StrategyType] = mapped_column(
        SAEnum(StrategyType, name="strategytype", create_type=True),
        nullable=False,
        default=StrategyType.ECO_FRIENDLY,
    )
    grid_buy_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.95)
    grid_sell_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.45)
    location_name: Mapped[str] = mapped_column(String(96), nullable=False, default="Warsaw")
    latitude: Mapped[float] = mapped_column(Float, nullable=False, default=52.2297)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, default=21.0122)


class EnergyLog(Base):
    """Historical energy flow snapshot used by charts and statistics."""

    __tablename__ = "energy_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    total_consumption_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    total_production_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    grid_bought_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    grid_sold_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    battery_charged_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    battery_discharged_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    revenue: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    strategy: Mapped[StrategyType] = mapped_column(
        SAEnum(StrategyType, name="strategytype", create_type=False),
        nullable=False,
        default=StrategyType.ECO_FRIENDLY,
    )
    weather_cloud_cover: Mapped[float] = mapped_column(Float, nullable=False, default=35.0)
    solar_factor: Mapped[float] = mapped_column(Float, nullable=False, default=0.65)
