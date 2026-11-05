---
id: LAKE-TAGGING-SPEC
title: 千万级住宅生活知识湖六维标注与分片存储规范
module: lake
owner_bot: Grok-COO
version: 2026.W45.1
updated_at: 2026-11-05
rsi_source: initial-seed
spec_scope: ["tagging", "sharding", "media-links", "visual-transcription"]
---

# 千万级知识湖六维标注与分片存储规范（LAKE_TAGGING_SPEC v0.1）

> 目标容量：**1,000,000 → 10,000,000 条**结构化知识词条，放射式水平分片，严格向后兼容现有 7 个 MCP 工具与 S2彩虹桥 2.0 数据面。

本规范定义「母体仓库（Master Hub）→ 水平分片卫星仓库（Spoke Shard Repos）」的放射式扩容规则、媒体外链与图文转译规则，并完整收录**六维必选基因标签词典**（6D Taxonomy）。所有分片文件必须遵循 `_LAKE_SHARD_TEMPLATE.md` 标准模板。

---

## 1. 母体仓库与水平分片卫星仓库（放射式扩容规则）

### 1.1 拓扑

```
Master Hub (母体仓库)
  └── github.com/SpaceSQ/ahomeeasy-mcp-backend
        └── knowledge-base/          # 元数据、规范、主索引、创世分片
              ├── LAKE_TAGGING_SPEC.md
              ├── _LAKE_SHARD_TEMPLATE.md
              ├── _federation_chain/master-lake-index.json
              └── sectors/{sector}/shards/shard-0001.md

Spoke Shard Repos (水平分片卫星仓库，放射式)
  ├── github.com/1000home/1000home-lake-smarthome-01
  ├── github.com/1000home/1000home-lake-smarthome-02
  ├── ...（每仓库承载一个分片区间，扩容时追加序号）
  ├── github.com/1000home/1000home-lake-homeliving-01
  ├── github.com/1000home/1000home-lake-appliances-01
  ├── github.com/1000home/1000home-lake-decor-01
  └── github.com/1000home/1000home-lake-outdoor-01
```

### 1.2 扩容规则

1. **先分片、后扩仓**：每个类目先以 `shard-0001`（创世分卷，本仓库内置）起步，条目量达到该分卷配额阈值后，新建 `shard-0002`，并挂载到新的卫星仓库。
2. **放射式命名**：卫星仓库命名 `1000home-lake-{sector}-{NN}`，`{sector}` 取 `smarthome | homeliving | appliances | decor | outdoor`，`{NN}` 为两位顺序号（从 `01` 起）。
3. **一仓一分卷**：单个卫星仓库仅承载一个分片区间，避免跨仓 Merge 冲突；母体仓库只保存创世分卷与索引，不保存海量正文。
4. **母体不膨胀**：当母体仓库 `sectors/*/shards/` 内文件数超过阈值，只保留 `shard-0001` + 滚动索引，后续分卷全部外迁到卫星仓库，母体仅登记 `spoke_repo_url` 映射。
5. **挂载即上链**：每个新卫星仓库由 `BRAND_TITAN` 通过 `mqtt_and_federation_hub(anchor)` 或 `/api/s2rb(anchor)` 锚定进区块链联邦，`master-lake-index.json` 同步更新映射表。
6. **配额守恒**：五大类目目标配额加总恒等于 `1,000,000 → 10,000,000`，任何扩容不得突破单类目配额上限。

### 1.3 分卷容量与配额

| 类目 | 前缀 | Owner | 目标配额 P1 | 目标配额 P2 |
|---|---|---|---|---|
| 01-smart-home | `SH` | Grok-CTO | 240,000 | 2,400,000 |
| 02-home-living | `HL` | Grok-CCO | 200,000 | 2,000,000 |
| 03-home-appliances | `HA` | Grok-CMO | 220,000 | 2,200,000 |
| 04-decor-design | `DD` | Grok-CBO | 160,000 | 1,600,000 |
| 05-outdoor-living | `OL` | Grok-COO | 180,000 | 1,800,000 |
| **合计** | | | **1,000,000** | **10,000,000** |

每个分卷建议承载 **1,000 条**（可配置），因此 P1 阶段全湖约 1,000 个分卷，P2 阶段约 10,000 个分卷。

---

## 2. 媒体外链与图文转译规则

### 2.1 `media_links` 媒体外链规则

- `media_links` 必须是**绝对 URL**（图片、SVG 示意图、PDF 规格页），指向卫星仓库 `images/` 或受信 CDN。
- 禁止内嵌 base64 大图；正文只保留外链锚点，控制母体仓库体积。
- 每个词条 `media_links` 建议 0–4 个；超过 4 个时拆分到「附录」条目。
- 外链必须可追溯：URL 路径包含 `{shard_id}/{entry_id}/` 前缀，便于审计与反查。

