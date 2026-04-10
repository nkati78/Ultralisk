"""Shared utility functions for strategy implementations."""

from thesislab.domain import OptionType, OptionsChain, OptionContract, Leg


def find_current_contract(contract: OptionContract, chain: OptionsChain) -> OptionContract | None:
    """Find the same contract in the current chain by strike/expiry/type."""
    for c in chain.contracts:
        if (
            c.strike == contract.strike
            and c.expiration == contract.expiration
            and c.option_type == contract.option_type
        ):
            return c
    return None


def intrinsic_value(contract: OptionContract, underlying_price: float) -> float:
    """Calculate intrinsic value of a contract."""
    if contract.option_type == OptionType.CALL:
        return max(0.0, underlying_price - contract.strike)
    return max(0.0, contract.strike - underlying_price)
