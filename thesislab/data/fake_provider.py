"""Fake in-memory data provider for testing and development.

Generates synthetic but plausible options chains using simplified pricing.
No external data or files required.
"""

import math
from datetime import date, timedelta

from thesislab.domain import OptionContract, OptionType, OptionsChain


def _black_scholes_delta(S: float, K: float, T: float, sigma: float, is_call: bool) -> float:
    """Approximate Black-Scholes delta."""
    if T <= 0:
        if is_call:
            return 1.0 if S > K else 0.0
        else:
            return -1.0 if S < K else 0.0
    d1 = (math.log(S / K) + 0.5 * sigma ** 2 * T) / (sigma * math.sqrt(T))
    nd1 = 0.5 * (1 + math.erf(d1 / math.sqrt(2)))
    return nd1 if is_call else nd1 - 1.0


def _bs_price(S: float, K: float, T: float, sigma: float, is_call: bool) -> float:
    """Simplified Black-Scholes option price (r=0)."""
    if T <= 0:
        if is_call:
            return max(0.0, S - K)
        else:
            return max(0.0, K - S)
    d1 = (math.log(S / K) + 0.5 * sigma ** 2 * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    nd1 = 0.5 * (1 + math.erf(d1 / math.sqrt(2)))
    nd2 = 0.5 * (1 + math.erf(d2 / math.sqrt(2)))
    if is_call:
        return S * nd1 - K * nd2
    else:
        return K * (1 - nd2) - S * (1 - nd1)


def _make_chain(
    ticker: str,
    quote_date: date,
    underlying_price: float,
    iv: float,
    expirations: list[date],
    strike_range_pct: float = 0.20,
    strike_step: float = 5.0,
) -> OptionsChain:
    """Generate a synthetic options chain."""
    contracts = []
    for expiration in expirations:
        dte = (expiration - quote_date).days
        T = dte / 365.0

        # Generate strikes from -20% to +20% of underlying
        low = underlying_price * (1 - strike_range_pct)
        high = underlying_price * (1 + strike_range_pct)
        strikes = []
        k = round(low / strike_step) * strike_step
        while k <= high:
            strikes.append(round(k, 2))
            k += strike_step

        for strike in strikes:
            for is_call in (True, False):
                opt_type = OptionType.CALL if is_call else OptionType.PUT
                fair = _bs_price(underlying_price, strike, T, iv, is_call)
                spread = max(0.05, fair * 0.04)
                bid = max(0.01, fair - spread / 2)
                ask = fair + spread / 2
                delta = _black_scholes_delta(underlying_price, strike, T, iv, is_call)

                contracts.append(OptionContract(
                    underlying=ticker,
                    expiration=expiration,
                    strike=strike,
                    option_type=opt_type,
                    bid=round(bid, 2),
                    ask=round(ask, 2),
                    last=round(fair, 2),
                    volume=max(1, int(1000 * fair / underlying_price)),
                    open_interest=max(1, int(5000 * fair / underlying_price)),
                    implied_volatility=round(iv, 4),
                    delta=round(delta, 4),
                    gamma=round(0.01 / (underlying_price * iv * math.sqrt(T + 0.001)), 4),
                    theta=round(-fair * iv / (2 * math.sqrt(max(T, 0.001) * 365)), 4),
                    vega=round(underlying_price * math.sqrt(max(T, 0.001)) * 0.004, 4),
                ))

    return OptionsChain(
        underlying=ticker,
        quote_date=quote_date,
        underlying_price=round(underlying_price, 2),
        contracts=tuple(contracts),
    )


def _next_third_friday(from_date: date) -> date:
    """Find the next monthly expiration (3rd Friday of month)."""
    year, month = from_date.year, from_date.month
    first_day = date(year, month, 1)
    first_friday = first_day + timedelta(days=(4 - first_day.weekday()) % 7)
    third_friday = first_friday + timedelta(weeks=2)
    if third_friday <= from_date:
        month += 1
        if month > 12:
            month, year = 1, year + 1
        first_day = date(year, month, 1)
        first_friday = first_day + timedelta(days=(4 - first_day.weekday()) % 7)
        third_friday = first_friday + timedelta(weeks=2)
    return third_friday


def _get_expirations(from_date: date, count: int = 3) -> list[date]:
    """Get the next N monthly expirations."""
    expirations = []
    current = from_date
    for _ in range(count):
        exp = _next_third_friday(current)
        expirations.append(exp)
        current = exp + timedelta(days=1)
    return expirations


class FakeDataProvider:
    """Generates synthetic options chains for backtesting without real data.

    Simulates a trending underlying price with realistic IV and options pricing.

    Args:
        ticker: Ticker symbol
        start_price: Starting price of the underlying
        daily_drift: Daily price drift as decimal (e.g., 0.0003 = ~7.5% annual)
        base_iv: Base implied volatility (e.g., 0.25 = 25%)
        iv_vol: Volatility of IV (random walk)
        strike_step: Strike price increment
        seed: Random seed for reproducibility
    """

    def __init__(
        self,
        ticker: str = "TEST",
        start_price: float = 100.0,
        daily_drift: float = 0.0003,
        base_iv: float = 0.25,
        iv_vol: float = 0.01,
        strike_step: float = 5.0,
        seed: int = 42,
    ) -> None:
        self.ticker = ticker.upper()
        self._chains: dict[date, OptionsChain] = {}
        self._generate(start_price, daily_drift, base_iv, iv_vol, strike_step, seed)

    def _generate(
        self,
        start_price: float,
        drift: float,
        base_iv: float,
        iv_vol: float,
        strike_step: float,
        seed: int,
    ) -> None:
        """Pre-generate chains — called once at construction."""
        import random
        rng = random.Random(seed)

        price = start_price
        iv = base_iv
        # Generate 2 years of trading days (approx 504)
        current = date(2023, 1, 3)
        end = date(2025, 1, 3)

        while current <= end:
            # Skip weekends
            if current.weekday() >= 5:
                current += timedelta(days=1)
                continue

            expirations = _get_expirations(current, count=3)
            chain = _make_chain(
                ticker=self.ticker,
                quote_date=current,
                underlying_price=price,
                iv=iv,
                expirations=expirations,
                strike_step=strike_step,
            )
            self._chains[current] = chain

            # Simulate next day: random walk with drift
            daily_return = drift + rng.gauss(0, iv / math.sqrt(252))
            price = round(price * (1 + daily_return), 2)
            price = max(price, 1.0)

            # IV mean-reverts
            iv_shock = rng.gauss(0, iv_vol)
            iv = max(0.05, min(1.5, iv + iv_shock + 0.05 * (base_iv - iv)))

            current += timedelta(days=1)

    def get_chain(self, ticker: str, on_date: date) -> OptionsChain | None:
        if ticker.upper() != self.ticker:
            return None
        return self._chains.get(on_date)

    def get_trading_dates(self, ticker: str, start: date, end: date) -> list[date]:
        if ticker.upper() != self.ticker:
            return []
        return sorted(d for d in self._chains if start <= d <= end)

    def get_underlying_price(self, ticker: str, on_date: date) -> float | None:
        chain = self.get_chain(ticker, on_date)
        return chain.underlying_price if chain else None
