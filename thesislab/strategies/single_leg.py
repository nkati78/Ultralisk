"""Single-leg option strategies - long/short call or put."""

from dataclasses import dataclass
from enum import Enum

from thesislab.domain import Leg, OptionType, OptionsChain, Position, Trade
from thesislab.strategies.utils import find_current_contract, intrinsic_value


class LegDirection(Enum):
    LONG_CALL = "long_call"
    LONG_PUT = "long_put"
    SHORT_CALL = "short_call"
    SHORT_PUT = "short_put"


@dataclass
class SingleLeg:
    """Single option leg strategy."""

    name: str = "SingleLeg"
    leg_direction: LegDirection = LegDirection.LONG_CALL
    short_delta: float = 0.30  # target delta magnitude
    min_dte: int = 25
    max_dte: int = 45
    max_positions: int = 1
    close_at_profit_pct: float = 0.50
    close_at_loss_pct: float = 1.00
    close_at_dte: int = 7

    def scan(self, chain: OptionsChain, current_positions: list[Position]) -> list[Trade]:
        active = [p for p in current_positions if p.strategy_name == self.name]
        if len(active) >= self.max_positions:
            return []

        is_call = self.leg_direction in (LegDirection.LONG_CALL, LegDirection.SHORT_CALL)
        is_long = self.leg_direction in (LegDirection.LONG_CALL, LegDirection.LONG_PUT)
        opt_type = OptionType.CALL if is_call else OptionType.PUT

        candidates = chain.filter(
            option_type=opt_type,
            min_dte=self.min_dte,
            max_dte=self.max_dte,
        )
        if not candidates:
            return []

        # Find contract closest to target delta
        contract = min(candidates, key=lambda c: abs(abs(c.delta or 0) - self.short_delta))
        if contract.delta is None:
            return []

        qty = 1 if is_long else -1
        legs = (Leg(contract=contract, quantity=qty),)
        premium = contract.mid * 100
        net_premium = premium if not is_long else -premium

        return [Trade(legs=legs, trade_date=chain.quote_date, net_premium=net_premium)]

    def should_close(self, position: Position, chain: OptionsChain) -> Trade | None:
        legs = position.entry_trade.legs
        dte = min(leg.contract.dte(chain.quote_date) for leg in legs)

        if dte <= 0:
            return self._close_at_expiration(position, chain)

        if dte <= self.close_at_dte:
            return self._close_position(position, chain)

        current = find_current_contract(legs[0].contract, chain)
        if current is None:
            return None

        current_value = current.mid * 100
        entry_premium = position.entry_trade.net_premium
        is_long = self.leg_direction in (LegDirection.LONG_CALL, LegDirection.LONG_PUT)

        if is_long:
            entry_cost = abs(entry_premium)
            if entry_cost == 0:
                return None
            pnl_pct = (current_value - entry_cost) / entry_cost
            if pnl_pct >= self.close_at_profit_pct:
                return self._close_position(position, chain)
            if pnl_pct <= -self.close_at_loss_pct:
                return self._close_position(position, chain)
        else:
            entry_credit = entry_premium
            if entry_credit <= 0:
                return None
            profit = entry_credit - current_value
            if profit / entry_credit >= self.close_at_profit_pct:
                return self._close_position(position, chain)
            if current_value / entry_credit >= (1 + self.close_at_loss_pct):
                return self._close_position(position, chain)

        return None

    def _close_position(self, position: Position, chain: OptionsChain) -> Trade:
        close_legs = tuple(
            Leg(contract=leg.contract, quantity=-leg.quantity)
            for leg in position.entry_trade.legs
        )
        current = find_current_contract(position.entry_trade.legs[0].contract, chain)
        value = (current.mid * 100) if current else 0.0
        is_long = self.leg_direction in (LegDirection.LONG_CALL, LegDirection.LONG_PUT)
        premium = value if is_long else -value
        return Trade(legs=close_legs, trade_date=chain.quote_date, net_premium=premium)

    def _close_at_expiration(self, position: Position, chain: OptionsChain) -> Trade:
        close_legs = tuple(
            Leg(contract=leg.contract, quantity=-leg.quantity)
            for leg in position.entry_trade.legs
        )
        value = sum(
            leg.quantity * intrinsic_value(leg.contract, chain.underlying_price) * 100
            for leg in position.entry_trade.legs
        )
        return Trade(legs=close_legs, trade_date=chain.quote_date, net_premium=value)
