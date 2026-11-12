# Tech Overview

## Runtime

- Node.js >=18 (CommonJS only)
- `node --test` for test runner (no external test framework)
- No build step; runs directly from source

## Dependencies

- Zero external runtime dependencies
- Development dependencies only (fixtures, mocks if needed)

## Connectors

- One module per service under `src/connectors/`
- Each exposes the same interface:
  - `listPlans()` — available plans and pricing
  - `currentBill()` — user's current plan and cost
  - `negotiate(angle)` — attempt negotiation with given angle
  - `cancelFlowPreview()` — walk cancel flow to retention offer (read-only)

## Security

- Secrets only via environment variables
- No secrets committed; `.env` excluded from version control
- Demo mode available with fixture data (no real credentials)

## License

MIT
