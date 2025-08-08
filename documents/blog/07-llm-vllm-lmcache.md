# LLM Performance: vLLM + LMCache (KV Reuse)

## What you’ll learn
- KV-cache reuse principles and expected gains
- How AAU attaches LMCache to the vLLM client

## Outline
- Cache keys, export/import, hit-rate measurement
- Warm vs cold path behavior

## Code anchors

```1:45:memory/docs/LMCACHE_INTEGRATION.md
# LMCache vLLM Tensor Integration
```

```1210:1219:agent/crates/agent-exec/src/main.rs
let llm = {
    let mut client = VllmClient::new(
        config.llm.endpoint.clone(),
```


