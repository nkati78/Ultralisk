import math
from statistics import mean, stdev

from ultralisk.data.dummy import DummyDataProvider
from ultralisk.pipeline.orchestrator import Orchestrator, Stage
from ultralisk.pipeline.state import PipelineState

LOOKBACK_DAYS = 60


def _returns(prices: list[float]) -> list[float]:
    return [b / a - 1 for a, b in zip(prices, prices[1:])]


def _zscore(values: dict[str, float]) -> dict[str, float]:
    mu, sd = mean(values.values()), stdev(values.values())
    return {k: (v - mu) / sd for k, v in values.items()}


def build_daily_pipeline(provider: DummyDataProvider) -> Orchestrator:
    def universe(state: PipelineState) -> None:
        state.universe = provider.constituents(state.as_of)

    def symbology(state: PipelineState) -> None:
        state.security_ids = provider.symbology(state.universe)

    def market_data(state: PipelineState) -> None:
        state.prices = {
            sid: provider.price_history(sid, state.as_of, LOOKBACK_DAYS)
            for sid in state.security_ids.values()
        }

    def risk_model(state: PipelineState) -> None:
        state.risk = {sid: stdev(_returns(p)) for sid, p in state.prices.items()}

    def data_lake(state: PipelineState) -> None:
        state.returns = {sid: _returns(p) for sid, p in state.prices.items()}

    def signal_lake(state: PipelineState) -> None:
        state.signals = {
            "momentum_20d": {sid: sum(r[-20:]) for sid, r in state.returns.items()},
            "reversal_5d": {sid: -sum(r[-5:]) for sid, r in state.returns.items()},
        }

    def combined_signal(state: PipelineState) -> None:
        zscores = [_zscore(s) for s in state.signals.values()]
        state.combined_signal = {sid: mean(z[sid] for z in zscores) for sid in state.returns}

    def audit(state: PipelineState) -> None:
        failures: list[str] = []
        missing = set(state.security_ids.values()) - state.combined_signal.keys()
        if missing:
            failures.append(f"no combined signal for {sorted(missing)}")
        bad_risk = [sid for sid, vol in state.risk.items() if not vol > 0]
        if bad_risk:
            failures.append(f"non-positive volatility for {bad_risk}")
        non_finite = [sid for sid, s in state.combined_signal.items() if not math.isfinite(s)]
        if non_finite:
            failures.append(f"non-finite combined signal for {non_finite}")
        if failures:
            raise ValueError("audit failed: " + "; ".join(failures))

    def rebalance(state: PipelineState) -> None:
        raw = {sid: s / state.risk[sid] for sid, s in state.combined_signal.items()}
        gross = sum(abs(w) for w in raw.values())
        state.target_weights = {sid: w / gross for sid, w in raw.items()}
        held = state.target_weights.keys() | state.current_weights.keys()
        state.trades = {
            sid: state.target_weights.get(sid, 0.0) - state.current_weights.get(sid, 0.0)
            for sid in sorted(held)
        }

    def post_trade(state: PipelineState) -> None:
        weights = state.target_weights.values()
        state.report = {
            "gross_exposure": sum(abs(w) for w in weights),
            "net_exposure": sum(weights),
            "turnover": sum(abs(t) for t in state.trades.values()),
            "positions": float(len(state.target_weights)),
        }

    return Orchestrator([
        Stage("universe", universe),
        Stage("symbology", symbology, ("universe",)),
        Stage("market_data", market_data, ("symbology",)),
        Stage("risk_model", risk_model, ("market_data",)),
        Stage("data_lake", data_lake, ("market_data",)),
        Stage("signal_lake", signal_lake, ("data_lake",)),
        Stage("combined_signal", combined_signal, ("signal_lake",)),
        Stage("audit", audit, ("combined_signal", "risk_model")),
        Stage("rebalance", rebalance, ("audit",)),
        Stage("post_trade", post_trade, ("rebalance",)),
    ])
