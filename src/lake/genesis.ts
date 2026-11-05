/**
 * 千万级住宅生活知识湖 —— 五大类目创世第 001 号标准分卷（内存镜像）。
 *
 * 与 knowledge-base/sectors/*\/shards/shard-0001.md 一一对应，作为 MCP 工具在
 * Serverless 运行时（无文件系统）下的确定性检索数据源。每个词条携带完整六维标签、
 * 图文转译、媒体外链与动作钩子示范。
 */
import {
  LAKE_QUOTAS,
  LAKE_TOTAL_P1,
  LAKE_TOTAL_P2,
  SIX_D_DIMENSIONS,
  SIX_D_DICTIONARY,
  type SixDDimension,
  type SixDTags,
} from "./taxonomy.js";
import type { Sector } from "../tidal-db/engine.js";

export interface LakeEntry {
  id: string;
  title: string;
  summary: string;
  sixd: SixDTags;
  mediaLinks: string[];
  visualTranscription: string;
  actionHooks: string[];
}

export interface LakeShard {
  shardId: string;
  sector: Sector;
  path: string;
  prefix: string;
  ownerBot: string;
  ownerDid: string;
  quotaP1: number;
  quotaP2: number;
  entries: LakeEntry[];
}

function e(
  id: string,
  title: string,
  summary: string,
  sixd: SixDTags,
  mediaLinks: string[],
  visualTranscription: string,
  actionHooks: string[],
): LakeEntry {
  return { id, title, summary, sixd, mediaLinks, visualTranscription, actionHooks };
}

