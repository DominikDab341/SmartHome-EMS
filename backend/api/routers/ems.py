from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_owner, get_current_user, house_scope_id
from api.schemas import (
    BatteryPublic,
    BatteryUpdate,
    DashboardPublic,
    DeviceCreate,
    DevicePublic,
    DeviceUpdate,
    EnergyLogPublic,
    EnergySnapshotPublic,
    StrategyRequest,
    SystemSettingsPublic,
    SystemSettingsUpdate,
)
from core.manager import energy_manager
from database.database import get_db
from database.models import Battery, Device, DeviceType, EnergyLog, SystemSettings, User


router = APIRouter(prefix="/api/ems", tags=["ems"])


@router.post("/seed", status_code=status.HTTP_204_NO_CONTENT)
async def seed_demo_data(
    reset: bool = False,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> None:
    house_id = house_scope_id(current_owner)
    if reset:
        await energy_manager.reset_seed_data(db, house_id)
        return
    await energy_manager.ensure_seed_data(db, house_id)


@router.get("/dashboard", response_model=DashboardPublic)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardPublic:
    house_id = house_scope_id(current_user)
    await energy_manager.ensure_seed_data(db, house_id)
    devices = list(
        (
            await db.execute(
                select(Device).where(Device.user_id == house_id).order_by(Device.id)
            )
        )
        .scalars()
        .all()
    )
    battery = await _get_battery(db, house_id)
    settings = await _get_settings(db, house_id)
    logs = list(
        (
            await db.execute(
                select(EnergyLog)
                .where(EnergyLog.user_id == house_id)
                .order_by(desc(EnergyLog.timestamp))
                .limit(24)
            )
        )
        .scalars()
        .all()
    )
    return DashboardPublic(
        devices=[DevicePublic.model_validate(device) for device in devices],
        battery=BatteryPublic.model_validate(battery),
        settings=SystemSettingsPublic.model_validate(settings),
        latest_log=EnergyLogPublic.model_validate(logs[0]) if logs else None,
        logs=[EnergyLogPublic.model_validate(log) for log in reversed(logs)],
    )


@router.get("/devices", response_model=list[DevicePublic])
async def list_devices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DevicePublic]:
    house_id = house_scope_id(current_user)
    await energy_manager.ensure_seed_data(db, house_id)
    devices = list(
        (
            await db.execute(
                select(Device).where(Device.user_id == house_id).order_by(Device.id)
            )
        )
        .scalars()
        .all()
    )
    return [DevicePublic.model_validate(device) for device in devices]


@router.post("/devices", response_model=DevicePublic, status_code=status.HTTP_201_CREATED)
async def create_device(
    body: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> DevicePublic:
    house_id = house_scope_id(current_owner)
    await energy_manager.ensure_seed_data(db, house_id)
    payload = body.model_dump()
    if payload["type"] == DeviceType.SOLAR:
        payload["current_power_kw"] = 0.0
    device = Device(user_id=house_id, **payload)
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return DevicePublic.model_validate(device)


@router.patch("/devices/{device_id}", response_model=DevicePublic)
async def update_device(
    device_id: int,
    body: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> DevicePublic:
    device = await _get_device(db, device_id, house_scope_id(current_owner))
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(device, key, value)
    if device.type == DeviceType.SOLAR:
        device.current_power_kw = 0.0
    if device.current_power_kw > device.max_power_kw:
        device.current_power_kw = device.max_power_kw
    await db.commit()
    await db.refresh(device)
    return DevicePublic.model_validate(device)


@router.post("/devices/{device_id}/toggle", response_model=DevicePublic)
async def toggle_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> DevicePublic:
    device = await _get_device(db, device_id, house_scope_id(current_owner))
    device.is_active = not device.is_active
    if not device.is_active:
        device.current_power_kw = 0.0
    elif device.current_power_kw == 0:
        device.current_power_kw = min(device.max_power_kw, max(0.1, device.max_power_kw * 0.65))
    await db.commit()
    await db.refresh(device)
    return DevicePublic.model_validate(device)


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> None:
    device = await _get_device(db, device_id, house_scope_id(current_owner))
    await db.delete(device)
    await db.commit()


@router.get("/battery", response_model=BatteryPublic)
async def get_battery_state(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BatteryPublic:
    house_id = house_scope_id(current_user)
    await energy_manager.ensure_seed_data(db, house_id)
    return BatteryPublic.model_validate(await _get_battery(db, house_id))


@router.patch("/battery", response_model=BatteryPublic)
async def update_battery(
    body: BatteryUpdate,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> BatteryPublic:
    battery = await _get_battery(db, house_scope_id(current_owner))
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(battery, key, value)
    battery.current_charge_kwh = min(battery.current_charge_kwh, battery.total_capacity_kwh)
    await db.commit()
    await db.refresh(battery)
    return BatteryPublic.model_validate(battery)


@router.get("/settings", response_model=SystemSettingsPublic)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SystemSettingsPublic:
    house_id = house_scope_id(current_user)
    await energy_manager.ensure_seed_data(db, house_id)
    return SystemSettingsPublic.model_validate(await _get_settings(db, house_id))


@router.patch("/settings", response_model=SystemSettingsPublic)
async def update_settings(
    body: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> SystemSettingsPublic:
    settings = await _get_settings(db, house_scope_id(current_owner))
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return SystemSettingsPublic.model_validate(settings)


@router.post("/strategy", response_model=SystemSettingsPublic)
async def set_strategy(
    body: StrategyRequest,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> SystemSettingsPublic:
    settings = await _get_settings(db, house_scope_id(current_owner))
    settings.active_strategy = body.strategy
    energy_manager.set_strategy(body.strategy)
    await db.commit()
    await db.refresh(settings)
    return SystemSettingsPublic.model_validate(settings)


@router.get("/logs", response_model=list[EnergyLogPublic])
async def list_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EnergyLogPublic]:
    house_id = house_scope_id(current_user)
    bounded_limit = max(1, min(limit, 200))
    logs = list(
        (
            await db.execute(
                select(EnergyLog)
                .where(EnergyLog.user_id == house_id)
                .order_by(desc(EnergyLog.timestamp))
                .limit(bounded_limit)
            )
        )
        .scalars()
        .all()
    )
    return [EnergyLogPublic.model_validate(log) for log in reversed(logs)]


@router.post("/simulation/tick", response_model=EnergySnapshotPublic)
async def run_simulation_tick(
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> EnergySnapshotPublic:
    snapshot = await energy_manager.run_cycle(db, house_scope_id(current_owner))
    return EnergySnapshotPublic.model_validate(snapshot)


async def _get_device(db: AsyncSession, device_id: int, user_id: int) -> Device:
    device = await db.scalar(
        select(Device).where(Device.id == device_id, Device.user_id == user_id)
    )
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


async def _get_battery(db: AsyncSession, user_id: int) -> Battery:
    battery = await db.scalar(select(Battery).where(Battery.user_id == user_id).limit(1))
    if battery is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Battery not found")
    return battery


async def _get_settings(db: AsyncSession, user_id: int) -> SystemSettings:
    settings = await db.scalar(
        select(SystemSettings).where(SystemSettings.user_id == user_id).limit(1)
    )
    if settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settings not found")
    return settings
