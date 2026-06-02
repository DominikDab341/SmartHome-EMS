#!/bin/sh
set -e

python - <<'PY'
import asyncio
import os

import asyncpg


async def main() -> None:
    database_url = os.environ["DATABASE_URL"].replace(
        "postgresql+asyncpg://",
        "postgresql://",
        1,
    )
    last_error: Exception | None = None
    for attempt in range(1, 31):
        try:
            connection = await asyncpg.connect(database_url)
            await connection.close()
            print("Database is ready.")
            return
        except Exception as exc:
            last_error = exc
            print(f"Waiting for database ({attempt}/30): {exc}")
            await asyncio.sleep(2)
    raise SystemExit(f"Database did not become ready: {last_error}")


asyncio.run(main())
PY

alembic upgrade head
exec uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --reload-dir /app/api \
  --reload-dir /app/core \
  --reload-dir /app/database \
  --reload-dir /app/alembic \
  --reload-include '*.py'
