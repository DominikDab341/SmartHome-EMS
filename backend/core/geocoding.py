from __future__ import annotations

from dataclasses import dataclass

import httpx


class LocationNotFoundError(ValueError):
    """Raised when the geocoding service has no match for a city name."""


class GeocodingServiceError(RuntimeError):
    """Raised when the geocoding service cannot return a usable response."""


@dataclass(frozen=True, slots=True)
class LocationMatch:
    name: str
    latitude: float
    longitude: float


class GeocodingAdapter:
    """Translate a city name into coordinates understood by the weather API."""

    endpoint = "https://geocoding-api.open-meteo.com/v1/search"

    async def resolve(self, city: str) -> LocationMatch:
        params = {
            "name": city,
            "count": 1,
            "language": "pl",
            "format": "json",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(self.endpoint, params=params)
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise GeocodingServiceError(
                "The location service is temporarily unavailable."
            ) from exc

        return self._location_from_payload(payload)

    @staticmethod
    def _location_from_payload(payload: object) -> LocationMatch:
        if not isinstance(payload, dict):
            raise GeocodingServiceError("The location service returned invalid data.")

        results = payload.get("results")
        if not isinstance(results, list) or not results:
            raise LocationNotFoundError("City not found.")

        result = results[0]
        if not isinstance(result, dict):
            raise GeocodingServiceError("The location service returned invalid data.")

        try:
            city_name = str(result["name"]).strip()
            latitude = float(result["latitude"])
            longitude = float(result["longitude"])
        except (KeyError, TypeError, ValueError) as exc:
            raise GeocodingServiceError(
                "The location service returned incomplete data."
            ) from exc

        if not city_name or not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise GeocodingServiceError("The location service returned invalid coordinates.")

        country = str(result.get("country", "")).strip()
        display_name = ", ".join(part for part in (city_name, country) if part)

        return LocationMatch(
            name=display_name[:96],
            latitude=latitude,
            longitude=longitude,
        )


geocoding_adapter = GeocodingAdapter()
