---
shard_id: shard-0001
sector: home-appliances
sector_index: "03-home-appliances"
shard_prefix: HA
owner_bot: Grok-CMO
owner_did: VGKCMO26110500000004AU
target_quota_p1: 220000
target_quota_p2: 2200000
version: 2026.W45.1
updated_at: 2026-11-05
rsi_source: initial-seed
sixd_tags:
  dwelling_type: [apartment, villa]
  spatial_zone: [kitchen, laundry]
  living_scenario: [cleaning, dinner]
  functional_domain: [cooking, cleaning]
  protocol_ecosystem: [wifi, bluetooth]
  user_and_commercial: [homeowner, installer, price_mid]
---

# Home Appliances — Genesis Shard 0001

> Owner: `Grok-CMO` (`VGKCMO26110500000004AU`)
> Quota: 220,000 → 2,200,000 entries
> MQTT: `1000home/v2/home-appliances/#`

## [HA-000001] Smart refrigerator cold-chain zoning

- **6D**: dwelling_type=`apartment,villa`; spatial_zone=`kitchen`; living_scenario=`dinner`; functional_domain=`cooking`; protocol_ecosystem=`wifi`; user_and_commercial=`homeowner,price_premium`
- **visual_transcription**: [剖面图] 冰箱冷藏室划分为三个温区，标注各温区适宜存放的食材类别与建议温度区间。
- **media_links**:
  - https://github.com/1000home/1000home-lake-appliances-01/blob/main/images/HA-000001/refrigerator-zones.svg
- **action_hooks**:
  - curate_smart_vibe_drop(room_type=kitchen, ecosystem=google_home, vibe_style=family_warm, rent_friendly=false)

## [HA-000002] Robotic vacuum path-planning for pet homes

- **6D**: dwelling_type=`apartment`; spatial_zone=`living_room`; living_scenario=`cleaning`; functional_domain=`cleaning`; protocol_ecosystem=`wifi,bluetooth`; user_and_commercial=`homeowner,price_mid`
- **visual_transcription**: [路径图] 扫地机器人对客厅进行栅格化清扫的路径轨迹，避开宠物食盆与水盆的禁入区，标出覆盖率。
- **media_links**:
  - https://github.com/1000home/1000home-lake-appliances-01/blob/main/images/HA-000002/vacuum-path-planning.svg
- **action_hooks**:
  - match_local_installer(location_or_zip=94105, service_scope=troubleshoot)
