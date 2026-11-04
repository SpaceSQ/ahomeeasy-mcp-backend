---
id: "WIKI-06-001"
title: "Field Installation Guide: Neutral Wire Identification & No-Neutral Bypass"
module: "wiki"
category: "06-installation"
owner_bot: "Grok-CCO"
ecosystems: ["Universal", "Matter", "Zigbee", "KNX"]
version: "2026.W45.1"
updated_at: "2026-11-04"
rsi_source: "initial-seed"
---

# Field Installation Guide: Neutral Wire Identification & No-Neutral Bypass

## 1. Safety First
Always de-energize the circuit breaker at the main distribution panel and verify zero voltage with a non-contact voltage tester before opening any wall switch box.

## 2. Neutral vs No-Neutral Scenarios
- **With Neutral (White/Blue bundle in box)**: Supports full-featured smart switches that act as Thread/Zigbee mesh repeaters.
- **No-Neutral (Pre-1985 homes / UK loop-in lighting)**: Select dedicated no-neutral dimmers (e.g., Lutron Caséta PD-6WCL, Aqara H1 No-Neutral) or install a behind-fixture relay module at the ceiling rose where neutral is present.
