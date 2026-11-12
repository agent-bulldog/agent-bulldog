# Agent Bulldog — Tasks

(a) **Connector interface + streaming connector with fixture data**
- [x] T1.1: Define `src/connectors/index.js` with connector interface (R1, R2, R3, R7, R12)
- [x] T1.2: Implement `src/connectors/streaming.js` with fixture data (R1, R12)

(b) **Price comparison**
- [x] T2.1: Implement `src/comparison/indexer.js` to fetch and compare prices (R2, R9)

(c) **Negotiation engine + retry scheduler**
- [x] T3.1: Implement `src/negotiation/engine.js` for single negotiation attempt (R3, R4, R6)
- [x] T3.2: Implement `src/negotiation/scheduler.js` for retries with fresh angles (R4, R5, R6)

(d) **Bluff-cancel flow**
- [x] T4.1: Implement `cancelFlowPreview` in streaming connector (R7) — already existed in streaming.js; verified R7 compliance (returns `confirmed: false` after 4 steps to $12.99 retention offer)
- [x] T4.2: Add `cancel-preview` CLI command (R7) — added `src/cli.js` with `cancel-preview <service>` command and `test/cli/cancel-preview.test.js`

(e) **Approval gate + CLI**
- [ ] T5.1: Implement `src/approval/gate.js` (R8)
- [ ] T5.2: Wire approval gate to CLI (R1, R8)

(f) **Savings report**
- [ ] T6.1: Implement `src/savings.js` for tracking and reporting (R10, R11)

(g) **Smoke tests**
- [ ] T7.1: Test connector interface contract (R1)
- [ ] T7.2: Test comparison with fixture data (R2, R9)
- [ ] T7.3: Test negotiation engine (R3, R4, R5, R6)
- [ ] T7.4: Test bluff-cancel preview (R7)
- [ ] T7.5: Test approval gate (R8)
- [ ] T7.6: Test savings report (R10, R11)
- [ ] T7.7: Test CLI commands end-to-end (R1, R2, R3, R7, R10, R11, R12)

Implementation is a separate step; do not write application code now.