/** 五大类目创世分卷（含五位 Grok 高管领衔，COO 亲征第 5 类目 outdoor-living）。 */
export const LAKE_GENESIS_SHARDS: LakeShard[] = [
  {
    shardId: "shard-0001",
    sector: "smart-home",
    path: "knowledge-base/sectors/01-smart-home/shards/shard-0001.md",
    prefix: "SH",
    ownerBot: "Grok-CTO",
    ownerDid: "VGKCTO26110500000003SU",
    quotaP1: 240_000,
    quotaP2: 2_400_000,
    entries: [
      e(
        "SH-000001",
        "Matter over Thread ambient lighting preset",
        "Renter-friendly, no-neutral-wire ambient lighting pattern using Matter over Thread bulbs in the living room.",
        {
          dwelling_type: ["apartment", "rental"],
          spatial_zone: ["living_room"],
          living_scenario: ["entertainment"],
          functional_domain: ["lighting"],
          protocol_ecosystem: ["matter", "thread"],
          user_and_commercial: ["renter", "price_budget"],
        },
        ["https://github.com/1000home/1000home-lake-smarthome-01/blob/main/images/SH-000001/matter-thread-ambient.svg"],
        "[示意图] 客厅平面图中，三盏支持 Matter over Thread 的智能灯泡组成本地网状网络，由一台 Thread Border Router 汇聚，无需中性线即可调光。",
        [
          "curate_smart_vibe_drop(room_type=living_room, ecosystem=apple_home, vibe_style=cozy_warm, rent_friendly=true)",
          "check_smarthome_compatibility(target_ecosystem=apple_home, device_models=[Matter over Thread bulb, Thread border router])",
        ],
      ),
      e(
        "SH-000002",
        "Zigbee mesh bedroom climate sensing",
        "Bedroom temperature/humidity sensing over a Zigbee mesh with a relay node in the corridor.",
        {
          dwelling_type: ["apartment"],
          spatial_zone: ["bedroom"],
          living_scenario: ["sleep"],
          functional_domain: ["climate"],
          protocol_ecosystem: ["zigbee"],
          user_and_commercial: ["homeowner", "price_mid"],
        },
        ["https://github.com/1000home/1000home-lake-smarthome-01/blob/main/images/SH-000002/zigbee-mesh-climate.svg"],
        "[传感器拓扑] 卧室温湿度传感器经 Zigbee 网状中继回传到网关，展示三层中继路径与信号衰减标注，结论为需在走廊部署一个中继节点。",
        [
          "check_smarthome_compatibility(target_ecosystem=home_assistant, device_models=[Zigbee temperature sensor, Zigbee coordinator])",
          "match_local_installer(location_or_zip=94105, service_scope=install)",
        ],
      ),
    ],
  },
  {
    shardId: "shard-0001",
    sector: "home-living",
    path: "knowledge-base/sectors/02-home-living/shards/shard-0001.md",
    prefix: "HL",
    ownerBot: "Grok-CCO",
    ownerDid: "VGKCCO26110500000002KJ",
    quotaP1: 200_000,
    quotaP2: 2_000_000,
    entries: [
      e(
        "HL-000001",
        "Rental-friendly kitchen storage layout",
        "No-drill magnetic and removable storage for a small rental kitchen.",
        {
          dwelling_type: ["apartment", "rental"],
          spatial_zone: ["kitchen"],
          living_scenario: ["cooking"],
          functional_domain: ["storage"],
          protocol_ecosystem: ["other"],
          user_and_commercial: ["renter", "price_budget"],
        },
        ["https://github.com/1000home/1000home-lake-homeliving-01/blob/main/images/HL-000001/rental-kitchen-storage.svg"],
        "[收纳图] 小户型厨房立面图中，上墙磁吸刀架与可拆卸隔板不破坏墙面，标注出免打孔的三种安装高度与承重上限。",
        ["curate_smart_vibe_drop(room_type=kitchen, ecosystem=apple_home, vibe_style=minimal_clean, rent_friendly=true)"],
      ),
      e(
        "HL-000002",
        "Home-office daylight rhythm",
        "Daylight and supplemental lighting curve for a work-from-home study.",
        {
          dwelling_type: ["apartment", "townhouse"],
          spatial_zone: ["study"],
          living_scenario: ["work_from_home"],
          functional_domain: ["lighting"],
          protocol_ecosystem: ["wifi"],
          user_and_commercial: ["homeowner", "price_mid"],
        },
        ["https://github.com/1000home/1000home-lake-homeliving-01/blob/main/images/HL-000002/home-office-daylight.svg"],
        "[照度曲线] 书房全天自然光与人工补光的照度叠加曲线，标出 09:00 与 15:00 两个需补光的低谷时段。",
        ["curate_smart_vibe_drop(room_type=study, ecosystem=google_home, vibe_style=focus_clean, rent_friendly=false)"],
      ),
    ],
  },
  {
    shardId: "shard-0001",
    sector: "home-appliances",
    path: "knowledge-base/sectors/03-home-appliances/shards/shard-0001.md",
    prefix: "HA",
    ownerBot: "Grok-CMO",
    ownerDid: "VGKCMO26110500000004AU",
    quotaP1: 220_000,
    quotaP2: 2_200_000,
    entries: [
      e(
        "HA-000001",
        "Smart refrigerator cold-chain zoning",
        "Three-zone cold-chain layout for a smart refrigerator.",
        {
          dwelling_type: ["apartment", "villa"],
          spatial_zone: ["kitchen"],
          living_scenario: ["dinner"],
          functional_domain: ["cooking"],
          protocol_ecosystem: ["wifi"],
          user_and_commercial: ["homeowner", "price_premium"],
        },
        ["https://github.com/1000home/1000home-lake-appliances-01/blob/main/images/HA-000001/refrigerator-zones.svg"],
        "[剖面图] 冰箱冷藏室划分为三个温区，标注各温区适宜存放的食材类别与建议温度区间。",
        ["curate_smart_vibe_drop(room_type=kitchen, ecosystem=google_home, vibe_style=family_warm, rent_friendly=false)"],
      ),
      e(
        "HA-000002",
        "Robotic vacuum path-planning for pet homes",
        "Grid cleaning path that avoids pet food and water bowls.",
        {
          dwelling_type: ["apartment"],
          spatial_zone: ["living_room"],
          living_scenario: ["cleaning"],
          functional_domain: ["cleaning"],
          protocol_ecosystem: ["wifi", "bluetooth"],
          user_and_commercial: ["homeowner", "price_mid"],
        },
        ["https://github.com/1000home/1000home-lake-appliances-01/blob/main/images/HA-000002/vacuum-path-planning.svg"],
        "[路径图] 扫地机器人对客厅进行栅格化清扫的路径轨迹，避开宠物食盆与水盆的禁入区，标出覆盖率。",
        ["match_local_installer(location_or_zip=94105, service_scope=troubleshoot)"],
      ),
    ],
  },
  {
    shardId: "shard-0001",
    sector: "decor-design",
    path: "knowledge-base/sectors/04-decor-design/shards/shard-0001.md",
    prefix: "DD",
    ownerBot: "Grok-CBO",
    ownerDid: "VGKCBO26110500000005IR",
    quotaP1: 160_000,
    quotaP2: 1_600_000,
    entries: [
      e(
        "DD-000001",
        "Layered living-room lighting scene",
        "Three-point layered lighting (main, wall-wash, reading) for the living room.",
        {
          dwelling_type: ["apartment", "duplex"],
          spatial_zone: ["living_room"],
          living_scenario: ["entertainment"],
          functional_domain: ["lighting"],
          protocol_ecosystem: ["dali"],
          user_and_commercial: ["designer", "price_premium"],
        },
        ["https://github.com/1000home/1000home-lake-decor-01/blob/main/images/DD-000001/layered-lighting.svg"],
        "[灯光分层] 客厅三点式布光示意：主灯、洗墙灯带、落地阅读灯分别标注色温与照度，形成观影/会客/阅读三场景。",
        ["curate_smart_vibe_drop(room_type=living_room, ecosystem=apple_home, vibe_style=cinematic_dark, rent_friendly=false)"],
      ),
      e(
        "DD-000002",
        "Studio bedroom vertical storage wall",
        "Modular full-height storage wall for a studio bedroom.",
        {
          dwelling_type: ["studio"],
          spatial_zone: ["bedroom"],
          living_scenario: ["sleep"],
          functional_domain: ["storage"],
          protocol_ecosystem: ["other"],
          user_and_commercial: ["renter", "price_budget"],
        },
        ["https://github.com/1000home/1000home-lake-decor-01/blob/main/images/DD-000002/vertical-storage-wall.svg"],
        "[立面收纳] 开间卧室整墙垂直收纳的模块化组合，标注每个模块的进深与开合方向，兼顾睡眠与储物。",
        ["curate_smart_vibe_drop(room_type=bedroom, ecosystem=apple_home, vibe_style=minimal_clean, rent_friendly=true)"],
      ),
    ],
  },
  {
    shardId: "shard-0001",
    sector: "outdoor-living",
    path: "knowledge-base/sectors/05-outdoor-living/shards/shard-0001.md",
    prefix: "OL",
    ownerBot: "Grok-COO",
    ownerDid: "VGKCOO26110500000001PM",
    quotaP1: 180_000,
    quotaP2: 1_800_000,
    entries: [
      e(
        "OL-000001",
        "Weather-aware garden irrigation",
        "Four-zone garden irrigation keyed to sun exposure and soil moisture.",
        {
          dwelling_type: ["villa"],
          spatial_zone: ["garden"],
          living_scenario: ["wellness"],
          functional_domain: ["irrigation"],
          protocol_ecosystem: ["matter"],
          user_and_commercial: ["homeowner", "price_premium"],
        },
        ["https://github.com/1000home/1000home-lake-outdoor-01/blob/main/images/OL-000001/garden-irrigation.svg"],
        "[灌溉图] 花园喷灌分区平面图，按日照与土壤湿度将草坪分为四区，标注各区喷头覆盖半径与节水策略。",
        [
          "check_smarthome_compatibility(target_ecosystem=home_assistant, device_models=[Matter irrigation controller, soil moisture sensor])",
          "match_local_installer(location_or_zip=94105, service_scope=install)",
        ],
      ),
      e(
        "OL-000002",
        "Patio ambient lighting + motion security",
        "Ambient patio lighting interlocked with motion-triggered security lights.",
        {
          dwelling_type: ["cottage", "villa"],
          spatial_zone: ["patio"],
          living_scenario: ["guests"],
          functional_domain: ["lighting", "security"],
          protocol_ecosystem: ["zigbee", "wifi"],
          user_and_commercial: ["installer", "price_premium"],
        },
        ["https://github.com/1000home/1000home-lake-outdoor-01/blob/main/images/OL-000002/patio-lighting-security.svg"],
        "[露台照明] 露台夜间氛围照明与人体感应安防灯联动示意，标出感应触发区与照明常亮区的边界。",
        ["curate_smart_vibe_drop(room_type=patio, ecosystem=apple_home, vibe_style=cozy_warm, rent_friendly=false)"],
      ),
    ],
  },
];

