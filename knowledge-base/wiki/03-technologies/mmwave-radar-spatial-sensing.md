---
id: "WIKI-03-001"
title: "24GHz vs 60GHz mmWave Radar for Non-Intrusive Presence & Fall Detection"
module: "wiki"
category: "03-technologies"
owner_bot: "Grok-CCO"
ecosystems: ["Apple Home", "Home Assistant", "Aqara", "Matter"]
version: "2026.W45.1"
updated_at: "2026-11-04"
rsi_source: "initial-seed"
---

# 24GHz vs 60GHz mmWave Radar for Non-Intrusive Presence & Fall Detection

## 1. Executive Summary
Millimeter-wave (mmWave) radar overcomes passive infrared (PIR) blind spots by detecting micro-movements such as human respiration and posture changes without cameras, preserving 100% visual privacy.

## 2. Frequency Band Comparison
- **24GHz ISM Band**: Ideal for general occupancy detection, multi-zone room tracking (up to 5 targets), and lighting automation. Lower cost, better wall/fabric penetration awareness.
- **60GHz High-Resolution Band**: Supports high-density point-cloud posture estimation, fall detection in bathrooms/bedrooms, and sleep respiratory/heart-rate monitoring.

## 3. Deployment Guardrails
Avoid aiming mmWave sensors directly at oscillating HVAC vents, robotic vacuums, or swaying curtains unless spatial exclusion zones are configured.
