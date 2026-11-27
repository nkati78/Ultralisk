# Vision & Principles

North-star context for Ultralisk. Most of this is **target state, not yet built** — see "Known gaps" in CLAUDE.md for what exists today.

## Philosophy

Quant trading is a signal-to-noise problem. Instead of betting on individual securities based on business quality, we bet on vectors of securities representing factors and repeatable phenomena. It is not verifiable like math, but it is amenable to simulation — trajectories to rewards — guardrailed by robust statistical discipline.

Agents build and operate the infrastructure. Strategy research is human-led: agents accelerate known methods, they don't originate unsupervised research conclusions.

## Strategy definition

A strategy is a tuple:

```
(asset universe, signals, signal combination algorithm, objective function, constraints)
```

The objective is typically: maximize expected return − expected risk − expected transaction costs, subject to trading, position, and risk constraints.

## Data requirements

For every traded universe:

- **Point-in-time** constituency and market data (prices, volumes, market caps, etc.) with enough history for useful research.
- Delisted and acquired securities must be represented (no survivorship bias).
- Symbology reconciled across vendors that identify the same entity differently.

## Daily orchestration (the spine)

```
universe constituency refresh
  -> symbology refresh
  -> market data refresh
  -> ┬ risk model refresh                          (branch 1)
     └ data lake refresh -> signal lake refresh    (branch 2)
  -> combined signal refresh
  -> audit diagnostics
  -> rebalance
  -> post-trade analytics / dashboard updates
```

This pipeline is the stable architecture everything else hangs off.

## Engineering standards (CI-enforced, target)

Goal: let agents develop the codebase safely at high iteration speed. Keep CI fast.

- 100% type coverage on all variables.
- 95%+ unit test coverage.
- End-to-end tests on all web app and process outcomes; visual inspection for apps.
- 100% docstring coverage on public **and** private functions.
- `CHANGELOG.md` entry summarizing each commit.
- `releases/release_<major>.<minor>.<patch>.md` with fuller docs memorializing each PR.
- SQL migrations recorded in `sql/`.
- Architecture tests in CI for table-contract coherence.

Where there is a degree of freedom, constrain it, and run a surgeon's checklist against it.

## Research discipline

Metric of interest: **Sharpe**. Low signal-to-noise; traditional statistical pipeline.

- Split returns into **in-sample / validation / holdout**.
- **Pre-declare** hypotheses grounded in economic phenomena.
- Ideate, develop, and tune only on in-sample. Never change a signal after unsealing validation/holdout.
- Prefer false negatives over false positives.

Standardized research reports and gates — a signal must pass:

1. Holdout gross Sharpe is positive.
2. Marginal contribution to the existing portfolio is accretive after accounting for correlation.
3. Control-vs-test optimized backtest improves.

## The apprentice test

At all times: if an apprentice had only your results, could they replicate the work in its entirety without asking a single question? Every research artifact, report, and code change should meet that bar.
