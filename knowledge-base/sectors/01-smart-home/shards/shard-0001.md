---
shard_id: shard-0001
sector: smart-home
sector_index: "01-smart-home"
shard_prefix: SH
owner_bot: Grok-CTO
owner_did: VGKCTO26110500000003SU
target_quota_p1: 240000
target_quota_p2: 2400000
version: 2026.W45.1
updated_at: 2026-11-05
rsi_source: initial-seed
sixd_tags:
  dwelling_type: [apartment, villa, rental]
  spatial_zone: [living_room, bedroom]
  living_scenario: [entertainment, sleep]
  functional_domain: [lighting, climate]
  protocol_ecosystem: [matter, thread, zigbee]
  user_and_commercial: [renter, homeowner, installer]
---

# Smart Home — Genesis Shard 0001

> Owner: `Grok-CTO` (`VGKCTO26110500000003SU`)
> Quota: 240,000 → 2,400,000 entries
> MQTT: `1000home/v2/smart-home/#`

## [SH-000001] Matter over Thread ambient lighting preset

- **6D**: dwelling_type=`apartment,rental`; spatial_zone=`living_room`; living_scenario=`entertainment`; functional_domain=`lighting`; protocol_ecosystem=`matter,thread`; user_and_commercial=`renter,price_budget`
- **visual_transcription**: [示意图] 客厅平面图中，三盏支持 Matter over Thread 的智能灯泡组成本地网状网络，由一台 Thread Border Router 汇聚，无需中性线即可调光。
- **media_links**:
  - https://github.com/1000home/1000home-lake-smarthome-01/blob/main/images/SH-000001/matter-thread-ambient.svg
- **action_hooks**:
  - curate_smart_vibe_drop(room_type=living_room, ecosystem=apple_home, vibe_style=cozy_warm, rent_friendly=true)
  - check_smarthome_compatibility(target_ecosystem=apple_home, device_models=[Matter over Thread bulb, Thread border router])

## [SH-000002] Zigbee mesh bedroom climate sensing

- **6D**: dwelling_type=`apartment`; spatial_zone=`bedroom`; living_scenario=`sleep`; functional_domain=`climate`; protocol_ecosystem=`zigbee`; user_and_commercial=`homeowner,price_mid`
- **visual_transcription**: [传感器拓扑] 卧室温湿度传感器经 Zigbee 网状中继回传到网关，展示三层中继路径与信号衰减标注，结论为需在走廊部署一个中继节点。
- **media_links**:
  - https://github.com/1000home/1000home-lake-smarthome-01/blob/main/images/SH-000002/zigbee-mesh-climate.svg
- **action_hooks**:
  - check_smarthome_compatibility(target_ecosystem=home_assistant, device_models=[Zigbee temperature sensor, Zigbee coordinator])
  - match_local_installer(location_or_zip=94105, service_scope=install)
