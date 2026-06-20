from __future__ import annotations

from datetime import datetime, timezone
from math import cos, pi

import httpx

from core.domain import WeatherCondition


class WeatherAdapter:
    """Adapter translating Open-Meteo responses into EMS WeatherCondition."""

    endpoint = "https://api.open-meteo.com/v1/forecast"
    preset_conditions = {
        "sunny": WeatherCondition(
            cloud_cover=5.0,
            solar_factor=0.96,
            temperature_c=27.0,
        ),
        "cloudy": WeatherCondition(
            cloud_cover=82.0,
            solar_factor=0.3,
            temperature_c=15.0,
        ),
        "storm": WeatherCondition(
            cloud_cover=98.0,
            solar_factor=0.1,
            temperature_c=11.0,
        ),
        "night": WeatherCondition(
            cloud_cover=25.0,
            solar_factor=0.0,
            temperature_c=12.0,
        ),
    }

    async def get_condition(self, latitude: float, longitude: float) -> WeatherCondition:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "cloud_cover,temperature_2m,is_day",
            "timezone": "auto",
        }
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.get(self.endpoint, params=params)
                response.raise_for_status()
                current = response.json()["current"]
        except Exception:
            return self._fallback_condition(longitude)

        cloud_cover = float(current.get("cloud_cover", 35.0))
        temperature = float(current.get("temperature_2m", 20.0))
        is_day = bool(int(current.get("is_day", 0)))
        return WeatherCondition(
            cloud_cover=cloud_cover,
            solar_factor=self._solar_factor(cloud_cover, is_day=is_day),
            temperature_c=temperature,
        )

    @staticmethod
    def _solar_factor(cloud_cover: float, *, is_day: bool = True) -> float:
        if not is_day:
            return 0.0
        return round(max(0.08, min(1.0, 1 - (cloud_cover / 100) * 0.85)), 3)

    def _fallback_condition(self, longitude: float) -> WeatherCondition:
        now_utc = datetime.now(timezone.utc)
        utc_hour = now_utc.hour + now_utc.minute / 60
        local_solar_hour = (utc_hour + longitude / 15) % 24
        daylight = max(0.0, cos(((local_solar_hour - 12) / 12) * pi))
        cloud_cover = 35.0
        return WeatherCondition(
            cloud_cover=cloud_cover,
            solar_factor=round(daylight * self._solar_factor(cloud_cover), 3),
            temperature_c=21.0,
        )

    @classmethod
    def condition_for_preset(cls, preset: str) -> WeatherCondition | None:
        condition = cls.preset_conditions.get(preset)
        if condition is None:
            return None
        return WeatherCondition(
            cloud_cover=condition.cloud_cover,
            solar_factor=condition.solar_factor,
            temperature_c=condition.temperature_c,
        )
