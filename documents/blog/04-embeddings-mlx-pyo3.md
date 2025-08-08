# Embeddings at Ludicrous Speed: MLX + PyO3 + Zero-Copy + Mmap Cache

## What you’ll learn
- Why MLX on Apple Silicon and how to cross the Python/Rust boundary fast
- Zero-copy array reuse and memory pooling
- Persistent mmap cache design

## Outline
- IPC options considered and why PyO3 direct is best here
- Batch sizing and latency distributions
- Cache structure (hash → mmap vector; metadata)

## Code anchors

```12:31:memory/crates/embed/src/pyo3_mlx.rs
/// PyO3-based MLX embeddings - ULTRA OPTIMIZED for maximum performance
pub struct PyO3MLXEmbeddings {
    embedder: Arc<StdMutex<Option<PyObject>>>,
```

```1:20:memory/docs/performance/MEMORY_MAPPING_CACHE.md
# Memory-Mapped Embedding Cache
```


