# Tools, Guardrails, and Evolver Hooks

## What you’ll learn
- Tool ABI and registry, permissioning, and validators
- Experience collection for PPO/GRPO/DPO

## Outline
- Tool schema, side-effects, execution context
- Content/length validators; tool permission validator
- Evolver buffer and reward logging

## Code anchors

```138:155:agent/crates/agent-core/src/traits.rs
#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
}
```

```7:13:agent/crates/agent-exec/src/main.rs
use agent_guard::{ContentFilter, LengthValidator, ToolMode, ToolPermissionValidator};
```


