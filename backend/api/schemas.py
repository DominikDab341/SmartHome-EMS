"""Pydantic schemas for the SmartHome EMS API layer."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from database.models import DeviceType, StrategyType, UserRole


class TokenResponse(BaseModel):
    """Response body returned on successful login."""
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    """Request body for POST /api/auth/register."""
    username: str = Field(min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(min_length=8, description="At least 8 characters")


class ResidentCreateRequest(RegisterRequest):
    """Request body for creating a resident account inside the owner's house."""


class UserPublic(BaseModel):
    """Public representation of a user (no password fields)."""
    id: int
    username: str
    email: str
    role: UserRole
    house_id: int | None = None

    model_config = {"from_attributes": True}


class DeviceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=96)
    type: DeviceType = DeviceType.APPLIANCE
    max_power_kw: float = Field(gt=0, le=25)
    current_power_kw: float = Field(default=0.0, ge=0, le=25)
    is_active: bool = True


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=96)
    type: DeviceType | None = None
    max_power_kw: float | None = Field(default=None, gt=0, le=25)
    current_power_kw: float | None = Field(default=None, ge=0, le=25)
    is_active: bool | None = None


class DevicePublic(BaseModel):
    id: int
    name: str
    type: DeviceType
    max_power_kw: float
    current_power_kw: float
    is_active: bool

    model_config = {"from_attributes": True}


class BatteryPublic(BaseModel):
    id: int
    total_capacity_kwh: float
    current_charge_kwh: float
    min_safe_percentage: float
    max_charge_rate_kw: float
    max_discharge_rate_kw: float
    state_of_charge_percentage: float

    model_config = {"from_attributes": True}


class BatteryUpdate(BaseModel):
    current_charge_kwh: float | None = Field(default=None, ge=0)
    min_safe_percentage: float | None = Field(default=None, ge=0, le=80)
    max_charge_rate_kw: float | None = Field(default=None, gt=0, le=25)
    max_discharge_rate_kw: float | None = Field(default=None, gt=0, le=25)


class SystemSettingsPublic(BaseModel):
    id: int
    active_strategy: StrategyType
    grid_buy_price: float
    grid_sell_price: float
    location_name: str
    latitude: float
    longitude: float

    model_config = {"from_attributes": True}


class SystemSettingsUpdate(BaseModel):
    active_strategy: StrategyType | None = None
    grid_buy_price: float | None = Field(default=None, ge=0)
    grid_sell_price: float | None = Field(default=None, ge=0)
    location_name: str | None = Field(default=None, min_length=2, max_length=96)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class StrategyRequest(BaseModel):
    strategy: StrategyType


class WeatherPublic(BaseModel):
    cloud_cover: float
    solar_factor: float
    temperature_c: float

    model_config = {"from_attributes": True}


class EnergyDecisionPublic(BaseModel):
    strategy: StrategyType
    grid_bought_kwh: float
    grid_sold_kwh: float
    battery_charged_kwh: float
    battery_discharged_kwh: float
    cost: float
    revenue: float
    note: str

    model_config = {"from_attributes": True}


class EnergySnapshotPublic(BaseModel):
    timestamp: datetime
    total_consumption_kwh: float
    total_production_kwh: float
    battery_charge_kwh: float
    battery_soc_percentage: float
    strategy: StrategyType
    weather: WeatherPublic
    decision: EnergyDecisionPublic

    model_config = {"from_attributes": True}


class EnergyLogPublic(BaseModel):
    id: int
    timestamp: datetime
    total_consumption_kwh: float
    total_production_kwh: float
    grid_bought_kwh: float
    grid_sold_kwh: float
    battery_charged_kwh: float
    battery_discharged_kwh: float
    cost: float
    revenue: float
    strategy: StrategyType
    weather_cloud_cover: float
    solar_factor: float

    model_config = {"from_attributes": True}


class DashboardPublic(BaseModel):
    devices: list[DevicePublic]
    battery: BatteryPublic
    settings: SystemSettingsPublic
    latest_log: EnergyLogPublic | None
    logs: list[EnergyLogPublic]