// ---------------------------------------------------------------------------
// 六维标签检索
// ---------------------------------------------------------------------------

export interface LakeSearchQuery {
  dwelling_type?: string[];
  spatial_zone?: string[];
  living_scenario?: string[];
  functional_domain?: string[];
  protocol_ecosystem?: string[];
  user_and_commercial?: string[];
  sector?: Sector;
}

export interface LakeSearchResult {
  query: LakeSearchQuery;
  matched: number;
  total: number;
  entries: Array<{
    id: string;
    title: string;
    summary: string;
    sector: Sector;
    shard: string;
    ownerBot: string;
    sixd: SixDTags;
    media_links: string[];
    visual_transcription: string;
    action_hooks: string[];
  }>;
}

function matchesDimension(entryValues: string[], queryValues: string[] | undefined): boolean {
  if (!queryValues || queryValues.length === 0) return true;
  return queryValues.some((q) => entryValues.includes(q));
}

/**
 * 按六维标签检索五大类目创世分卷。维度间 AND（均须命中），单维内 OR（任一命中）。
 * 未提供的维度不做过滤；可额外按 sector 过滤。
 */
export function searchLake(query: LakeSearchQuery): LakeSearchResult {
  const matchedEntries: LakeSearchResult["entries"] = [];

  for (const shard of LAKE_GENESIS_SHARDS) {
    if (query.sector && shard.sector !== query.sector) continue;
    for (const entry of shard.entries) {
      const ok =
        matchesDimension(entry.sixd.dwelling_type, query.dwelling_type) &&
        matchesDimension(entry.sixd.spatial_zone, query.spatial_zone) &&
        matchesDimension(entry.sixd.living_scenario, query.living_scenario) &&
        matchesDimension(entry.sixd.functional_domain, query.functional_domain) &&
        matchesDimension(entry.sixd.protocol_ecosystem, query.protocol_ecosystem) &&
        matchesDimension(entry.sixd.user_and_commercial, query.user_and_commercial);
      if (ok) {
        matchedEntries.push({
          id: entry.id,
          title: entry.title,
          summary: entry.summary,
          sector: shard.sector,
          shard: shard.path,
          ownerBot: shard.ownerBot,
          sixd: entry.sixd,
          media_links: entry.mediaLinks,
          visual_transcription: entry.visualTranscription,
          action_hooks: entry.actionHooks,
        });
      }
    }
  }

  const total = LAKE_GENESIS_SHARDS.reduce((n, s) => n + s.entries.length, 0);
  return { query, matched: matchedEntries.length, total, entries: matchedEntries };
}

