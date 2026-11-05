/**
 * 千万级住宅生活知识湖 —— 六维必选基因标签词典（6D Taxonomy）。
 *
 * 与 knowledge-base/LAKE_TAGGING_SPEC.md 保持一致：每个词条必须从受控词表取值，
 * 六维均必选，缺一维则该词条不挂载索引；未知值一律归入 `other`，不得自造标签。
 */
import type { Sector } from "../tidal-db/engine.js";

export const SIX_D_DIMENSIONS = [
  "dwelling_type",
  "spatial_zone",
  "living_scenario",
  "functional_domain",
  "protocol_ecosystem",
  "user_and_commercial",
] as const;

export type SixDDimension = (typeof SIX_D_DIMENSIONS)[number];

export interface SixDTags {
  dwelling_type: string[];
  spatial_zone: string[];
  living_scenario: string[];
  functional_domain: string[];
  protocol_ecosystem: string[];
  user_and_commercial: string[];
}

/** 六维受控词表（含中英对照说明）。未知值一律 `other`。 */
export const SIX_D_DICTIONARY: Record<SixDDimension, string[]> = {
  dwelling_type: [
    "apartment",
    "studio",
    "villa",
    "townhouse",
    "duplex",
    "penthouse",
    "cottage",
    "rental",
    "other",
  ],
  spatial_zone: [
    "living_room",
    "bedroom",
    "kitchen",
    "bathroom",
    "dining_room",
    "study",
    "balcony",
    "corridor",
    "garage",
    "garden",
    "patio",
    "rooftop",
    "other",
  ],
  living_scenario: [
    "morning_routine",
    "sleep",
    "dinner",
    "entertainment",
    "work_from_home",
    "cleaning",
    "guests",
    "away_from_home",
    "wellness",
    "cooking",
    "other",
  ],
  functional_domain: [
    "lighting",
    "climate",
    "security",
    "entertainment",
    "cleaning",
    "cooking",
    "storage",
    "irrigation",
    "energy",
    "communication",
    "other",
  ],
  protocol_ecosystem: [
    "matter",
    "thread",
    "zigbee",
    "z_wave",
    "wifi",
    "bluetooth",
    "knx",
    "dali",
    "modbus",
    "homekit",
    "other",
  ],
  user_and_commercial: [
    "renter",
    "homeowner",
    "diy",
    "installer",
    "designer",
    "price_budget",
    "price_mid",
    "price_premium",
    "price_luxury",
    "retrofit",
    "other",
  ],
};

export const SIX_D_LABELS: Record<SixDDimension, { en: string; zh: string }> = {
  dwelling_type: { en: "Dwelling type", zh: "户型" },
  spatial_zone: { en: "Spatial zone", zh: "空间" },
  living_scenario: { en: "Living scenario", zh: "场景" },
  functional_domain: { en: "Functional domain", zh: "功能" },
  protocol_ecosystem: { en: "Protocol ecosystem", zh: "协议生态" },
  user_and_commercial: { en: "User & commercial", zh: "人群/安装/价格带" },
};

export function isValidTagValue(dimension: SixDDimension, value: string): boolean {
  return SIX_D_DICTIONARY[dimension].includes(value);
}

/**
 * 五大类目 1,000,000 → 10,000,000 条目标配额与五位 Grok 高管分工。
 * 加总恒等于 P1 1,000,000 / P2 10,000,000。
 */
export interface LakeQuota {
  sector: Sector;
  sectorIndex: string;
  prefix: string;
  ownerBot: string;
  ownerDid: string;
  quotaP1: number;
  quotaP2: number;
  spokeRepo: string;
  shardPath: string;
}

export const LAKE_TOTAL_P1 = 1_000_000;
export const LAKE_TOTAL_P2 = 10_000_000;

export const LAKE_QUOTAS: LakeQuota[] = [
  {
    sector: "smart-home",
    sectorIndex: "01-smart-home",
    prefix: "SH",
    ownerBot: "Grok-CTO",
    ownerDid: "VGKCTO26110500000003SU",
    quotaP1: 240_000,
    quotaP2: 2_400_000,
    spokeRepo: "github.com/1000home/1000home-lake-smarthome-01",
    shardPath: "knowledge-base/sectors/01-smart-home/shards/shard-0001.md",
  },
  {
    sector: "home-living",
    sectorIndex: "02-home-living",
    prefix: "HL",
    ownerBot: "Grok-CCO",
    ownerDid: "VGKCCO26110500000002KJ",
    quotaP1: 200_000,
    quotaP2: 2_000_000,
    spokeRepo: "github.com/1000home/1000home-lake-homeliving-01",
    shardPath: "knowledge-base/sectors/02-home-living/shards/shard-0001.md",
  },
  {
    sector: "home-appliances",
    sectorIndex: "03-home-appliances",
    prefix: "HA",
    ownerBot: "Grok-CMO",
    ownerDid: "VGKCMO26110500000004AU",
    quotaP1: 220_000,
    quotaP2: 2_200_000,
    spokeRepo: "github.com/1000home/1000home-lake-appliances-01",
    shardPath: "knowledge-base/sectors/03-home-appliances/shards/shard-0001.md",
  },
  {
    sector: "decor-design",
    sectorIndex: "04-decor-design",
    prefix: "DD",
    ownerBot: "Grok-CBO",
    ownerDid: "VGKCBO26110500000005IR",
    quotaP1: 160_000,
    quotaP2: 1_600_000,
    spokeRepo: "github.com/1000home/1000home-lake-decor-01",
    shardPath: "knowledge-base/sectors/04-decor-design/shards/shard-0001.md",
  },
  {
    sector: "outdoor-living",
    sectorIndex: "05-outdoor-living",
    prefix: "OL",
    ownerBot: "Grok-COO",
    ownerDid: "VGKCOO26110500000001PM",
    quotaP1: 180_000,
    quotaP2: 1_800_000,
    spokeRepo: "github.com/1000home/1000home-lake-outdoor-01",
    shardPath: "knowledge-base/sectors/05-outdoor-living/shards/shard-0001.md",
  },
];
