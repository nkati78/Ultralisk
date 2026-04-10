"""Formatted output and reporting for backtest results."""

from thesislab.analytics.metrics import BacktestResult


def print_summary(result: BacktestResult) -> None:
    """Print a formatted text summary to stdout."""
    print("=" * 60)
    print("  BACKTEST RESULTS")
    print("=" * 60)

    print(f"\n  Starting Capital:    ${result.starting_cash:>12,.2f}")
    print(f"  Final Equity:        ${result.final_equity:>12,.2f}")
    print(f"  Total Return:        {result.total_return_pct:>12.2f}%")
    print(f"  Annualized Return:   {result.annualized_return:>12.2f}%")

    print(f"\n  Total Trades:        {result.total_trades:>12}")
    print(f"  Win Rate:            {result.win_rate:>12.1f}%")
    print(f"  Avg P&L/Trade:       ${result.avg_pnl_per_trade:>12,.2f}")
    print(f"  Total P&L:           ${result.total_pnl:>12,.2f}")
    print(f"  Avg Holding Days:    {result.avg_holding_days:>12.1f}")

    print(f"\n  Max Drawdown:        {result.max_drawdown_pct:>12.2f}%")
    print(f"  Sharpe Ratio:        {result.sharpe_ratio:>12.2f}")
    pf = result.profit_factor
    pf_str = f"{pf:.2f}" if pf != float("inf") else "inf"
    print(f"  Profit Factor:       {pf_str:>12}")

    if result.open_positions:
        print(f"\n  Open Positions:      {len(result.open_positions):>12}")

    # Per-strategy breakdown
    by_strat = result.by_strategy()
    if len(by_strat) > 1:
        print(f"\n  {'STRATEGY BREAKDOWN':^56}")
        print("  " + "-" * 56)
        for strat_name, positions in by_strat.items():
            wins = sum(1 for p in positions if p.realized_pnl > 0)
            total_pnl = sum(p.realized_pnl for p in positions)
            wr = (wins / len(positions) * 100) if positions else 0
            print(f"  {strat_name:<20} Trades: {len(positions):>4}  "
                  f"WR: {wr:>5.1f}%  P&L: ${total_pnl:>10,.2f}")

    print("\n" + "=" * 60)
