# Routing and Budgeted Context Packing

## What you’ll learn
- How routing picks HOT/WARM/COLD based on budgets and recall targets
- Token budgets and deterministic packs

## Outline
- Cost/latency/recall trade-offs per tier
- Knapsack-like budget packing; periodic replan

## Code anchors

```24:49:memory/README.md
┌──────────────────────────────────────────────┐
│ Memory Orchestration Layer                   │
```

```60:67:agent/crates/agent-exec/src/main.rs
let agent_config = AgentConfig {
    id: agent_id.to_string(),
```


