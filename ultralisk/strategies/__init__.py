"""Options trading strategies."""

from ultralisk.strategies.covered_call import CoveredCall
from ultralisk.strategies.protective_put import ProtectivePut
from ultralisk.strategies.iron_condor import IronCondor
from ultralisk.strategies.straddle import Straddle
from ultralisk.strategies.vertical_spread import VerticalSpread

STRATEGY_REGISTRY: dict[str, type] = {
    "covered_call": CoveredCall,
    "protective_put": ProtectivePut,
    "iron_condor": IronCondor,
    "straddle": Straddle,
    "vertical_spread": VerticalSpread,
}
