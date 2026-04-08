"""Demo script - run a backtest using the FakeDataProvider (no real data needed)."""

from datetime import date

from ultralisk.data.fake_provider import FakeDataProvider
from ultralisk.engine.backtester import Backtester, BacktestConfig
from ultralisk.strategies.covered_call import CoveredCall
from ultralisk.strategies.iron_condor import IronCondor
from ultralisk.analytics.report import print_summary


def main():
    # Synthetic data provider - no API or files needed
    provider = FakeDataProvider(
        ticker="TEST",
        start_price=450.0,
        daily_drift=0.0003,   # ~7.5% annual upward drift
        base_iv=0.25,          # 25% base IV
        strike_step=5.0,
        seed=42,
    )

    config = BacktestConfig(
        ticker="TEST",
        start_date=date(2023, 1, 3),
        end_date=date(2024, 1, 3),
        starting_cash=100_000.0,
        commission_per_contract=0.65,
    )

    strategies = [
        CoveredCall(delta_target=0.30, min_dte=25, max_dte=45, close_at_profit_pct=0.50),
    ]

    backtester = Backtester(config=config, provider=provider, strategies=strategies)

    print(f"\nRunning backtest: {config.ticker} from {config.start_date} to {config.end_date}")
    print(f"Strategy: Covered Call (30-delta, 25-45 DTE, close at 50% profit)")
    print(f"Starting cash: ${config.starting_cash:,.2f}\n")

    result = backtester.run()
    print_summary(result)


if __name__ == "__main__":
    main()
