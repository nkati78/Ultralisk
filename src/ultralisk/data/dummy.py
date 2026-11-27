import random
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class DummySecurity:
    ticker: str
    security_id: str
    listed: date
    delisted: date | None = None


DEFAULT_SECURITIES: tuple[DummySecurity, ...] = (
    DummySecurity("AAA", "SEC0001", date(2020, 1, 1)),
    DummySecurity("BBB", "SEC0002", date(2020, 1, 1)),
    DummySecurity("CCC", "SEC0003", date(2020, 1, 1)),
    DummySecurity("DDD", "SEC0004", date(2020, 1, 1)),
    DummySecurity("EEE", "SEC0005", date(2020, 1, 1)),
    DummySecurity("FFF", "SEC0006", date(2020, 1, 1)),
    DummySecurity("GGG", "SEC0007", date(2020, 1, 1), delisted=date(2024, 6, 30)),
    DummySecurity("HHH", "SEC0008", date(2023, 1, 1)),
)


class DummyDataProvider:
    """Deterministic synthetic stand-in for real universe, symbology, and market data vendors.

    Prices are a seeded random walk from each security's listing date, so the price on a
    given day never depends on the as-of date it was requested for (point-in-time safe).
    """

    def __init__(self, securities: tuple[DummySecurity, ...] = DEFAULT_SECURITIES, seed: int = 0) -> None:
        self._securities = securities
        self._by_id = {s.security_id: s for s in securities}
        self._seed = seed

    def constituents(self, as_of: date) -> list[str]:
        return [
            s.ticker
            for s in self._securities
            if s.listed <= as_of and (s.delisted is None or as_of < s.delisted)
        ]

    def symbology(self, tickers: list[str]) -> dict[str, str]:
        by_ticker = {s.ticker: s.security_id for s in self._securities}
        return {t: by_ticker[t] for t in tickers}

    def price_history(self, security_id: str, as_of: date, lookback: int) -> list[float]:
        security = self._by_id[security_id]
        end = as_of if security.delisted is None else min(as_of, security.delisted)
        rng = random.Random(f"{self._seed}:{security_id}")
        price = 100.0
        prices: list[float] = []
        day = security.listed
        while day <= end:
            price *= 1 + rng.gauss(0.0003, 0.02)
            prices.append(price)
            day += timedelta(days=1)
        return prices[-lookback:]
