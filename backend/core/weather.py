from __future__ import annotations

from datetime import datetime
from math import cos, pi

import httpx

from core.domain import WeatherCondition


class WeatherAdapter:
    """Adapter translating Open-Meteo responses into EMS WeatherCondition."""

    endpoint = "https://api.open-meteo.com/v1/forecast"

    async def get_condition(self, latitude: float, longitude: float) -> WeatherCondition:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "cloud_cover,temperature_2m",
            "timezone": "auto",
        }
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.get(self.endpoint, params=params)
                response.raise_for_status()
                current = response.json()["current"]
        except Exception:
            return self._fallback_condition()

        cloud_cover = float(current.get("cloud_cover", 35.0))
        temperature = float(current.get("temperature_2m", 20.0))
        return WeatherCondition(
            cloud_cover=cloud_cover,
            solar_factor=self._solar_factor(cloud_cover),
            temperature_c=temperature,
        )

    @staticmethod
    def _solar_factor(cloud_cover: float) -> float:
        return round(max(0.08, min(1.0, 1 - (cloud_cover / 100) * 0.85)), 3)

    def _fallback_condition(self) -> WeatherCondition:
        hour = datetime.now().hour
        daylight = max(0.0, cos(((hour - 12) / 12) * pi))
        cloud_cover = 35.0
        return WeatherCondition(
            cloud_cover=cloud_cover,
            solar_factor=round(max(0.1, daylight * self._solar_factor(cloud_cover)), 3),
            temperature_c=21.0,
        )
