"""Main backtesting loop."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

from ultralisk.analytics.metrics import BacktestResult
from ultralisk.data.provider import DataProvider
from ultralisk.engine.portfolio import Portfolio
from ultralisk.strategies.base import Strategy


@dataclass
class BacktestConfig:
    """Configuration for a backtest run."""

    ticker: str
    start_date: date
    end_date: date
    starting_cash: float = 100_000.0
    commission_per_contract: float = 0.65


class Backtester:
    """Runs a backtest over historical data with one or more strategies."""

    def __init__(
        self,
        config: BacktestConfig,
        provider: DataProvider,
        strategies: Sequence[Strategy],
    ) -> None:
        self.config = config
        self.provider = provider
        self.strategies = strategies
        self.portfolio = Portfolio(config.starting_cash, config.commission_per_contract)

    def run(self) -> BacktestResult:
        """Execute the backtest and return results."""
        dates = self.provider.get_trading_dates(
            self.config.ticker, self.config.start_date, self.config.end_date
        )

        for current_date in dates:
            chain = self.provider.get_chain(self.config.ticker, current_date)
            if chain is None:
                continue

            # Phase 1: Check exits on all open positions
            for position in list(self.portfolio.open_positions):
                strategy = self._strategy_by_name(position.strategy_name)
                if strategy is None:
                    continue
                closing_trade = strategy.should_close(position, chain)
                if closing_trade is not None:
                    self.portfolio.close(position, closing_trade)

            # Phase 2: Check entries
            for strategy in self.strategies:
                new_trades = strategy.scan(chain, self.portfolio.open_positions)
                for trade in new_trades:
                    self.portfolio.open(trade, strategy.name)

            # Phase 3: Mark to market
            self.portfolio.mark_to_market(current_date, chain)

        return BacktestResult(
            equity_curve=dict(self.portfolio.equity_curve),
            closed_positions=list(self.portfolio.closed_positions),
            open_positions=list(self.portfolio.open_positions),
            starting_cash=self.config.starting_cash,
        )

    def _strategy_by_name(self, name: str) -> Strategy | None:
        for s in self.strategies:
            if s.name == name:
                return s
        return None
