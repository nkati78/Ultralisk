"""Technical indicators computed from underlying price history."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date


@dataclass
class IndicatorValues:
    """Snapshot of all indicator values for a given date."""

    date: date
    price: float

    # Moving averages
    sma_20: float | None = None
    sma_50: float | None = None
    sma_200: float | None = None
    ema_9: float | None = None
    ema_21: float | None = None

    # RSI
    rsi_14: float | None = None

    # Bollinger Bands (20-period, 2 std dev)
    bb_upper: float | None = None
    bb_middle: float | None = None
    bb_lower: float | None = None
    bb_pct_b: float | None = None  # %B: (price - lower) / (upper - lower)

    # VWAP (approximated from daily data)
    vwap: float | None = None

    @property
    def price_vs_sma_20(self) -> str | None:
        if self.sma_20 is None:
            return None
        return "above" if self.price > self.sma_20 else "below"

    @property
    def price_vs_sma_50(self) -> str | None:
        if self.sma_50 is None:
            return None
        return "above" if self.price > self.sma_50 else "below"

    @property
    def bb_position(self) -> str | None:
        """Where price sits relative to Bollinger Bands."""
        if self.bb_upper is None or self.bb_lower is None:
            return None
        if self.price >= self.bb_upper:
            return "above_upper"
        elif self.price <= self.bb_lower:
            return "below_lower"
        elif self.bb_middle and self.price >= self.bb_middle:
            return "upper_half"
        else:
            return "lower_half"

    @property
    def rsi_zone(self) -> str | None:
        if self.rsi_14 is None:
            return None
        if self.rsi_14 >= 70:
            return "overbought"
        elif self.rsi_14 <= 30:
            return "oversold"
        return "neutral"


class IndicatorEngine:
    """Computes technical indicators from a price history.

    Feed it daily prices in order, then query indicators for any date.
    """

    def __init__(self) -> None:
        self._prices: list[tuple[date, float]] = []
        self._volumes: list[tuple[date, float]] = []
        self._cache: dict[date, IndicatorValues] = {}

        # EMA state
        self._ema_9: float | None = None
        self._ema_21: float | None = None

        # RSI state
        self._prev_avg_gain: float | None = None
        self._prev_avg_loss: float | None = None

        # VWAP state (cumulative)
        self._vwap_cum_pv: float = 0.0
        self._vwap_cum_vol: float = 0.0

    def update(self, on_date: date, price: float, volume: float = 1_000_000.0) -> IndicatorValues:
        """Add a new price point and compute indicators."""
        self._prices.append((on_date, price))
        self._volumes.append((on_date, volume))

        prices = [p for _, p in self._prices]
        n = len(prices)

        vals = IndicatorValues(date=on_date, price=price)

        # SMA
        if n >= 20:
            vals.sma_20 = sum(prices[-20:]) / 20
        if n >= 50:
            vals.sma_50 = sum(prices[-50:]) / 50
        if n >= 200:
            vals.sma_200 = sum(prices[-200:]) / 200

        # EMA
        vals.ema_9 = self._compute_ema(price, 9)
        vals.ema_21 = self._compute_ema_21(price, 21)

        # Bollinger Bands (20-period, 2 std dev)
        if n >= 20:
            window = prices[-20:]
            mean = sum(window) / 20
            variance = sum((x - mean) ** 2 for x in window) / 20
            std = math.sqrt(variance)
            vals.bb_middle = mean
            vals.bb_upper = mean + 2 * std
            vals.bb_lower = mean - 2 * std
            if vals.bb_upper != vals.bb_lower:
                vals.bb_pct_b = (price - vals.bb_lower) / (vals.bb_upper - vals.bb_lower)
            else:
                vals.bb_pct_b = 0.5

        # RSI (14-period)
        if n >= 2:
            vals.rsi_14 = self._compute_rsi(prices)

        # VWAP (cumulative from start of data)
        self._vwap_cum_pv += price * volume
        self._vwap_cum_vol += volume
        if self._vwap_cum_vol > 0:
            vals.vwap = self._vwap_cum_pv / self._vwap_cum_vol

        self._cache[on_date] = vals
        return vals

    def get(self, on_date: date) -> IndicatorValues | None:
        return self._cache.get(on_date)

    def reset_vwap(self) -> None:
        """Reset VWAP accumulation (e.g., at start of new session/day)."""
        self._vwap_cum_pv = 0.0
        self._vwap_cum_vol = 0.0

    def _compute_ema(self, price: float, period: int = 9) -> float | None:
        prices = [p for _, p in self._prices]
        if len(prices) < period:
            return None
        k = 2 / (period + 1)
        if self._ema_9 is None:
            self._ema_9 = sum(prices[:period]) / period
        self._ema_9 = price * k + self._ema_9 * (1 - k)
        return self._ema_9

    def _compute_ema_21(self, price: float, period: int = 21) -> float | None:
        prices = [p for _, p in self._prices]
        if len(prices) < period:
            return None
        k = 2 / (period + 1)
        if self._ema_21 is None:
            self._ema_21 = sum(prices[:period]) / period
        self._ema_21 = price * k + self._ema_21 * (1 - k)
        return self._ema_21

    def _compute_rsi(self, prices: list[float], period: int = 14) -> float | None:
        n = len(prices)
        if n < period + 1:
            return None

        if self._prev_avg_gain is None:
            # Initial RSI: average of first `period` gains/losses
            gains = []
            losses = []
            for i in range(n - period, n):
                delta = prices[i] - prices[i - 1]
                if delta > 0:
                    gains.append(delta)
                    losses.append(0.0)
                else:
                    gains.append(0.0)
                    losses.append(abs(delta))
            self._prev_avg_gain = sum(gains) / period
            self._prev_avg_loss = sum(losses) / period
        else:
            delta = prices[-1] - prices[-2]
            gain = max(0.0, delta)
            loss = max(0.0, -delta)
            self._prev_avg_gain = (self._prev_avg_gain * (period - 1) + gain) / period
            self._prev_avg_loss = (self._prev_avg_loss * (period - 1) + loss) / period

        if self._prev_avg_loss == 0:
            return 100.0
        rs = self._prev_avg_gain / self._prev_avg_loss
        return 100.0 - (100.0 / (1.0 + rs))
