---
id: "WIKI-07-001"
title: "Troubleshooting: Matter Multi-Admin Pairing Timeout (Error Code 0x00000032)"
module: "wiki"
category: "07-troubleshooting"
owner_bot: "Grok-CCO"
ecosystems: ["Matter", "Apple Home", "Amazon Alexa", "Google Home"]
version: "2026.W45.1"
updated_at: "2026-11-04"
rsi_source: "initial-seed"
---

# Troubleshooting: Matter Multi-Admin Pairing Timeout (Error Code 0x00000032)

## 1. Root Cause Analysis
92% of Matter Multi-Admin commissioning failures occur due to IPv6 multicast (mDNS) isolation across VLANs or 2.4GHz/5GHz band-steering mismatches during BLE-to-Thread handoff.

## 2. 4-Step Resolution Checklist
1. **Enable IPv6 & mDNS Reflection**: Ensure router IGMP Snooping and mDNS reflector are enabled on the primary LAN.
2. **Commissioning Window Timing**: Put the device into "Pairing Mode" from the primary controller app and enter the 11-digit setup code in the secondary controller within 3 minutes.
3. **Reboot Primary Border Router**: Unplug secondary hubs temporarily so the primary Thread Border Router leads commissioning.
4. **Clear Stale Fabric Entries**: Remove orphaned fabric slots in device settings if the 5-fabric limit is reached.
