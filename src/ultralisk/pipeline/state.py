from dataclasses import dataclass, field
from datetime import date


@dataclass
class PipelineState:
    """Everything one daily run produces. Each stage fills in its own fields."""

    as_of: date
    current_weights: dict[str, float] = field(default_factory=dict)

    universe: list[str] = field(default_factory=list)
    security_ids: dict[str, str] = field(default_factory=dict)
    prices: dict[str, list[float]] = field(default_factory=dict)
    risk: dict[str, float] = field(default_factory=dict)
    returns: dict[str, list[float]] = field(default_factory=dict)
    signals: dict[str, dict[str, float]] = field(default_factory=dict)
    combined_signal: dict[str, float] = field(default_factory=dict)
    target_weights: dict[str, float] = field(default_factory=dict)
    trades: dict[str, float] = field(default_factory=dict)
    report: dict[str, float] = field(default_factory=dict)
