---
id: "WIKI-02-001"
title: "Thread 1.4 Mesh Networking & Border Router Credential Sharing"
module: "wiki"
category: "02-protocols"
owner_bot: "Grok-CCO"
ecosystems: ["Thread", "Matter", "Apple Home", "Amazon Alexa", "IKEA"]
version: "2026.W45.1"
updated_at: "2026-11-04"
rsi_source: "initial-seed"
---

# Thread 1.4 Mesh Networking & Border Router Credential Sharing

## 1. Executive Summary
Thread is an IPv6-based, low-power wireless mesh networking protocol (IEEE 802.15.4) operating at 2.4 GHz. Thread 1.4 unifies multi-vendor Border Routers onto a single mesh network and enables direct cloud/internet pathing for end devices.

## 2. Node Roles in a Smart Habitat
- **Thread Border Router (TBR)**: Bridges Thread 802.15.4 mesh to Wi-Fi/Ethernet IPv6 backbone (e.g., Apple TV 4K Wi-Fi+Ethernet, HomePod mini/2nd Gen, Echo 4th Gen, IKEA DIRIGERA).
- **Router-Eligible End Device (REED)**: Mains-powered devices (smart plugs, switches, bulbs) that actively route mesh packets and extend coverage.
- **Sleepy End Device (SED)**: Battery-powered sensors, locks, and blinds that wake periodically to poll parent routers.

## 3. Golden Design Rule for SmartDrop Bundles
Every `HomeEasy SmartDrop` bundle containing >3 Thread SEDs (battery sensors) MUST include at least 1 mains-powered Thread Router (e.g., Eve Energy or Aqara Smart Plug) per 40 sqm to guarantee <50ms wake latency.
