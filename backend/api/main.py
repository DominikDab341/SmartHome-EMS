from contextlib import asynccontextmanager
import asyncio

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from api.routers import auth, ems, users
from core.manager import energy_manager
from database.config import settings
from database.database import SessionLocal, engine, get_db
from database.models import User


def _house_ids_for_users(users: list[User]) -> list[int]:
    return sorted({user.house_id or user.id for user in users})


async def _simulation_loop() -> None:
    while True:
        await asyncio.sleep(settings.SIMULATION_INTERVAL_SECONDS)
        try:
            async with SessionLocal() as db:
                db_users = list((await db.execute(select(User))).scalars().all())
                for house_id in _house_ids_for_users(db_users):
                    await energy_manager.run_cycle(
                        db,
                        house_id,
                        settings.SIMULATION_INTERVAL_SECONDS,
                    )
        except (SQLAlchemyError, RuntimeError):
            continue


async def _seed_existing_users() -> None:
    async with SessionLocal() as db:
        db_users = list((await db.execute(select(User))).scalars().all())
        for house_id in _house_ids_for_users(db_users):
            await energy_manager.ensure_seed_data(db, house_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await _seed_existing_users()
    except SQLAlchemyError:
        pass
    task = asyncio.create_task(_simulation_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    await engine.dispose()


app = FastAPI(title="SmartHome EMS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(ems.router)
app.include_router(users.router)


@app.get("/")
async def root():
    return {"message": "Smart Home EMS API", "docs": "/docs"}


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "db": str(e)},
        )
