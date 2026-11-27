from collections.abc import Callable
from dataclasses import dataclass
from graphlib import TopologicalSorter

from ultralisk.pipeline.state import PipelineState


@dataclass(frozen=True)
class Stage:
    name: str
    run: Callable[[PipelineState], None]
    depends_on: tuple[str, ...] = ()


class Orchestrator:
    """Runs stages in dependency order. Raises graphlib.CycleError on construction if the graph has a cycle."""

    def __init__(self, stages: list[Stage]) -> None:
        self._stages = {s.name: s for s in stages}
        graph = {s.name: set(s.depends_on) for s in stages}
        self.order: list[str] = list(TopologicalSorter(graph).static_order())

    def run(self, state: PipelineState) -> PipelineState:
        for name in self.order:
            self._stages[name].run(state)
        return state
