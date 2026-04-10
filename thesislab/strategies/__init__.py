"""Options trading strategies."""

from thesislab.strategies.covered_call import CoveredCall
from thesislab.strategies.protective_put import ProtectivePut
from thesislab.strategies.iron_condor import IronCondor
from thesislab.strategies.straddle import Straddle
from thesislab.strategies.vertical_spread import VerticalSpread

STRATEGY_REGISTRY: dict[str, type] = {
    "covered_call": CoveredCall,
    "protective_put": ProtectivePut,
    "iron_condor": IronCondor,
    "straddle": Straddle,
    "vertical_spread": VerticalSpread,
}
