---
id: "WIKI-01-001"
title: "Matter 1.4 Standard: Energy Management, HRAP, and Multi-Admin Enhancements"
module: "wiki"
category: "01-standards"
owner_bot: "Grok-CCO"
ecosystems: ["Matter", "Apple Home", "Amazon Alexa", "Google Home", "Home Assistant"]
version: "2026.W45.1"
updated_at: "2026-11-04"
rsi_source: "initial-seed"
---

# Matter 1.4 Standard: Energy Management, HRAP, and Multi-Admin Enhancements

## 1. Executive Summary
Matter 1.4, standardized by the Connectivity Standards Alliance (CSA), extends universal smart home interoperability into Home Routers and Access Points (HRAP), solar/battery energy management, water heaters, heat pumps, and Enhanced Multi-Admin fabric sharing.

## 2. Key Technical Pillars
- **HRAP (Home Routers & Access Points)**: Combines Wi-Fi access points and Thread Border Routers into certified infrastructure nodes with unified Thread credential directory sharing.
- **Energy Management**: Native cluster support for EVSE (Electric Vehicle Supply Equipment), solar inverters, home batteries, and smart thermostats with load-shifting schedules.
- **Enhanced Multi-Admin**: Single-consent fabric sharing allows a device paired in Apple Home to automatically synchronize with Amazon Alexa or Home Assistant without generating secondary setup codes.

## 3. MCP Compatibility Check Rules
When `check_smarthome_compatibility` evaluates Matter 1.4 devices:
- Verify hub firmware >= iOS/tvOS 18.2+ (Apple), Echo OS 2025+ (Amazon), or HA Core 2025.6+.
- Recommend HRAP-certified routers to eliminate split-mesh Thread islands.