### 2.2 `visual_transcription` 图文转译规则

- 每一张外链图都必须配 `visual_transcription`（英文为主，可附中文），把图片信息转成纯文本，供无视觉通道的 AI 智能体检索。
- 转译格式：`[图类型] 主体描述 + 关键数值 + 结论`。
- 无图词条：`visual_transcription` 写 `n/a`（但字段必须存在）。
- 转译文本参与六维标签检索与全文检索，是**可检索的**，不是仅展示字段。

---

## 3. 六维必选基因标签词典（6D Taxonomy）

> 每个词条**必须**且**仅能**从下列受控词表取值；未知值一律归入 `other`，不得自造标签。六维均必选，缺一维则该词条不挂载索引。

### 3.1 `dwelling_type` 户型

| 值 | 说明 |
|---|---|
| `apartment` | 普通公寓 / 高层住宅 |
| `studio` | 开间 / 单间 |
| `villa` | 独栋别墅 |
| `townhouse` | 联排住宅 |
| `duplex` | 复式 / 跃层 |
| `penthouse` | 顶层公寓 |
| `cottage` | 小木屋 / 度假屋 |
| `rental` | 租赁住房（交叉标签） |
| `other` | 其他 |

### 3.2 `spatial_zone` 空间

| 值 | 说明 |
|---|---|
| `living_room` | 客厅 |
| `bedroom` | 卧室 |
| `kitchen` | 厨房 |
| `bathroom` | 卫浴 |
| `dining_room` | 餐厅 |
| `study` | 书房 |
| `balcony` | 阳台 |
| `corridor` | 玄关 / 走廊 |
| `garage` | 车库 |
| `garden` | 花园 |
| `patio` | 露台 |
| `rooftop` | 屋顶 |
| `other` | 其他 |

### 3.3 `living_scenario` 场景

| 值 | 说明 |
|---|---|
| `morning_routine` | 晨起 |
| `sleep` | 睡眠 |
| `dinner` | 用餐 |
| `entertainment` | 娱乐 / 影音 |
| `work_from_home` | 居家办公 |
| `cleaning` | 清洁 |
| `guests` | 待客 |
| `away_from_home` | 离家 |
| `wellness` | 康养 |
| `cooking` | 烹饪 |
| `other` | 其他 |

### 3.4 `functional_domain` 功能

| 值 | 说明 |
|---|---|
| `lighting` | 照明 |
| `climate` | 温控 / 新风 |
| `security` | 安防 |
| `entertainment` | 影音娱乐 |
| `cleaning` | 清洁 |
| `cooking` | 烹饪 |
| `storage` | 收纳 |
| `irrigation` | 灌溉 |
| `energy` | 能源管理 |
| `communication` | 通讯 / 门禁 |
| `other` | 其他 |

### 3.5 `protocol_ecosystem` 协议生态

| 值 | 说明 |
|---|---|
| `matter` | Matter 标准 |
| `thread` | Thread 网状 |
| `zigbee` | Zigbee |
| `z_wave` | Z-Wave |
| `wifi` | Wi-Fi |
| `bluetooth` | 蓝牙 / BLE |
| `knx` | KNX 有线总线 |
| `dali` | DALI 调光总线 |
| `modbus` | Modbus |
| `homekit` | Apple HomeKit |
| `other` | 其他 |

### 3.6 `user_and_commercial` 人群 / 安装 / 价格带

| 值 | 说明 |
|---|---|
| `renter` | 租户（免布线优先） |
| `homeowner` | 业主 |
| `diy` | 自装用户 |
| `installer` | 安装商 |
| `designer` | 设计师 |
| `price_budget` | 经济带 |
| `price_mid` | 中端带 |
| `price_premium` | 高端带 |
| `price_luxury` | 奢侈带 |
| `retrofit` | 改造（存量房） |
| `other` | 其他 |

---

## 4. 词条锚点与动作钩子

- 每条词条必须有全局唯一锚点 `[{SECTOR_PREFIX}-{NNNNNN}]`（如 `[SH-000001]`），6 位零填充序号。
- `action_hooks` 是可被 MCP 工具直接消费的**示范钩子**，格式 `tool_name(arg1=value, arg2=value)`；仅指向现有 7 个工具，不虚构新工具。
- 六维标签写入 YAML 头的 `sixd_tags`（对象），正文词条同步在 `- **6D**:` 行复述，保证文件离线可读、可 grep。

---

## 5. 标准模板

新建任何分卷，一律复制 `_LAKE_SHARD_TEMPLATE.md` 并填写六维标签与词条。模板见同目录 `knowledge-base/_LAKE_SHARD_TEMPLATE.md`。
