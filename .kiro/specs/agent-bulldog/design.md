# Agent Bulldog — Design

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| CLI | `src/cli.js` | Parse args, dispatch commands |
| Connector interface | `src/connectors/index.js` | Define and export connector contract |
| Streaming connector | `src/connectors/streaming.js` | Demo connector for streaming services |
| Comparison engine | `src/comparison/indexer.js` | Build price index and compare bills |
| Negotiation engine | `src/negotiation/engine.js` | Execute negotiation attempts |
| Retry scheduler | `src/negotiation/scheduler.js` | Schedule retries with fresh angles |
| Approval gate | `src/approval/gate.js` | Request and validate user approval |
| Savings tracker | `src/savings.js` | Record and report savings |

## Data flow

1. User invokes `node src/cli.js <command>`
2. CLI loads config (or demo flags)
3. CLI invokes appropriate engine module
4. Engines call connector methods (with credentials or demo data)
5. Results go through approval gate if state-changing
6. Savings tracked and reported

## Error handling

- Connector errors return `{ error: true, message: string }`
- Missing credentials fall back to demo mode
- No unhandled exceptions; CLI catches and prints user-friendly messages

## Out of scope

- Web UI (CLI-first)
- Real-time notifications
- Multi-user support
- Persistent storage beyond savings report
- Authentication flows for services (user provides credentials)
