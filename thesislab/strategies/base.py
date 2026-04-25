"""Strategy interface definition."""

from typing import Protocol

from thesislab.domain import CloseSignal, OptionsChain, Position, Trade


class Strategy(Protocol):
    """Interface every strategy must implement."""

    name: str

    def scan(self, chain: OptionsChain, current_positions: list[Position]) -> list[Trade]:
        """Given today's chain and existing positions, return trades to open."""
        ...

    def should_close(self, position: Position, chain: OptionsChain) -> CloseSignal | None:
        """Decide whether to close an open position. Return CloseSignal or None."""
        ...
