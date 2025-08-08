# Building Rust-First AI Agents: Memory, Performance, and Evolution

Welcome to the blog series documenting the design, implementation, and lessons from building a Rust-first AI agent system with a high-performance memory stack.

## Series Index

0. [The GPT-5 Moment, AGI Tailwinds, and Why Personal Agents Matter](./00-intro-agi-gpt5.md)
1. [Why Agents, Why Rust, and What “Fast” Really Means](./01-why-agents-rust.md)
2. [The AAU Agent: Deterministic Core and Trait-Based Seams](./02-aau-agent-core.md)
3. [Memory from First Principles: 3-Tier Design and Hybrid Retrieval](./03-memory-architecture.md)
4. [Embeddings at Ludicrous Speed: MLX + PyO3 + Zero-Copy + Mmap Cache](./04-embeddings-mlx-pyo3.md)
5. [Vector Index + Keyword FTS + SQLite KV](./05-vector-fts-sqlite.md)
6. [Routing and Budgeted Context Packing](./06-routing-context.md)
7. [LLM Performance: vLLM + LMCache (KV Reuse)](./07-llm-vllm-lmcache.md)
8. [Tools, Guardrails, and Evolver Hooks](./08-tools-guards-evolver.md)
9. [Monitoring and Dashboard (SSE, Metrics, A/B)](./09-monitoring-dashboard.md)
10. [Model Context Protocol (MCP) Integration](./10-mcp-integration.md)
11. [GAIA Evaluation and A/B Sweeps](./11-gaia-ab-testing.md)
12. [Lessons Learned: Rust, Async, FFI, and Performance](./12-lessons-learned.md)

## How to Reproduce Demos

- Memory API: `make -C memory dev`
- Dashboard: `npm install --prefix dashboard && npm run -C dashboard dev`
- Agent run: `cargo run -p agent-exec -- run --agent-id demo --goal "Explain retrieval routing"`
- Benchmarks: `make -C memory benchmark`

## Codebase

This series references the following key areas:
- `agent/` (AAU framework)
- `memory/` (entropy memory system: orchestration, embeddings, vectors, store, API)
- `dashboard/` (Next.js monitoring UI)


