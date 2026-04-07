"""Performance metrics and backtest result container."""

import math
from dataclasses import dataclass
from datetime import date

from ultralisk.domain import ClosedPosition, Position


@dataclass
class BacktestResult:
    """Container for backtest output with computed metrics."""

    equity_curve: dict[date, float]
    closed_positions: list[ClosedPosition]
    open_positions: list[Position]
    starting_cash: float

    @property
    def final_equity(self) -> float:
        if not self.equity_curve:
            return self.starting_cash
        last_date = max(self.equity_curve)
        return self.equity_curve[last_date]

    @property
    def total_return_pct(self) -> float:
        return ((self.final_equity - self.starting_cash) / self.starting_cash) * 100

    @property
    def total_trades(self) -> int:
        return len(self.closed_positions)

    @property
    def win_rate(self) -> float:
        if not self.closed_positions:
            return 0.0
        winners = sum(1 for p in self.closed_positions if p.realized_pnl > 0)
        return (winners / len(self.closed_positions)) * 100

    @property
    def avg_pnl_per_trade(self) -> float:
        if not self.closed_positions:
            return 0.0
        return sum(p.realized_pnl for p in self.closed_positions) / len(self.closed_positions)

    @property
    def total_pnl(self) -> float:
        return sum(p.realized_pnl for p in self.closed_positions)

    @property
    def avg_holding_days(self) -> float:
        if not self.closed_positions:
            return 0.0
        return sum(p.holding_days for p in self.closed_positions) / len(self.closed_positions)

    @property
    def max_drawdown_pct(self) -> float:
        if not self.equity_curve:
            return 0.0
        sorted_dates = sorted(self.equity_curve)
        peak = self.equity_curve[sorted_dates[0]]
        max_dd = 0.0
        for d in sorted_dates:
            equity = self.equity_curve[d]
            peak = max(peak, equity)
            dd = (peak - equity) / peak * 100 if peak > 0 else 0.0
            max_dd = max(max_dd, dd)
        return max_dd

    @property
    def annualized_return(self) -> float:
        if not self.equity_curve:
            return 0.0
        sorted_dates = sorted(self.equity_curve)
        days = (sorted_dates[-1] - sorted_dates[0]).days
        if days <= 0:
            return 0.0
        total_return = self.final_equity / self.starting_cash
        return (total_return ** (365.0 / days) - 1) * 100

    @property
    def sharpe_ratio(self) -> float:
        """Annualized Sharpe ratio assuming 0% risk-free rate."""
        if len(self.equity_curve) < 2:
            return 0.0
        sorted_dates = sorted(self.equity_curve)
        returns = []
        for i in range(1, len(sorted_dates)):
            prev = self.equity_curve[sorted_dates[i - 1]]
            curr = self.equity_curve[sorted_dates[i]]
            if prev > 0:
                returns.append((curr - prev) / prev)

        if not returns:
            return 0.0
        mean_ret = sum(returns) / len(returns)
        variance = sum((r - mean_ret) ** 2 for r in returns) / len(returns)
        std_ret = math.sqrt(variance)
        if std_ret == 0:
            return 0.0
        return (mean_ret / std_ret) * math.sqrt(252)

    @property
    def profit_factor(self) -> float:
        gross_profit = sum(p.realized_pnl for p in self.closed_positions if p.realized_pnl > 0)
        gross_loss = abs(sum(p.realized_pnl for p in self.closed_positions if p.realized_pnl < 0))
        if gross_loss == 0:
            return float("inf") if gross_profit > 0 else 0.0
        return gross_profit / gross_loss

    def by_strategy(self) -> dict[str, list[ClosedPosition]]:
        result: dict[str, list[ClosedPosition]] = {}
        for p in self.closed_positions:
            result.setdefault(p.strategy_name, []).append(p)
        return result
