"""Abstract data provider interface."""

from datetime import date
from typing import Protocol

from thesislab.domain import OptionsChain


class DataProvider(Protocol):
    """Interface that any data source must satisfy."""

    def get_chain(self, ticker: str, on_date: date) -> OptionsChain | None:
        """Return the full options chain for ticker as of on_date."""
        ...

    def get_trading_dates(self, ticker: str, start: date, end: date) -> list[date]:
        """Return all dates between start and end for which data exists."""
        ...

    def get_underlying_price(self, ticker: str, on_date: date) -> float | None:
        """Return the closing price of the underlying on the given date."""
        ...
