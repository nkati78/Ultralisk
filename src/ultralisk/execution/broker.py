from abc import ABC, abstractmethod

from ultralisk.core.events import FillEvent, OrderEvent, SignalEvent


class LiveBroker(ABC):
    """Interface for a real exchange/broker adapter. Implementations submit
    orders to an external venue and translate venue callbacks into FillEvents."""

    @abstractmethod
    def on_signal_event(self, event: SignalEvent) -> list[OrderEvent]: ...

    @abstractmethod
    def on_order_event(self, event: OrderEvent) -> list[FillEvent]: ...
