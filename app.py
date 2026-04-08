"""Ultralisk - Options Backtesting Frontend."""

import streamlit as st
import pandas as pd
from datetime import date, timedelta

from ultralisk.data.fake_provider import FakeDataProvider
from ultralisk.engine.backtester import Backtester, BacktestConfig
from ultralisk.strategies.covered_call import CoveredCall
from ultralisk.strategies.protective_put import ProtectivePut
from ultralisk.strategies.iron_condor import IronCondor
from ultralisk.strategies.straddle import Straddle
from ultralisk.strategies.vertical_spread import VerticalSpread, SpreadDirection
from ultralisk.analytics.metrics import BacktestResult


# ── Page Config ──────────────────────────────────────────────
st.set_page_config(page_title="Ultralisk Backtester", layout="wide")
st.title("Ultralisk - Options Backtesting")

# ── Sidebar: Strategy & Parameters ───────────────────────────
st.sidebar.header("Strategy Configuration")

STRATEGY_OPTIONS = {
    "Short Put Vertical Spread": "short_put_spread",
    "Short Call Vertical Spread": "short_call_spread",
    "Covered Call": "covered_call",
    "Protective Put": "protective_put",
    "Iron Condor": "iron_condor",
    "Long Straddle": "straddle",
}

selected_strategy = st.sidebar.selectbox(
    "Strategy",
    options=list(STRATEGY_OPTIONS.keys()),
    index=0,
)
strategy_key = STRATEGY_OPTIONS[selected_strategy]

st.sidebar.markdown("---")
st.sidebar.header("Ticker & Timeframe")

ticker_symbol = st.sidebar.text_input("Ticker Symbol", value="AAPL")

col_start, col_end = st.sidebar.columns(2)
start_date = col_start.date_input("Start Date", value=date(2023, 1, 3))
end_date = col_end.date_input("End Date", value=date(2024, 1, 3))

starting_cash = st.sidebar.number_input(
    "Starting Capital ($)", min_value=1_000, max_value=10_000_000,
    value=100_000, step=10_000,
)
commission = st.sidebar.number_input(
    "Commission per Contract ($)", min_value=0.0, max_value=10.0,
    value=0.65, step=0.05, format="%.2f",
)

# ── Sidebar: Data Source ──────────────────────────────────────
st.sidebar.markdown("---")
st.sidebar.header("Data Source")
data_source = st.sidebar.radio(
    "Source", ["Synthetic (Fake Data)", "CSV File"], index=0,
)

csv_file = None
if data_source == "CSV File":
    csv_file = st.sidebar.file_uploader("Upload CSV", type=["csv"])

# Synthetic data params
if data_source == "Synthetic (Fake Data)":
    with st.sidebar.expander("Synthetic Data Settings"):
        synth_start_price = st.number_input("Start Price ($)", value=450.0, step=10.0)
        synth_drift = st.number_input(
            "Daily Drift", value=0.0003, step=0.0001, format="%.4f",
            help="Daily price drift. 0.0003 ≈ 7.5% annual return",
        )
        synth_iv = st.slider("Base IV (%)", min_value=5, max_value=100, value=25) / 100
        synth_seed = st.number_input("Random Seed", value=42, step=1)

# ── Main Area: Entry/Exit Criteria ────────────────────────────
st.header("Entry & Exit Criteria")

# Different parameter panels per strategy
if strategy_key in ("short_put_spread", "short_call_spread"):
    st.subheader(f"{'Short Put' if strategy_key == 'short_put_spread' else 'Short Call'} Vertical Spread")
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("**Entry Criteria**")
        min_dte = st.slider("Min DTE", min_value=1, max_value=90, value=25)
        max_dte = st.slider("Max DTE", min_value=1, max_value=120, value=45)
        if min_dte > max_dte:
            st.warning("Min DTE should be less than Max DTE")

    with col2:
        st.markdown("**Delta & Spread**")
        short_delta = st.slider(
            "Short Strike Delta", min_value=0.05, max_value=0.50,
            value=0.25, step=0.01, format="%.2f",
            help="Delta of the short leg. Lower = more OTM / higher probability",
        )
        spread_width = st.number_input(
            "Spread Width ($)", min_value=1.0, max_value=50.0,
            value=5.0, step=1.0,
            help="Distance between strikes",
        )
        max_positions = st.number_input(
            "Max Concurrent Positions", min_value=1, max_value=20, value=1,
        )

    with col3:
        st.markdown("**Exit Criteria**")
        close_at_profit = st.slider(
            "Take Profit (%)", min_value=10, max_value=100, value=50,
            help="Close when this % of max profit is captured",
        ) / 100
        close_at_loss = st.slider(
            "Stop Loss (x credit)", min_value=0.5, max_value=5.0,
            value=2.0, step=0.25, format="%.2f",
            help="Close when loss reaches this multiple of credit received",
        )
        close_at_dte_exit = st.slider(
            "Close at DTE", min_value=0, max_value=30, value=7,
            help="Close position when DTE falls to this level",
        )
        entry_time = st.selectbox(
            "Entry Time of Day",
            options=["Market Open (9:30)", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "Market Close (3:45)"],
            index=0,
            help="Preferred time of day for entry (applies when using intraday data)",
        )

