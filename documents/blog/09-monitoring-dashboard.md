# Monitoring and Dashboard (SSE, Metrics, A/B)

## What you’ll learn
- API stats endpoints consumed by the dashboard
- Live Agent Logs via Server-Sent Events

## Outline
- Metrics: latency, tokens, dollars, cost-of-pass
- Agents table, recent evals, time-series

## Code anchors

```20:39:memory/crates/api/src/server.rs
.route("/sse/agent_logs", get(sse::agent_logs_stream))
```

```18:41:dashboard/app/components/AgentLogs.tsx
export default function AgentLogs(...) {
```


