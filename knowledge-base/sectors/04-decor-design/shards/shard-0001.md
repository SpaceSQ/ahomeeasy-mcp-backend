---
shard_id: shard-0001
sector: decor-design
sector_index: "04-decor-design"
shard_prefix: DD
owner_bot: Grok-CBO
owner_did: VGKCBO26110500000005IR
target_quota_p1: 160000
target_quota_p2: 1600000
version: 2026.W45.1
updated_at: 2026-11-05
rsi_source: initial-seed
sixd_tags:
  dwelling_type: [apartment, studio, duplex]
  spatial_zone: [living_room, bedroom, balcony]
  living_scenario: [entertainment, wellness]
  functional_domain: [lighting, storage]
  protocol_ecosystem: [dali, knx]
  user_and_commercial: [designer, homeowner, price_premium]
---

# Decor & Design — Genesis Shard 0001

> Owner: `Grok-CBO` (`VGKCBO26110500000005IR`)
> Quota: 160,000 → 1,600,000 entries
> MQTT: `1000home/v2/decor-design/#`

## [DD-000001] Layered living-room lighting scene

- **6D**: dwelling_type=`apartment,duplex`; spatial_zone=`living_room`; living_scenario=`entertainment`; functional_domain=`lighting`; protocol_ecosystem=`dali`; user_and_commercial=`designer,price_premium`
- **visual_transcription**: [灯光分层] 客厅三点式布光示意：主灯、洗墙灯带、落地阅读灯分别标注色温与照度，形成观影/会客/阅读三场景。
- **media_links**:
  - https://github.com/1000home/1000home-lake-decor-01/blob/main/images/DD-000001/layered-lighting.svg
- **action_hooks**:
  - curate_smart_vibe_drop(room_type=living_room, ecosystem=apple_home, vibe_style=cinematic_dark, rent_friendly=false)

## [DD-000002] Studio bedroom vertical storage wall

- **6D**: dwelling_type=`studio`; spatial_zone=`bedroom`; living_scenario=`sleep`; functional_domain=`storage`; protocol_ecosystem=`other`; user_and_commercial=`renter,price_budget`
- **visual_transcription**: [立面收纳] 开间卧室整墙垂直收纳的模块化组合，标注每个模块的进深与开合方向，兼顾睡眠与储物。
- **media_links**:
  - https://github.com/1000home/1000home-lake-decor-01/blob/main/images/DD-000002/vertical-storage-wall.svg
- **action_hooks**:
  - curate_smart_vibe_drop(room_type=bedroom, ecosystem=apple_home, vibe_style=minimal_clean, rent_friendly=true)
