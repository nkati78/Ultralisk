"""Protective put strategy - buy OTM puts to hedge downside risk."""

from dataclasses import dataclass

from ultralisk.domain import Leg, OptionType, OptionsChain, Position, Trade


@dataclass
class ProtectivePut:
    """Buy OTM puts as portfolio insurance.

    Targets puts at a specific delta (e.g., -0.20) within a DTE window.
    Closes when profit target is hit, DTE threshold reached, or at expiration.
    """

    name: str = "ProtectivePut"
    delta_target: float = -0.20
    min_dte: int = 25
    max_dte: int = 45
    max_positions: int = 1
    close_at_profit_pct: float = 1.00  # close at 100% profit (put doubled)
    close_at_dte: int = 7
    close_at_loss_pct: float = 0.50  # cut loss at 50%

    def scan(self, chain: OptionsChain, current_positions: list[Position]) -> list[Trade]:
        active = [p for p in current_positions if p.strategy_name == self.name]
        if len(active) >= self.max_positions:
            return []

        candidates = chain.filter(
            option_type=OptionType.PUT,
            min_dte=self.min_dte,
            max_dte=self.max_dte,
            max_strike=chain.underlying_price,
        )
        if not candidates:
            return []

        best = min(candidates, key=lambda c: abs((c.delta or 0) - self.delta_target))
        if best.delta is None:
            return []

        leg = Leg(contract=best, quantity=1)
        premium = -best.mid * 100  # debit paid
        return [Trade(legs=(leg,), trade_date=chain.quote_date, net_premium=premium)]

    def should_close(self, position: Position, chain: OptionsChain) -> Trade | None:
        entry_leg = position.entry_trade.legs[0]
        contract = entry_leg.contract
        dte = contract.dte(chain.quote_date)

        current = self._find_current(contract, chain)

        if dte <= 0:
            close_price = self._intrinsic(contract, chain.underlying_price) if current is None else current.mid
            return self._closing_trade(entry_leg, chain, close_price)

        if current is None:
            return None

        if dte <= self.close_at_dte:
            return self._closing_trade(entry_leg, chain, current.mid)

        entry_cost = abs(position.entry_trade.net_premium)
        current_value = current.mid * 100

        # Profit target
        if entry_cost > 0:
            profit_pct = (current_value - entry_cost) / entry_cost
            if profit_pct >= self.close_at_profit_pct:
                return self._closing_trade(entry_leg, chain, current.mid)

        # Stop loss
        if entry_cost > 0:
            loss_pct = (entry_cost - current_value) / entry_cost
            if loss_pct >= self.close_at_loss_pct:
                return self._closing_trade(entry_leg, chain, current.mid)

        return None

    def _closing_trade(self, entry_leg: Leg, chain: OptionsChain, price: float) -> Trade:
        close_leg = Leg(contract=entry_leg.contract, quantity=-entry_leg.quantity)
        return Trade(
            legs=(close_leg,),
            trade_date=chain.quote_date,
            net_premium=price * 100,  # credit from selling
        )

    def _find_current(self, contract, chain: OptionsChain):
        for c in chain.contracts:
            if (
                c.strike == contract.strike
                and c.expiration == contract.expiration
                and c.option_type == contract.option_type
            ):
                return c
        return None

    def _intrinsic(self, contract, underlying_price: float) -> float:
        return max(0.0, contract.strike - underlying_price)
