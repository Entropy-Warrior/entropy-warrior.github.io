# Memory from First Principles: 3-Tier Design and Hybrid Retrieval

## What you’ll learn
- HOT/WARM/COLD memory tiers and roles
- ContextManager and MemoryRouter responsibilities
- Evolution pipeline and auditable writebacks

## Outline
- Tiers: ring buffer, sharded HNSW + Tantivy + SQLite, RocksDB/DuckDB
- Retrieval plan, budgeted packing, summarization
- Fact evolution (filter → dedupe → resolve → merge → reflect)

## Code anchors

```18:40:memory/README.md
## Architecture
```

```91:114:memory/docs/DESIGN.md
## 5) Component Design
```


