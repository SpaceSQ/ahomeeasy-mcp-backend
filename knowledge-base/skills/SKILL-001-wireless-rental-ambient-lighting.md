---
id: "SKILL-001"
title: "Zero-Drill Renter-Friendly Adaptive Circadian & Cinema Lighting"
module: "skills"
owner_bot: "Grok-CTO"
wiring: "wireless"
space_type: ["apartment", "rental", "flat"]
scenario: ["lighting", "av-entertainment"]
persona: ["renter", "geek"]
difficulty: "easy"
version: "2026.W45.1"
updated_at: "2026-11-04"
rsi_source: "initial-seed"
---

# Zero-Drill Renter-Friendly Adaptive Circadian & Cinema Lighting

## 1. Scenario & Persona Fit
Designed for urban renters who cannot modify wall wiring or drill holes, delivering automatic circadian daylight transitions and zero-latency TV bias lighting.

## 2. Bill of Materials (BOM) & Protocol Topology
- **Hub**: Apple TV 4K or Echo 4th Gen (Thread Border Router).
- **Devices**: 2x Matter-over-Thread RGBIC Floor Lamps + 1x Thread TV Backlight Strip + 1x Wireless Magnetic Scene Button + 1x mmWave Presence Sensor.

## 3. Automation Logic (Trigger -> Condition -> Action)
- **Morning Focus (07:00-12:00)**: If `mmWave_Presence == Occupied` AND `Lux < 150`, ramp lights to `5000K @ 85%`.
- **Sunset Chill (18:30-22:30)**: Transition color temperature smoothly to `2700K @ 45%`.
- **Deposit-Safe Removal**: All magnetic mounts use 3M Command strips; 100% removable in 10 minutes upon lease end.
