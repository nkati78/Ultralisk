from abc import ABC, abstractmethod

from ultralisk.core.events import MarketEvent


class DataFeed(ABC):
    @abstractmethod
    def events(self) -> list[MarketEvent]: ...


class ListDataFeed(DataFeed):
    """A DataFeed backed by an in-memory list of MarketEvents, useful for tests and backtests."""

    def __init__(self, events: list[MarketEvent]) -> None:
        self._events = events

    def events(self) -> list[MarketEvent]:
        return list(self._events)
