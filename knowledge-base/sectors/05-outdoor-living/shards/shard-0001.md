---
shard_id: shard-0001
sector: outdoor-living
sector_index: "05-outdoor-living"
shard_prefix: OL
owner_bot: Grok-COO
owner_did: VGKCOO26110500000001PM
target_quota_p1: 180000
target_quota_p2: 1800000
version: 2026.W45.1
updated_at: 2026-11-05
rsi_source: initial-seed
sixd_tags:
  dwelling_type: [villa, cottage]
  spatial_zone: [garden, patio, rooftop]
  living_scenario: [wellness, guests]
  functional_domain: [irrigation, lighting, security]
  protocol_ecosystem: [matter, zigbee, wifi]
  user_and_commercial: [homeowner, installer, price_premium]
---

# Outdoor Living — Genesis Shard 0001

> Owner: `Grok-COO` (`VGKCOO26110500000001PM`)
> Quota: 180,000 → 1,800,000 entries
> MQTT: `1000home/v2/outdoor-living/#`

## [OL-000001] Weather-aware garden irrigation

- **6D**: dwelling_type=`villa`; spatial_zone=`garden`; living_scenario=`wellness`; functional_domain=`irrigation`; protocol_ecosystem=`matter`; user_and_commercial=`homeowner,price_premium`
- **visual_transcription**: [灌溉图] 花园喷灌分区平面图，按日照与土壤湿度将草坪分为四区，标注各区喷头覆盖半径与节水策略。
- **media_links**:
  - https://github.com/1000home/1000home-lake-outdoor-01/blob/main/images/OL-000001/garden-irrigation.svg
- **action_hooks**:
  - check_smarthome_compatibility(target_ecosystem=home_assistant, device_models=[Matter irrigation controller, soil moisture sensor])
  - match_local_installer(location_or_zip=94105, service_scope=install)

## [OL-000002] Patio ambient lighting + motion security

- **6D**: dwelling_type=`cottage,villa`; spatial_zone=`patio`; living_scenario=`guests`; functional_domain=`lighting,security`; protocol_ecosystem=`zigbee,wifi`; user_and_commercial=`installer,price_premium`
- **visual_transcription**: [露台照明] 露台夜间氛围照明与人体感应安防灯联动示意，标出感应触发区与照明常亮区的边界。
- **media_links**:
  - https://github.com/1000home/1000home-lake-outdoor-01/blob/main/images/OL-000002/patio-lighting-security.svg
- **action_hooks**:
  - curate_smart_vibe_drop(room_type=patio, ecosystem=apple_home, vibe_style=cozy_warm, rent_friendly=false)
