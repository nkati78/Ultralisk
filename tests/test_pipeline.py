from datetime import date, timedelta
from graphlib import CycleError

import pytest

from ultralisk.data.dummy import DummyDataProvider
from ultralisk.pipeline.daily import build_daily_pipeline
from ultralisk.pipeline.orchestrator import Orchestrator, Stage
from ultralisk.pipeline.state import PipelineState


def test_universe_is_point_in_time() -> None:
    provider = DummyDataProvider()

    before_delisting = provider.constituents(date(2022, 6, 1))
    after_delisting = provider.constituents(date(2025, 6, 1))

    assert "GGG" in before_delisting
    assert "HHH" not in before_delisting
    assert "GGG" not in after_delisting
    assert "HHH" in after_delisting


def test_price_history_does_not_change_with_as_of() -> None:
    provider = DummyDataProvider()
    as_of = date(2025, 6, 1)

    short = provider.price_history("SEC0001", as_of, 90)
    longer = provider.price_history("SEC0001", as_of + timedelta(days=10), 100)

    assert longer[:90] == short


def test_orchestrator_runs_stages_in_dependency_order() -> None:
    noop = lambda state: None
    orchestrator = Orchestrator([
        Stage("c", noop, ("b",)),
        Stage("a", noop),
        Stage("b", noop, ("a",)),
    ])

    assert orchestrator.order == ["a", "b", "c"]


def test_orchestrator_rejects_cycles() -> None:
    noop = lambda state: None
    with pytest.raises(CycleError):
        Orchestrator([Stage("a", noop, ("b",)), Stage("b", noop, ("a",))])


AS_OF = date(2025, 6, 1)


def test_daily_pipeline_produces_normalized_targets_and_exits_delisted_holdings() -> None:
    state = PipelineState(as_of=AS_OF, current_weights={"SEC0007": 0.1})

    build_daily_pipeline(DummyDataProvider(), no_trade_band=0.0).run(state)

    assert "SEC0007" not in state.target_weights
    assert state.trades["SEC0007"] == pytest.approx(-0.1)
    assert "SEC0007" not in state.new_weights
    assert sum(abs(w) for w in state.target_weights.values()) == pytest.approx(1.0)
    assert state.report["gross_exposure"] == pytest.approx(1.0)
    assert state.report["positions"] == 7


def test_no_trade_band_skips_small_trades_but_not_exits() -> None:
    targets = build_daily_pipeline(DummyDataProvider(), no_trade_band=0.0).run(
        PipelineState(as_of=AS_OF)
    ).target_weights
    current = dict(targets)
    current["SEC0001"] += 0.01  # inside the band
    current["SEC0002"] += 0.05  # outside the band
    current["SEC0007"] = 0.001  # delisted: must exit despite being tiny

    state = build_daily_pipeline(DummyDataProvider(), no_trade_band=0.02).run(
        PipelineState(as_of=AS_OF, current_weights=current)
    )

    assert state.trades.keys() == {"SEC0002", "SEC0007"}
    assert state.new_weights["SEC0001"] == current["SEC0001"]
    assert state.new_weights["SEC0002"] == pytest.approx(targets["SEC0002"])
    assert "SEC0007" not in state.new_weights
