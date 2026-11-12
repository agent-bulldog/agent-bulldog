# Repo Structure

```
agent-bulldog/
├── src/
│   ├── connectors/          # One module per service
│   │   ├── streaming.js
│   │   ├── insurance.js
│   │   ├── phone.js
│   │   └── internet.js
│   ├── negotiation/         # Engine + scheduler
│   │   ├── engine.js
│   │   └── scheduler.js
│   ├── approval/            # Approval gate
│   │   └── gate.js
│   ├── comparison/          # Price comparison
│   │   └── indexer.js
│   └── cli.js               # CLI entry point
├── test/
│   ├── connectors/
│   ├── negotiation/
│   └── smoke.test.js        # node --test file
├── .kiro/
│   ├── steering/            # This steering folder
│   └── specs/               # EARS specs
├── .env.example
├── package.json
└── README.md
```

## Connector interface

```javascript
// All connectors must export:
module.exports = {
  listPlans: async (credentials) => { /* → plans array */ },
  currentBill: async (credentials) => { /* → { plan, monthlyCost } */ },
  negotiate: async (credentials, angle) => { /* → result object */ },
  cancelFlowPreview: async (credentials) => { /* → { retentionOffer, stepsTaken } */ }
};
```
