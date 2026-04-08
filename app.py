"""Ultralisk - Options Backtesting Frontend."""

import streamlit as st
import pandas as pd
from datetime import date, time

from ultralisk.data.fake_provider import FakeDataProvider
from ultralisk.engine.backtester import Backtester, BacktestConfig
from ultralisk.filters import EntryExitFilters, TimeOfDayFilter, IndicatorFilter
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


# ══════════════════════════════════════════════════════════════
# ── Advanced Settings ─────────────────────────────────────────
# ══════════════════════════════════════════════════════════════
st.markdown("---")
st.header("Advanced Settings")

adv_tab_time, adv_tab_rsi, adv_tab_bb, adv_tab_ma, adv_tab_vwap = st.tabs(
    ["Time of Day", "RSI", "Bollinger Bands", "SMA / EMA", "VWAP"]
)

# ── Time of Day ───────────────────────────────────────────────
with adv_tab_time:
    use_time_filter = st.checkbox("Enable Time-of-Day Filter", value=False)
    if use_time_filter:
        tcol1, tcol2 = st.columns(2)
        with tcol1:
            st.markdown("**Entry Window**")
            TIME_OPTIONS = {
                "9:30 AM (Market Open)": time(9, 30),
                "9:45 AM": time(9, 45),
                "10:00 AM": time(10, 0),
                "10:30 AM": time(10, 30),
                "11:00 AM": time(11, 0),
                "11:30 AM": time(11, 30),
                "12:00 PM": time(12, 0),
                "12:30 PM": time(12, 30),
                "1:00 PM": time(13, 0),
                "1:30 PM": time(13, 30),
                "2:00 PM": time(14, 0),
                "2:30 PM": time(14, 30),
                "3:00 PM": time(15, 0),
                "3:30 PM": time(15, 30),
                "3:45 PM": time(15, 45),
                "4:00 PM (Market Close)": time(16, 0),
            }
            entry_start_label = st.selectbox(
                "Earliest Entry", list(TIME_OPTIONS.keys()), index=0,
            )
            entry_end_label = st.selectbox(
                "Latest Entry", list(TIME_OPTIONS.keys()), index=len(TIME_OPTIONS) - 1,
            )
            entry_start_time = TIME_OPTIONS[entry_start_label]
            entry_end_time = TIME_OPTIONS[entry_end_label]

        with tcol2:
            st.markdown("**Exit Window**")
            exit_start_label = st.selectbox(
                "Earliest Exit", list(TIME_OPTIONS.keys()), index=0,
            )
            exit_end_label = st.selectbox(
                "Latest Exit", list(TIME_OPTIONS.keys()), index=len(TIME_OPTIONS) - 1,
            )
            exit_start_time = TIME_OPTIONS[exit_start_label]
            exit_end_time = TIME_OPTIONS[exit_end_label]

        st.info(
            "Time-of-day filters are recorded with your backtest. "
            "With daily data they are logged but not enforced. "
            "They become active when using intraday data."
        )

# ── RSI ───────────────────────────────────────────────────────
with adv_tab_rsi:
    use_rsi = st.checkbox("Enable RSI Filter", value=False)
    if use_rsi:
        st.markdown("Only enter trades when RSI(14) is within the specified range.")
        rcol1, rcol2, rcol3 = st.columns(3)
        with rcol1:
            rsi_min = st.slider("RSI Min", 0, 100, 20, help="Minimum RSI to allow entry")
        with rcol2:
            rsi_max = st.slider("RSI Max", 0, 100, 80, help="Maximum RSI to allow entry")
        with rcol3:
            rsi_zone_filter = st.selectbox(
                "RSI Zone Filter",
                ["Any", "Oversold (< 30)", "Neutral (30-70)", "Overbought (> 70)"],
                index=0,
                help="Only enter when RSI is in this zone",
            )
        if rsi_min > rsi_max:
            st.warning("RSI Min should be less than RSI Max")

# ── Bollinger Bands ───────────────────────────────────────────
with adv_tab_bb:
    use_bb = st.checkbox("Enable Bollinger Bands Filter", value=False)
    if use_bb:
        st.markdown("Only enter trades when price is in a specific Bollinger Band zone (20-period, 2 std dev).")
        bcol1, bcol2 = st.columns(2)
        with bcol1:
            bb_position_filter = st.selectbox(
                "Price Position",
                ["Any", "Below Lower Band", "Lower Half", "Upper Half", "Above Upper Band"],
                index=0,
                help="Where price must be relative to Bollinger Bands",
            )
        with bcol2:
            use_pct_b = st.checkbox("Use %B Range", value=False)
            if use_pct_b:
                bb_pct_b_range = st.slider(
                    "%B Range", min_value=0.0, max_value=1.5,
                    value=(0.0, 0.2), step=0.05, format="%.2f",
                    help="0.0 = lower band, 0.5 = middle, 1.0 = upper band",
                )

# ── SMA / EMA ────────────────────────────────────────────────
with adv_tab_ma:
    use_ma = st.checkbox("Enable Moving Average Filter", value=False)
    if use_ma:
        st.markdown("Only enter trades when price is above/below selected moving averages.")
        macol1, macol2 = st.columns(2)
        with macol1:
            st.markdown("**Price vs. Moving Average**")
            ma_sma20 = st.selectbox("SMA(20)", ["Ignore", "Price Above", "Price Below"], index=0)
            ma_sma50 = st.selectbox("SMA(50)", ["Ignore", "Price Above", "Price Below"], index=0)
            ma_sma200 = st.selectbox("SMA(200)", ["Ignore", "Price Above", "Price Below"], index=0)
        with macol2:
            st.markdown("**EMA & Crossover**")
            ma_ema9 = st.selectbox("EMA(9)", ["Ignore", "Price Above", "Price Below"], index=0)
            ma_ema21 = st.selectbox("EMA(21)", ["Ignore", "Price Above", "Price Below"], index=0)
            ma_cross = st.selectbox(
                "SMA(20) vs SMA(50)",
                ["Ignore", "SMA(20) Above (Bullish)", "SMA(20) Below (Bearish)"],
                index=0,
                help="Golden cross / death cross filter",
            )

