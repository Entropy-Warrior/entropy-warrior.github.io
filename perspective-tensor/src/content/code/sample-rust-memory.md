---
title: "Hybrid Memory Architecture for Rust Agents"
description: "Implementing a SQLite + HNSW hybrid memory system with sub-100ms retrieval for agent orchestration"
pubDate: 2025-08-01
draft: true
tags: ["rust", "agents", "systems"]
section: "code"
author: "Lin Wang"
---

```rust
// Example hybrid memory implementation
use hnsw_rs::Hnsw;
use rusqlite::{Connection, Result};

pub struct HybridMemory {
    vector_index: Hnsw<f32, DistL2>,
    sqlite: Connection,
}

impl HybridMemory {
    pub async fn search(&self, query: &[f32], k: usize) -> Result<Vec<Memory>> {
        // Vector similarity search
        let nearest = self.vector_index.search(query, k, 30);
        
        // Combine with SQLite metadata
        let ids: Vec<_> = nearest.iter().map(|n| n.id).collect();
        self.fetch_memories(&ids).await
    }
}
```

This is a placeholder for technical writeups. Replace with your actual code snippets and implementation details.