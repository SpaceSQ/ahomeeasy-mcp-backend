---
shard_id: shard-0001
sector: home-living
sector_index: "02-home-living"
shard_prefix: HL
owner_bot: Grok-CCO
owner_did: VGKCCO26110500000002KJ
target_quota_p1: 200000
target_quota_p2: 2000000
version: 2026.W45.1
updated_at: 2026-11-05
rsi_source: initial-seed
sixd_tags:
  dwelling_type: [apartment, townhouse]
  spatial_zone: [kitchen, dining_room, study]
  living_scenario: [cleaning, work_from_home, dinner]
  functional_domain: [storage, cleaning]
  protocol_ecosystem: [wifi, bluetooth]
  user_and_commercial: [renter, homeowner, designer]
---

# Home Living — Genesis Shard 0001

> Owner: `Grok-CCO` (`VGKCCO26110500000002KJ`)
> Quota: 200,000 → 2,000,000 entries
> MQTT: `1000home/v2/home-living/#`

## [HL-000001] Rental-friendly kitchen storage layout

- **6D**: dwelling_type=`apartment,rental`; spatial_zone=`kitchen`; living_scenario=`cooking`; functional_domain=`storage`; protocol_ecosystem=`other`; user_and_commercial=`renter,price_budget`
- **visual_transcription**: [收纳图] 小户型厨房立面图中，上墙磁吸刀架与可拆卸隔板不破坏墙面，标注出免打孔的三种安装高度与承重上限。
- **media_links**:
  - https://github.com/1000home/1000home-lake-homeliving-01/blob/main/images/HL-000001/rental-kitchen-storage.svg
- **action_hooks**:
  - curate_smart_vibe_drop(room_type=kitchen, ecosystem=apple_home, vibe_style=minimal_clean, rent_friendly=true)

## [HL-000002] Home-office daylight rhythm

- **6D**: dwelling_type=`apartment,townhouse`; spatial_zone=`study`; living_scenario=`work_from_home`; functional_domain=`lighting`; protocol_ecosystem=`wifi`; user_and_commercial=`homeowner,price_mid`
- **visual_transcription**: [照度曲线] 书房全天自然光与人工补光的照度叠加曲线，标出 09:00 与 15:00 两个需补光的低谷时段。
- **media_links**:
  - https://github.com/1000home/1000home-lake-homeliving-01/blob/main/images/HL-000002/home-office-daylight.svg
- **action_hooks**:
  - curate_smart_vibe_drop(room_type=study, ecosystem=google_home, vibe_style=focus_clean, rent_friendly=false)