elif strategy_key == "covered_call":
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Entry Criteria**")
        min_dte = st.slider("Min DTE", 1, 90, 25)
        max_dte = st.slider("Max DTE", 1, 120, 45)
        short_delta = st.slider("Call Delta Target", 0.05, 0.50, 0.30, 0.01, format="%.2f")
    with col2:
        st.markdown("**Exit Criteria**")
        close_at_profit = st.slider("Take Profit (%)", 10, 100, 50) / 100
        close_at_dte_exit = st.slider("Close at DTE", 0, 30, 7)

elif strategy_key == "protective_put":
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Entry Criteria**")
        min_dte = st.slider("Min DTE", 1, 90, 25)
        max_dte = st.slider("Max DTE", 1, 120, 45)
        put_delta = st.slider("Put Delta Target", -0.50, -0.05, -0.20, 0.01, format="%.2f")
    with col2:
        st.markdown("**Exit Criteria**")
        close_at_profit = st.slider("Take Profit (%)", 10, 200, 100) / 100
        close_at_loss_pct = st.slider("Stop Loss (%)", 10, 90, 50) / 100
        close_at_dte_exit = st.slider("Close at DTE", 0, 30, 7)

elif strategy_key == "iron_condor":
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("**Entry Criteria**")
        min_dte = st.slider("Min DTE", 1, 90, 30)
        max_dte = st.slider("Max DTE", 1, 120, 50)
    with col2:
        st.markdown("**Delta & Wings**")
        short_delta = st.slider("Short Delta", 0.05, 0.30, 0.16, 0.01, format="%.2f")
        wing_width = st.number_input("Wing Width ($)", 1.0, 50.0, 5.0, 1.0)
    with col3:
        st.markdown("**Exit Criteria**")
        close_at_profit = st.slider("Take Profit (%)", 10, 100, 50) / 100
        close_at_loss = st.slider("Stop Loss (x credit)", 0.5, 5.0, 2.0, 0.25, format="%.2f")
        close_at_dte_exit = st.slider("Close at DTE", 0, 30, 10)

elif strategy_key == "straddle":
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Entry Criteria**")
        min_dte = st.slider("Min DTE", 1, 90, 25)
        max_dte = st.slider("Max DTE", 1, 120, 45)
    with col2:
        st.markdown("**Exit Criteria**")
        close_at_profit = st.slider("Take Profit (%)", 10, 200, 50) / 100
        close_at_loss_pct = st.slider("Stop Loss (%)", 10, 90, 30) / 100
        close_at_dte_exit = st.slider("Close at DTE", 0, 30, 7)


# ── Build Strategy ────────────────────────────────────────────
def build_strategy():
    if strategy_key == "short_put_spread":
        return VerticalSpread(
            name="ShortPutSpread",
            direction=SpreadDirection.BULL,
            short_delta=short_delta,
            spread_width=spread_width,
            min_dte=min_dte,
            max_dte=max_dte,
            max_positions=max_positions,
            close_at_profit_pct=close_at_profit,
            close_at_loss_pct=close_at_loss,
            close_at_dte=close_at_dte_exit,
            entry_time=entry_time,
        )
    elif strategy_key == "short_call_spread":
        return VerticalSpread(
            name="ShortCallSpread",
            direction=SpreadDirection.BEAR,
            short_delta=short_delta,
            spread_width=spread_width,
            min_dte=min_dte,
            max_dte=max_dte,
            max_positions=max_positions,
            close_at_profit_pct=close_at_profit,
            close_at_loss_pct=close_at_loss,
            close_at_dte=close_at_dte_exit,
            entry_time=entry_time,
        )
    elif strategy_key == "covered_call":
        return CoveredCall(
            delta_target=short_delta,
            min_dte=min_dte,
            max_dte=max_dte,
            close_at_profit_pct=close_at_profit,
            close_at_dte=close_at_dte_exit,
        )
    elif strategy_key == "protective_put":
        return ProtectivePut(
            delta_target=put_delta,
            min_dte=min_dte,
            max_dte=max_dte,
            close_at_profit_pct=close_at_profit,
            close_at_loss_pct=close_at_loss_pct,
            close_at_dte=close_at_dte_exit,
        )
    elif strategy_key == "iron_condor":
        return IronCondor(
            short_delta=short_delta,
            wing_width=wing_width,
            min_dte=min_dte,
            max_dte=max_dte,
            close_at_profit_pct=close_at_profit,
            close_at_loss_pct=close_at_loss,
            close_at_dte=close_at_dte_exit,
        )
    elif strategy_key == "straddle":
        return Straddle(
            min_dte=min_dte,
            max_dte=max_dte,
            close_at_profit_pct=close_at_profit,
            close_at_loss_pct=close_at_loss_pct,
            close_at_dte=close_at_dte_exit,
        )


