from abc import ABC, abstractmethod

from ultralisk.core.events import MarketEvent, SignalEvent


class Strategy(ABC):
    @abstractmethod
    def on_market_event(self, event: MarketEvent) -> list[SignalEvent]: ...
