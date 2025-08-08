# The AAU Agent: Deterministic Core and Trait-Based Seams

## What you’ll learn
- The AAU state machine and deterministic transcripts
- Trait surfaces for LLM, Memory, Tools, Validators
- How evolver hooks collect experience

## Outline
- Agent state and replay model
- Budget handling and guardrails
- Tool execution and validation chain
- Wiring AAU with memory + LLM clients

## Code anchors

```1:19:agent/crates/agent-core/src/lib.rs
//! # AAU Agent Core
```

```48:66:agent/crates/agent-core/src/traits.rs
#[async_trait]
pub trait LlmClient: Send + Sync {
    async fn complete(&self, prompt: &str, budget: &Budget) -> Result<String>;
}
```

```45:61:agent/crates/agent-core/src/state.rs
/// Core agent state machine
pub struct Agent {
    /// Unique agent ID
    pub id: String,
```