# ── Run Backtest ──────────────────────────────────────────────
st.markdown("---")

if st.button("Run Backtest", type="primary", use_container_width=True):
    # Build data provider
    if data_source == "CSV File" and csv_file is not None:
        import tempfile, os
        from ultralisk.data.csv_provider import CsvDataProvider
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(csv_file.read())
            tmp_path = tmp.name
        provider = CsvDataProvider(tmp_path)
        ticker = ticker_symbol.upper()
        os.unlink(tmp_path)
    elif data_source == "CSV File" and csv_file is None:
        st.error("Please upload a CSV file.")
        st.stop()
    else:
        provider = FakeDataProvider(
            ticker=ticker_symbol.upper(),
            start_price=synth_start_price,
            daily_drift=synth_drift,
            base_iv=synth_iv,
            seed=int(synth_seed),
        )
        ticker = ticker_symbol.upper()

    strategy = build_strategy()
    config = BacktestConfig(
        ticker=ticker,
        start_date=start_date,
        end_date=end_date,
        starting_cash=starting_cash,
        commission_per_contract=commission,
    )

    with st.spinner("Running backtest..."):
        backtester = Backtester(config=config, provider=provider, strategies=[strategy])
        result = backtester.run()

    # ── Results ───────────────────────────────────────────────
    st.header("Results")

    # Key metrics row
    m1, m2, m3, m4, m5, m6 = st.columns(6)
    m1.metric("Total Return", f"{result.total_return_pct:.2f}%")
    m2.metric("Total P&L", f"${result.total_pnl:,.2f}")
    m3.metric("Win Rate", f"{result.win_rate:.1f}%")
    m4.metric("Total Trades", f"{result.total_trades}")
    m5.metric("Max Drawdown", f"{result.max_drawdown_pct:.2f}%")
    m6.metric("Sharpe Ratio", f"{result.sharpe_ratio:.2f}")

    # Second row
    m7, m8, m9, m10 = st.columns(4)
    m7.metric("Annualized Return", f"{result.annualized_return:.2f}%")
    m8.metric("Avg P&L/Trade", f"${result.avg_pnl_per_trade:,.2f}")
    m9.metric("Avg Holding Days", f"{result.avg_holding_days:.1f}")
    pf = result.profit_factor
    m10.metric("Profit Factor", f"{pf:.2f}" if pf != float("inf") else "∞")

    # Equity curve chart
    st.subheader("Equity Curve")
    if result.equity_curve:
        eq_df = pd.DataFrame(
            [{"Date": d, "Equity": v} for d, v in sorted(result.equity_curve.items())]
        )
        eq_df = eq_df.set_index("Date")
        st.line_chart(eq_df, y="Equity", use_container_width=True)

    # Trade log
    st.subheader("Trade Log")
    if result.closed_positions:
        trades_data = []
        for i, pos in enumerate(result.closed_positions, 1):
            entry_strikes = ", ".join(
                f"{'S' if leg.quantity < 0 else 'L'} {leg.contract.strike}"
                for leg in pos.entry_trade.legs
            )
            trades_data.append({
                "#": i,
                "Strategy": pos.strategy_name,
                "Entry Date": pos.entry_trade.trade_date,
                "Exit Date": pos.exit_trade.trade_date,
                "Strikes": entry_strikes,
                "Entry Premium": f"${pos.entry_trade.net_premium:,.2f}",
                "Exit Premium": f"${pos.exit_trade.net_premium:,.2f}",
                "P&L": f"${pos.realized_pnl:,.2f}",
                "Days Held": pos.holding_days,
                "Result": "WIN" if pos.realized_pnl > 0 else "LOSS",
            })
        trades_df = pd.DataFrame(trades_data)
        st.dataframe(trades_df, use_container_width=True, hide_index=True)

    # P&L distribution
    if result.closed_positions:
        st.subheader("P&L Distribution")
        pnl_data = pd.DataFrame(
            [{"P&L": pos.realized_pnl} for pos in result.closed_positions]
        )
        st.bar_chart(pnl_data, y="P&L", use_container_width=True)

    # Open positions
    if result.open_positions:
        st.subheader(f"Open Positions ({len(result.open_positions)})")
        for pos in result.open_positions:
            strikes = ", ".join(
                f"{'Short' if leg.quantity < 0 else 'Long'} {leg.contract.option_type.value} @ {leg.contract.strike}"
                for leg in pos.entry_trade.legs
            )
            st.write(f"- **{pos.strategy_name}** opened {pos.entry_trade.trade_date}: {strikes}")
