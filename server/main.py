"""FastAPI backend for the ThesisLab backtesting engine."""

from __future__ import annotations

from datetime import datetime, time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.schemas import (
    BacktestRequest, BacktestResponse, TradeResult, IndicatorSnapshot,
)
from thesislab.data.fake_provider import FakeDataProvider
from thesislab.engine.backtester import Backtester, BacktestConfig
from thesislab.filters import EntryExitFilters, IndicatorFilter, TimeOfDayFilter
from thesislab.strategies.covered_call import CoveredCall
from thesislab.strategies.protective_put import ProtectivePut
from thesislab.strategies.iron_condor import IronCondor
from thesislab.strategies.straddle import Straddle
from thesislab.strategies.vertical_spread import VerticalSpread, SpreadDirection

app = FastAPI(title="ThesisLab Backtester API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_strategy(cfg):
    t = cfg.type
    if t == "short_put_spread":
        return VerticalSpread(
            name="ShortPutSpread", direction=SpreadDirection.BULL,
            short_delta=cfg.short_delta, spread_width=cfg.spread_width,
            min_dte=cfg.min_dte, max_dte=cfg.max_dte,
            max_positions=cfg.max_positions,
            close_at_profit_pct=cfg.close_at_profit_pct,
            close_at_loss_pct=cfg.close_at_loss_pct,
            close_at_dte=cfg.close_at_dte,
        )
    elif t == "short_call_spread":
        return VerticalSpread(
            name="ShortCallSpread", direction=SpreadDirection.BEAR,
            short_delta=cfg.short_delta, spread_width=cfg.spread_width,
            min_dte=cfg.min_dte, max_dte=cfg.max_dte,
            max_positions=cfg.max_positions,
            close_at_profit_pct=cfg.close_at_profit_pct,
            close_at_loss_pct=cfg.close_at_loss_pct,
            close_at_dte=cfg.close_at_dte,
        )
    elif t == "covered_call":
        return CoveredCall(
            delta_target=cfg.short_delta, min_dte=cfg.min_dte, max_dte=cfg.max_dte,
            close_at_profit_pct=cfg.close_at_profit_pct, close_at_dte=cfg.close_at_dte,
        )
    elif t == "protective_put":
        return ProtectivePut(
            delta_target=cfg.put_delta, min_dte=cfg.min_dte, max_dte=cfg.max_dte,
            close_at_profit_pct=cfg.close_at_profit_pct,
            close_at_loss_pct=cfg.close_at_loss_pct,
            close_at_dte=cfg.close_at_dte,
        )
    elif t == "iron_condor":
        return IronCondor(
            short_delta=cfg.short_delta, wing_width=cfg.wing_width,
            min_dte=cfg.min_dte, max_dte=cfg.max_dte,
            close_at_profit_pct=cfg.close_at_profit_pct,
            close_at_loss_pct=cfg.close_at_loss_pct,
            close_at_dte=cfg.close_at_dte,
        )
    elif t == "straddle":
        return Straddle(
            min_dte=cfg.min_dte, max_dte=cfg.max_dte,
            close_at_profit_pct=cfg.close_at_profit_pct,
            close_at_loss_pct=cfg.close_at_loss_pct,
            close_at_dte=cfg.close_at_dte,
        )
    raise ValueError(f"Unknown strategy: {t}")


def _parse_time(s: str) -> time:
    parts = s.split(":")
    return time(int(parts[0]), int(parts[1]))


def _build_filters(adv) -> EntryExitFilters:
    time_f = TimeOfDayFilter()
    entry_ind = IndicatorFilter()

    if adv.time_of_day.enabled:
        time_f = TimeOfDayFilter(
            entry_start=_parse_time(adv.time_of_day.entry_start),
            entry_end=_parse_time(adv.time_of_day.entry_end),
            exit_start=_parse_time(adv.time_of_day.exit_start),
            exit_end=_parse_time(adv.time_of_day.exit_end),
        )

    if adv.rsi.enabled:
        entry_ind.rsi_min = float(adv.rsi.rsi_min)
        entry_ind.rsi_max = float(adv.rsi.rsi_max)
        zone_map = {"oversold": "oversold", "neutral": "neutral", "overbought": "overbought"}
        if adv.rsi.rsi_zone in zone_map:
            entry_ind.rsi_zone = zone_map[adv.rsi.rsi_zone]

    if adv.bollinger.enabled:
        pos_map = {
            "below_lower": "below_lower", "lower_half": "lower_half",
            "upper_half": "upper_half", "above_upper": "above_upper",
        }
        if adv.bollinger.position in pos_map:
            entry_ind.bb_position = pos_map[adv.bollinger.position]
        if adv.bollinger.use_pct_b:
            entry_ind.bb_pct_b_min = adv.bollinger.pct_b_min
            entry_ind.bb_pct_b_max = adv.bollinger.pct_b_max

    if adv.moving_average.enabled:
        def _parse_ma(val: str) -> bool | None:
            return {"above": True, "below": False}.get(val)

        entry_ind.price_above_sma_20 = _parse_ma(adv.moving_average.sma_20)
        entry_ind.price_above_sma_50 = _parse_ma(adv.moving_average.sma_50)
        entry_ind.price_above_sma_200 = _parse_ma(adv.moving_average.sma_200)
        entry_ind.price_above_ema_9 = _parse_ma(adv.moving_average.ema_9)
        entry_ind.price_above_ema_21 = _parse_ma(adv.moving_average.ema_21)
        if adv.moving_average.sma_cross == "bullish":
            entry_ind.sma_20_above_50 = True
        elif adv.moving_average.sma_cross == "bearish":
            entry_ind.sma_20_above_50 = False

    if adv.vwap.enabled:
        entry_ind.price_above_vwap = (adv.vwap.direction == "above")

    return EntryExitFilters(
        time_filter=time_f,
        entry_indicator_filter=entry_ind,
        exit_indicator_filter=IndicatorFilter(),
    )


@app.post("/api/backtest", response_model=BacktestResponse)
def run_backtest(req: BacktestRequest):
    start = datetime.strptime(req.start_date, "%Y-%m-%d").date()
    end = datetime.strptime(req.end_date, "%Y-%m-%d").date()

    provider = FakeDataProvider(
        ticker=req.ticker.upper(),
        start_price=req.synthetic_config.start_price,
        daily_drift=req.synthetic_config.daily_drift,
        base_iv=req.synthetic_config.base_iv,
        seed=req.synthetic_config.seed,
    )

    strategy = _build_strategy(req.strategy)
    filters = _build_filters(req.advanced_filters)
    config = BacktestConfig(
        ticker=req.ticker.upper(),
        start_date=start, end_date=end,
        starting_cash=req.starting_cash,
        commission_per_contract=req.commission,
    )

    backtester = Backtester(config=config, provider=provider,
                            strategies=[strategy], filters=filters)
    result = backtester.run()

    # Format response
    equity_curve = [
        {"date": d.isoformat(), "equity": v}
        for d, v in sorted(result.equity_curve.items())
    ]

    trades = []
    for i, pos in enumerate(result.closed_positions, 1):
        strikes = ", ".join(
            f"{'S' if leg.quantity < 0 else 'L'} {leg.contract.strike}"
            for leg in pos.entry_trade.legs
        )
        trades.append(TradeResult(
            number=i,
            strategy=pos.strategy_name,
            entry_date=pos.entry_trade.trade_date.isoformat(),
            exit_date=pos.exit_trade.trade_date.isoformat(),
            strikes=strikes,
            entry_premium=pos.entry_trade.net_premium,
            exit_premium=pos.exit_trade.net_premium,
            pnl=pos.realized_pnl,
            days_held=pos.holding_days,
            result="WIN" if pos.realized_pnl > 0 else "LOSS",
        ))

    indicators = []
    for d in sorted(result.indicator_history):
        ind = result.indicator_history[d]
        indicators.append(IndicatorSnapshot(
            date=d.isoformat(),
            price=ind.price,
            sma_20=ind.sma_20,
            sma_50=ind.sma_50,
            sma_200=ind.sma_200,
            ema_9=ind.ema_9,
            ema_21=ind.ema_21,
            rsi_14=ind.rsi_14,
            bb_upper=ind.bb_upper,
            bb_middle=ind.bb_middle,
            bb_lower=ind.bb_lower,
            vwap=ind.vwap,
        ))

    pf = result.profit_factor

    return BacktestResponse(
        total_return_pct=result.total_return_pct,
        total_pnl=result.total_pnl,
        win_rate=result.win_rate,
        total_trades=result.total_trades,
        max_drawdown_pct=result.max_drawdown_pct,
        sharpe_ratio=result.sharpe_ratio,
        annualized_return=result.annualized_return,
        avg_pnl_per_trade=result.avg_pnl_per_trade,
        avg_holding_days=result.avg_holding_days,
        profit_factor=pf if pf != float("inf") else 9999.99,
        equity_curve=equity_curve,
        trades=trades,
        indicators=indicators,
        open_positions_count=len(result.open_positions),
    )


@app.get("/api/strategies")
def list_strategies():
    return [
        {"key": "short_put_spread", "name": "Short Put Vertical Spread"},
        {"key": "short_call_spread", "name": "Short Call Vertical Spread"},
        {"key": "covered_call", "name": "Covered Call"},
        {"key": "protective_put", "name": "Protective Put"},
        {"key": "iron_condor", "name": "Iron Condor"},
        {"key": "straddle", "name": "Long Straddle"},
    ]


@app.get("/api/health")
def health():
    return {"status": "ok"}
