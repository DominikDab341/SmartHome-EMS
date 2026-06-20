from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
from html import unescape
import re
from typing import Literal

import httpx


TariffProvider = Literal["PGE", "TAURON"]

PGE_TARIFF_URL = "https://www.gkpge.pl/dla-domu/oferta/oferta-taryfowa"
TAURON_TARIFF_URL = (
    "https://media.tauron.pl/pr/862426/"
    "tansza-energia-dla-domu-tauron-z-nizszymi-cenami-pradu-w-2026-roku"
)
PSE_RCEM_URL = "https://www.pse.pl/oire/rcem-rynkowa-miesieczna-cena-energii-elektrycznej"


class TariffScrapeError(RuntimeError):
    """Raised when an official tariff page cannot be parsed safely."""


@dataclass(frozen=True, slots=True)
class TariffQuote:
    provider: TariffProvider
    buy_price_pln_kwh: float
    sell_price_pln_kwh: float
    sell_period: str
    buy_source_url: str
    sell_source_url: str


class TariffScraper:
    """Read G11 purchase prices and the latest prosumer RCEm reference."""

    async def fetch(self, provider: TariffProvider) -> TariffQuote:
        buy_url = PGE_TARIFF_URL if provider == "PGE" else TAURON_TARIFF_URL
        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                headers={"User-Agent": "Wattwise/1.0 tariff updater"},
            ) as client:
                buy_response, sell_response = await asyncio.gather(
                    client.get(buy_url),
                    client.get(PSE_RCEM_URL),
                )
                buy_response.raise_for_status()
                sell_response.raise_for_status()
        except httpx.HTTPError as exc:
            raise TariffScrapeError(
                "Official tariff sources are temporarily unavailable."
            ) from exc

        buy_price = (
            self._extract_pge_buy_price(buy_response.text)
            if provider == "PGE"
            else self._extract_tauron_buy_price(buy_response.text)
        )
        sell_price, sell_period = self._extract_latest_rcem(
            sell_response.text,
            datetime.now().year,
        )
        return TariffQuote(
            provider=provider,
            buy_price_pln_kwh=buy_price,
            sell_price_pln_kwh=sell_price,
            sell_period=sell_period,
            buy_source_url=buy_url,
            sell_source_url=PSE_RCEM_URL,
        )

    @staticmethod
    def _extract_pge_buy_price(page: str) -> float:
        match = re.search(
            r"Cena\s+ca(?:&#322;|ł)odobowa.*?"
            r"<strong[^>]*>\s*([0-9]+[,.][0-9]+)\s*</strong>.*?"
            r"z(?:&#322;|ł)/kWh",
            page,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if match is None:
            raise TariffScrapeError("PGE G11 price was not found.")
        return TariffScraper._price(match.group(1))

    @staticmethod
    def _extract_tauron_buy_price(page: str) -> float:
        plain_text = TariffScraper._plain_text(page)
        match = re.search(
            r"wyniesie\s+([0-9]+(?:[,.][0-9]+)?)\s+zł\s+netto\s+"
            r"za\s+megawatogodzinę",
            plain_text,
            flags=re.IGNORECASE,
        )
        if match is None:
            raise TariffScrapeError("TAURON G11 price was not found.")

        net_price_pln_mwh = TariffScraper._price(match.group(1))
        gross_price_pln_mwh = (net_price_pln_mwh + 5.0) * 1.23
        return round(gross_price_pln_mwh / 1000, 4)

    @staticmethod
    def _extract_latest_rcem(page: str, year: int) -> tuple[float, str]:
        marker = re.search(
            rf"<strong>\s*{year}\s*</strong>",
            page,
            flags=re.IGNORECASE,
        )
        if marker is None:
            raise TariffScrapeError(f"PSE RCEm table for {year} was not found.")

        table_end = page.find("</table>", marker.end())
        if table_end < 0:
            raise TariffScrapeError("PSE RCEm table is incomplete.")

        table = page[marker.start():table_end]
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", table, flags=re.IGNORECASE | re.DOTALL)
        latest: tuple[float, str] | None = None
        current_period = ""

        for row in rows:
            text = TariffScraper._plain_text(row)
            if text and "RCEm" not in text and "cena [" not in text.lower():
                current_period = text
                continue
            if "RCEm" not in text:
                continue
            price_match = re.search(r"RCEm\*?\s+([0-9 ]+[,.][0-9]+)", text)
            if price_match is None:
                continue
            latest = (
                round(TariffScraper._price(price_match.group(1)) / 1000, 5),
                f"{current_period} {year}".strip(),
            )

        if latest is None:
            raise TariffScrapeError("No published PSE RCEm price was found.")
        return latest

    @staticmethod
    def _plain_text(value: str) -> str:
        without_tags = re.sub(r"<[^>]+>", " ", value)
        return " ".join(unescape(without_tags).split())

    @staticmethod
    def _price(value: str) -> float:
        return float(value.replace(" ", "").replace(",", "."))


tariff_scraper = TariffScraper()
