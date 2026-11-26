from collections import deque
from typing import Protocol

from ultralisk.core.events import Event, FillEvent, MarketEvent, OrderEvent, SignalEvent


class DataFeed(Protocol):
    def events(self) -> list[MarketEvent]: ...


class Strategy(Protocol):
    def on_market_event(self, event: MarketEvent) -> list[SignalEvent]: ...


class Broker(Protocol):
    def on_signal_event(self, event: SignalEvent) -> list[OrderEvent]: ...
    def on_order_event(self, event: OrderEvent) -> list[FillEvent]: ...


class Engine:
    def __init__(self, feed: DataFeed, strategy: Strategy, broker: Broker) -> None:
        self.feed = feed
        self.strategy = strategy
        self.broker = broker
        self.fills: list[FillEvent] = []

    def run(self) -> list[FillEvent]:
        queue: deque[Event] = deque(self.feed.events())

        while queue:
            event = queue.popleft()

            if isinstance(event, MarketEvent):
                queue.extend(self.strategy.on_market_event(event))
            elif isinstance(event, SignalEvent):
                queue.extend(self.broker.on_signal_event(event))
            elif isinstance(event, OrderEvent):
                queue.extend(self.broker.on_order_event(event))
            elif isinstance(event, FillEvent):
                self.fills.append(event)

        return self.fills
