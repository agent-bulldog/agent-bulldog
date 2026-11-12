# Agent Bulldog — Requirements (EARS Style)

## Glossary

| Term | Definition |
|------|------------|
| **Connector** | Module implementing `listPlans`, `currentBill`, `negotiate`, `cancelFlowPreview` for a service type |
| **Negotiation angle** | Strategy text (e.g., "discount loyal customer", "switching to competitor") |
| **Bluff-cancel** | Walk the cancellation flow to the retention offer without confirming cancellation |
| **Approval gate** | Explicit user confirmation before any action affecting real systems |
| **Like-for-like** | Insurance comparison using identical coverage, deductibles, and insurer rating |

## Requirements

1. WHEN the user runs `node src/cli.js list-services`, THE SYSTEM SHALL list all configured service types with their connector names.

2. WHEN the user runs `node src/cli.js compare <service>`, THE SYSTEM SHALL fetch current bill and industry prices, then display savings opportunities.

3. WHEN the user runs `node src/cli.js negotiate <service> --angle "..."`, THE SYSTEM SHALL execute one negotiation attempt via the connector's `negotiate` method.

4. WHEN a negotiation attempt fails or yields no improvement, THE SYSTEM SHALL schedule a retry in 6 hours or next business hours, whichever is later.

5. WHEN a retry is executed, THE SYSTEM SHALL use a different negotiation angle than previous attempts.

6. WHEN the same service has been negotiated 5 times without improvement, THE SYSTEM SHALL report "provider will not budge" and stop retrying.

7. WHEN the user initiates a bluff-cancel (`node src/cli.js cancel-preview <service>`), THE SYSTEM SHALL walk the cancellation flow to the retention offer and STOP before confirming.

8. WHEN the user runs `node src/cli.js approve <service> <action>`, THE SYSTEM SHALL execute the action (a negotiation attempt or applying an accepted offer) only after explicit approval. A cancellation SHALL never be confirmed, with or without approval.

9. WHEN comparing insurance quotes, THE SYSTEM SHALL verify like-for-like coverage (same deductible, same coverage limits, same insurer rating).

10. WHEN a negotiation yields a lower price, THE SYSTEM SHALL record the new rate and compute cumulative savings.

11. WHEN the user runs `node src/cli.js report`, THE SYSTEM SHALL display total estimated annual savings by service.

12. WHEN no service credentials are present, THE SYSTEM SHALL fall back to demo mode with fixture data.

13. WHEN an error occurs in a connector, THE SYSTEM SHALL provide a human-readable message without stack traces.
