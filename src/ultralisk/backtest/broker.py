from ultralisk.core.events import FillEvent, OrderEvent, SignalEvent


class SimulatedBroker:
    """Fills orders immediately at the signal's reference price, with no slippage or fees."""

    def __init__(self, order_quantity: float = 1.0) -> None:
        self.order_quantity = order_quantity

    def on_signal_event(self, event: SignalEvent) -> list[OrderEvent]:
        return [
            OrderEvent(
                symbol=event.symbol,
                timestamp=event.timestamp,
                side=event.side,
                quantity=self.order_quantity,
            )
        ]

    def on_order_event(self, event: OrderEvent) -> list[FillEvent]:
        return [
            FillEvent(
                symbol=event.symbol,
                timestamp=event.timestamp,
                side=event.side,
                quantity=event.quantity,
                fill_price=0.0,
            )
        ]
