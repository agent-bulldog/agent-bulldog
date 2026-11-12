# Agent Bulldog — Product Overview

**Project**: Kiroween 2026, Frankenstein category  
**Goal**: Generalized AI negotiation agent that connects to user services (streaming, insurance, phone, internet), compares prices, and negotiates better rates.

## Core behavior

- Connects to user services via pluggable connectors
- Compares current bills against industry prices
- Negotiates better rates with customer service representatives
- Reports savings and tracks progress over time

## Hard rules (non-negotiable)

1. **Approval-gated**: Nothing is submitted, sent, or changed without explicit user approval
2. **Bluff-cancel only**: Walk a cancel flow to the retention offer and STOP before confirming anything; no code path may confirm a cancellation
3. **Like-for-like insurance comparisons**: Same coverage, same deductibles, same insurer rating
4. **Fresh angle retries**: Every retry (6 hours or next business hours) uses a new negotiation angle
