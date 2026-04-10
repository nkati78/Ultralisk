"""CSV-based data provider for offline testing and development."""

import csv
from datetime import date, datetime
from pathlib import Path

from thesislab.domain import OptionContract, OptionType, OptionsChain


class CsvDataProvider:
    """Loads options data from CSV files.

    Expected CSV columns:
        underlying, quote_date, expiration, strike, option_type, bid, ask,
        last, volume, open_interest, implied_volatility, delta, gamma, theta,
        vega, underlying_price

    Date format: YYYY-MM-DD
    """

    def __init__(self, csv_path: str | Path) -> None:
        self._path = Path(csv_path)
        self._chains: dict[tuple[str, date], OptionsChain] = {}
        self._load()

    def _parse_date(self, s: str) -> date:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()

    def _parse_float(self, s: str, default: float | None = None) -> float | None:
        s = s.strip()
        if not s:
            return default
        try:
            return float(s)
        except ValueError:
            return default

    def _load(self) -> None:
        with open(self._path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows_by_key: dict[tuple[str, date], list[dict]] = {}
            for row in reader:
                ticker = row["underlying"].strip().upper()
                q_date = self._parse_date(row["quote_date"])
                rows_by_key.setdefault((ticker, q_date), []).append(row)

        for (ticker, q_date), rows in rows_by_key.items():
            contracts = []
            underlying_price = float(rows[0]["underlying_price"])
            for row in rows:
                opt_type = OptionType.CALL if row["option_type"].strip().lower() == "call" else OptionType.PUT
                contract = OptionContract(
                    underlying=ticker,
                    expiration=self._parse_date(row["expiration"]),
                    strike=float(row["strike"]),
                    option_type=opt_type,
                    bid=float(row["bid"]),
                    ask=float(row["ask"]),
                    last=float(row["last"]),
                    volume=int(row["volume"]),
                    open_interest=int(row["open_interest"]),
                    implied_volatility=float(row["implied_volatility"]),
                    delta=self._parse_float(row.get("delta", "")),
                    gamma=self._parse_float(row.get("gamma", "")),
                    theta=self._parse_float(row.get("theta", "")),
                    vega=self._parse_float(row.get("vega", "")),
                )
                contracts.append(contract)

            self._chains[(ticker, q_date)] = OptionsChain(
                underlying=ticker,
                quote_date=q_date,
                underlying_price=underlying_price,
                contracts=tuple(contracts),
            )

    def get_chain(self, ticker: str, on_date: date) -> OptionsChain | None:
        return self._chains.get((ticker.upper(), on_date))

    def get_trading_dates(self, ticker: str, start: date, end: date) -> list[date]:
        ticker = ticker.upper()
        dates = [
            d for (t, d) in self._chains if t == ticker and start <= d <= end
        ]
        return sorted(dates)

    def get_underlying_price(self, ticker: str, on_date: date) -> float | None:
        chain = self.get_chain(ticker, on_date)
        return chain.underlying_price if chain else None
