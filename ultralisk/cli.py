"""Command-line interface for running backtests."""

import argparse
import sys
from datetime import datetime

from ultralisk.analytics.report import print_summary
from ultralisk.data.csv_provider import CsvDataProvider
from ultralisk.engine.backtester import Backtester, BacktestConfig
from ultralisk.strategies import STRATEGY_REGISTRY
from ultralisk.strategies.vertical_spread import SpreadDirection


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="ultralisk",
        description="Options trading backtesting tool",
    )
    parser.add_argument("--ticker", "-t", required=True, help="Underlying ticker symbol (e.g., AAPL)")
    parser.add_argument("--start", "-s", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", "-e", required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--data", "-d", required=True, help="Path to CSV data file")
    parser.add_argument(
        "--strategy",
        action="append",
        required=True,
        choices=list(STRATEGY_REGISTRY.keys()),
        help="Strategy to backtest (can specify multiple)",
    )
    parser.add_argument("--cash", type=float, default=100_000.0, help="Starting cash (default: 100000)")
    parser.add_argument("--commission", type=float, default=0.65, help="Commission per contract (default: 0.65)")

    # Vertical spread direction
    parser.add_argument(
        "--spread-direction",
        choices=["bull", "bear"],
        default="bull",
        help="Direction for vertical spread (default: bull)",
    )

    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    start_date = datetime.strptime(args.start, "%Y-%m-%d").date()
    end_date = datetime.strptime(args.end, "%Y-%m-%d").date()

    provider = CsvDataProvider(args.data)
    config = BacktestConfig(
        ticker=args.ticker,
        start_date=start_date,
        end_date=end_date,
        starting_cash=args.cash,
        commission_per_contract=args.commission,
    )

    strategies = []
    for name in args.strategy:
        cls = STRATEGY_REGISTRY[name]
        if name == "vertical_spread":
            direction = SpreadDirection(args.spread_direction)
            strategies.append(cls(direction=direction))
        else:
            strategies.append(cls())

    backtester = Backtester(config=config, provider=provider, strategies=strategies)

    print(f"\nRunning backtest: {args.ticker} from {start_date} to {end_date}")
    print(f"Strategies: {', '.join(args.strategy)}")
    print(f"Starting cash: ${args.cash:,.2f}\n")

    result = backtester.run()
    print_summary(result)


if __name__ == "__main__":
    main()
