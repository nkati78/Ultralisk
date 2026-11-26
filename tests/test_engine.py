from datetime import datetime

from ultralisk.backtest.broker import SimulatedBroker
from ultralisk.core.engine import Engine
from ultralisk.core.events import MarketEvent, OrderSide, SignalEvent
from ultralisk.data.feed import ListDataFeed
from ultralisk.strategy.base import Strategy


class AlwaysBuyStrategy(Strategy):
    def on_market_event(self, event: MarketEvent) -> list[SignalEvent]:
        return [SignalEvent(symbol=event.symbol, timestamp=event.timestamp, side=OrderSide.BUY)]


def test_engine_runs_market_event_through_to_fill() -> None:
    feed = ListDataFeed([MarketEvent(symbol="AAPL", timestamp=datetime.now(), price=100.0)])
    engine = Engine(feed=feed, strategy=AlwaysBuyStrategy(), broker=SimulatedBroker())

    fills = engine.run()

    assert len(fills) == 1
    assert fills[0].symbol == "AAPL"
    assert fills[0].side == OrderSide.BUY