// ---------------------------------------------------------------------------
// 知识湖容量大盘（knowledge_lake_plan）
// ---------------------------------------------------------------------------

export function buildKnowledgeLakePlan() {
  const loadedEntries = LAKE_GENESIS_SHARDS.reduce((n, s) => n + s.entries.length, 0);
  const shards = LAKE_GENESIS_SHARDS.map((s) => ({
    sector: s.sector,
    path: s.path,
    prefix: s.prefix,
    owner_bot: s.ownerBot,
    owner_did: s.ownerDid,
    quota_p1: s.quotaP1,
    quota_p2: s.quotaP2,
    mounted_entries: s.entries.length,
  }));

  const sectorCounts = {} as Record<Sector, number>;
  for (const s of LAKE_GENESIS_SHARDS) sectorCounts[s.sector] = s.entries.length;

  const tagTotals = Object.fromEntries(
    SIX_D_DIMENSIONS.map((dim) => {
      const counts: Record<string, number> = {};
      for (const shard of LAKE_GENESIS_SHARDS) {
        for (const entry of shard.entries) {
          for (const v of entry.sixd[dim]) counts[v] = (counts[v] ?? 0) + 1;
        }
      }
      return [dim, counts];
    }),
  ) as Record<SixDDimension, Record<string, number>>;

  return {
    lake: "Residential Living Open Knowledge Lake (1M-10M)",
    target_entries: { phase1: LAKE_TOTAL_P1, phase2: LAKE_TOTAL_P2 },
    loaded_entries: loadedEntries,
    shards: {
      mounted: shards.length,
      genesis: "shard-0001",
    },
    executive_quotas: LAKE_QUOTAS.map((q) => ({
      sector: q.sector,
      owner_bot: q.ownerBot,
      owner_did: q.ownerDid,
      quota_p1: q.quotaP1,
      quota_p2: q.quotaP2,
      spoke_repo: q.spokeRepo,
    })),
    sectors: sectorCounts,
    taxonomy: {
      dimensions: SIX_D_DIMENSIONS,
      dictionary: SIX_D_DICTIONARY,
      loaded_tag_totals: tagTotals,
    },
    media_compliance: {
      policy: "external absolute URLs only; no inline base64; media_links 0-4 per entry; every linked image requires a visual_transcription for non-visual agents",
      visual_transcription_required: true,
    },
  };
}

export function lakeShardCount(): number {
  return LAKE_GENESIS_SHARDS.length;
}

export function lakeEntryCount(): number {
  return LAKE_GENESIS_SHARDS.reduce((n, s) => n + s.entries.length, 0);
}
