# Model Context Protocol (MCP) Integration

## What you’ll learn
- Why MCP for tool interop
- How memory tools are exposed over stdio transport

## Outline
- Tool definitions and schemas
- Server runtime and capabilities

## Code anchors

```22:41:memory/crates/api/src/mcp_server.rs
#[mcp_tool(
    name = "memory_remember",
    description = "Store new information in memory"
)]
```

```287:314:memory/crates/api/src/mcp_server.rs
pub async fn run_mcp_server(state: AppState) -> SdkResult<()> {
    // Define server details and capabilities
```