# ── VWAP ──────────────────────────────────────────────────────
with adv_tab_vwap:
    use_vwap = st.checkbox("Enable VWAP Filter", value=False)
    if use_vwap:
        st.markdown("Only enter trades when price is above or below VWAP.")
        vwap_direction = st.selectbox(
            "Price vs. VWAP",
            ["Price Above VWAP", "Price Below VWAP"],
            index=0,
        )


# ── Build Filters ─────────────────────────────────────────────
def build_filters() -> EntryExitFilters:
    time_f = TimeOfDayFilter()
    entry_ind = IndicatorFilter()
    exit_ind = IndicatorFilter()

    # Time of day
    if use_time_filter:
        time_f = TimeOfDayFilter(
            entry_start=entry_start_time,
            entry_end=entry_end_time,
            exit_start=exit_start_time,
            exit_end=exit_end_time,
        )

    # RSI
    if use_rsi:
        entry_ind.rsi_min = float(rsi_min)
        entry_ind.rsi_max = float(rsi_max)
        zone_map = {
            "Oversold (< 30)": "oversold",
            "Neutral (30-70)": "neutral",
            "Overbought (> 70)": "overbought",
        }
        if rsi_zone_filter != "Any":
            entry_ind.rsi_zone = zone_map[rsi_zone_filter]

    # Bollinger Bands
    if use_bb:
        pos_map = {
            "Below Lower Band": "below_lower",
            "Lower Half": "lower_half",
            "Upper Half": "upper_half",
            "Above Upper Band": "above_upper",
        }
        if bb_position_filter != "Any":
            entry_ind.bb_position = pos_map[bb_position_filter]
        if use_pct_b:
            entry_ind.bb_pct_b_min = bb_pct_b_range[0]
            entry_ind.bb_pct_b_max = bb_pct_b_range[1]

    # Moving Averages
    if use_ma:
        def _parse_ma(val: str) -> bool | None:
            if val == "Price Above":
                return True
            elif val == "Price Below":
                return False
            return None

        entry_ind.price_above_sma_20 = _parse_ma(ma_sma20)
        entry_ind.price_above_sma_50 = _parse_ma(ma_sma50)
        entry_ind.price_above_sma_200 = _parse_ma(ma_sma200)
        entry_ind.price_above_ema_9 = _parse_ma(ma_ema9)
        entry_ind.price_above_ema_21 = _parse_ma(ma_ema21)
        if ma_cross == "SMA(20) Above (Bullish)":
            entry_ind.sma_20_above_50 = True
        elif ma_cross == "SMA(20) Below (Bearish)":
            entry_ind.sma_20_above_50 = False

    # VWAP
    if use_vwap:
        entry_ind.price_above_vwap = (vwap_direction == "Price Above VWAP")

    return EntryExitFilters(
        time_filter=time_f,
        entry_indicator_filter=entry_ind,
        exit_indicator_filter=exit_ind,
    )


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
    filters = build_filters()
    config = BacktestConfig(
        ticker=ticker,
        start_date=start_date,
        end_date=end_date,
        starting_cash=starting_cash,
        commission_per_contract=commission,
    )

    with st.spinner("Running backtest..."):
        backtester = Backtester(
            config=config, provider=provider,
            strategies=[strategy], filters=filters,
        )
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

    # Equity curve + indicator overlay
    st.subheader("Equity Curve")
    if result.equity_curve:
        eq_df = pd.DataFrame(
            [{"Date": d, "Equity": v} for d, v in sorted(result.equity_curve.items())]
        )
        eq_df = eq_df.set_index("Date")
        st.line_chart(eq_df, y="Equity", use_container_width=True)

    # Underlying price + indicators chart
    if result.indicator_history:
        st.subheader("Underlying Price & Indicators")
        ind_rows = []
        for d in sorted(result.indicator_history):
            ind = result.indicator_history[d]
            row = {"Date": d, "Price": ind.price}
            if ind.sma_20 is not None:
                row["SMA(20)"] = ind.sma_20
            if ind.sma_50 is not None:
                row["SMA(50)"] = ind.sma_50
            if ind.ema_9 is not None:
                row["EMA(9)"] = ind.ema_9
            if ind.ema_21 is not None:
                row["EMA(21)"] = ind.ema_21
            if ind.bb_upper is not None:
                row["BB Upper"] = ind.bb_upper
                row["BB Lower"] = ind.bb_lower
            if ind.vwap is not None:
                row["VWAP"] = ind.vwap
            ind_rows.append(row)

        ind_df = pd.DataFrame(ind_rows).set_index("Date")
        st.line_chart(ind_df, use_container_width=True)

        # RSI subplot
        rsi_rows = [
            {"Date": d, "RSI": result.indicator_history[d].rsi_14}
            for d in sorted(result.indicator_history)
            if result.indicator_history[d].rsi_14 is not None
        ]
        if rsi_rows:
            st.subheader("RSI(14)")
            rsi_df = pd.DataFrame(rsi_rows).set_index("Date")
            st.line_chart(rsi_df, y="RSI", use_container_width=True)

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
