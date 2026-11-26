from dataclasses import dataclass
from datetime import datetime
from enum import Enum, auto


class OrderSide(Enum):
    BUY = auto()
    SELL = auto()


@dataclass(frozen=True)
class MarketEvent:
    symbol: str
    timestamp: datetime
    price: float


@dataclass(frozen=True)
class SignalEvent:
    symbol: str
    timestamp: datetime
    side: OrderSide
    strength: float = 1.0


@dataclass(frozen=True)
class OrderEvent:
    symbol: str
    timestamp: datetime
    side: OrderSide
    quantity: float


@dataclass(frozen=True)
class FillEvent:
    symbol: str
    timestamp: datetime
    side: OrderSide
    quantity: float
    fill_price: float


Event = MarketEvent | SignalEvent | OrderEvent | FillEvent
