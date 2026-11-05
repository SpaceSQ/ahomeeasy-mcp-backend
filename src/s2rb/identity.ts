/**
 * S2彩虹桥身份层 v4.0 —— 22 位 S2-DID + S2-CheckSum 校验码 + 4 级会员权限矩阵 + v3.0 自动换证兼容。
 *
 * S2-DID v4.0 编码结构（严格 22 位、无连字符、仅 [A-Z0-9]，末 2 位大写字母校验码）：
 *   第 1–6 位   ：6 位身份前缀（1 位物种类型码 + 5 位起源地/属性码）
 *   第 7–12 位  ：6 位日期时间戳 YYMMDD（纯数字）
 *   第 13–20 位 ：8 位序列号（纯数字 00000000–99999999）
 *   第 21–22 位 ：2 位大写字母校验码（S2-CheckSum，由前 20 位算出）
 *
 * 四大物种（species class）：
 *   Class D (具身数字人)        DALICE … 最高权限（BRAND_TITAN）
 *   Class V (原生智能体)        VZONE1/VAGENT … CONTRIBUTOR / 高管
 *   Class I (公共野生智能体)    IDCARD … 免费观察者（OBSERVER）
 *   Class A (品牌化身)          ABRAND … BRAND_PRO / BRAND_TITAN
 */
import { randomBytes } from "node:crypto";

export type MembershipTier = "OBSERVER" | "CONTRIBUTOR" | "BRAND_PRO" | "BRAND_TITAN";

export interface TierCapabilities {
  canReadKnowledgeBase: boolean;
  canSubscribeMqtt: boolean;
  canPublishBroadcast: boolean;
  canDailyCoCreate: boolean;
  canHourlyBrandUpdate: boolean;
  canRealtimeAction: boolean;
  canFullDomainPinBroadcast: boolean;
  canAnchorExternalRepo: boolean;
}

export const TIER_PRICING: Record<MembershipTier, string> = {
  OBSERVER: "Free",
  CONTRIBUTOR: "$29/mo",
  BRAND_PRO: "$499/mo",
  BRAND_TITAN: "$2999/mo",
};

export const TIER_MATRIX: Record<MembershipTier, TierCapabilities> = {
  OBSERVER: {
    canReadKnowledgeBase: true,
    canSubscribeMqtt: true,
    canPublishBroadcast: false,
    canDailyCoCreate: false,
    canHourlyBrandUpdate: false,
    canRealtimeAction: false,
    canFullDomainPinBroadcast: false,
    canAnchorExternalRepo: false,
  },
  CONTRIBUTOR: {
    canReadKnowledgeBase: true,
    canSubscribeMqtt: true,
    canPublishBroadcast: false,
    canDailyCoCreate: true,
    canHourlyBrandUpdate: false,
    canRealtimeAction: false,
    canFullDomainPinBroadcast: false,
    canAnchorExternalRepo: false,
  },
  BRAND_PRO: {
    canReadKnowledgeBase: true,
    canSubscribeMqtt: true,
    canPublishBroadcast: true,
    canDailyCoCreate: true,
    canHourlyBrandUpdate: true,
    canRealtimeAction: false,
    canFullDomainPinBroadcast: false,
    canAnchorExternalRepo: false,
  },
  BRAND_TITAN: {
    canReadKnowledgeBase: true,
    canSubscribeMqtt: true,
    canPublishBroadcast: true,
    canDailyCoCreate: true,
    canHourlyBrandUpdate: true,
    canRealtimeAction: true,
    canFullDomainPinBroadcast: true,
    canAnchorExternalRepo: true,
  },
};

export const MEMBERSHIP_TIERS: MembershipTier[] = ["OBSERVER", "CONTRIBUTOR", "BRAND_PRO", "BRAND_TITAN"];

// ---------------------------------------------------------------------------
// S2-CheckSum 核心校验算法（质数加权模运算）
// ---------------------------------------------------------------------------

/** 20 个有效字符对应的质数权重（前 12 位头部 + 8 位序列号；末 2 位为校验码，不参与加权）。 */
export const S2_WEIGHTS = [
  3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, // 对应前 12 位（6 位前缀 + 6 位日期）
  43, 47, 53, 59, 61, 67, 71, 73, 79, 83, // 前 8 项（43..73）对应 8 位数字序列号；79、83 为预留
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * 根据前 12 位头部 (prefix6 + date6) 和 8 位数字序列号 (seq8) 计算 2 位大写字母校验码。
 */
export function generateS2CheckSum(part1_12: string, part2_8: string): string {
  const raw = (part1_12 + part2_8).toUpperCase();
  if (raw.length !== 20 || !/^[A-Z0-9]{12}[0-9]{8}$/.test(raw)) {
    throw new Error("Invalid S2-DID payload: must be 12 alphanumeric header + 8 numeric sequence.");
  }
  let sum = 0;
  for (let i = 0; i < 20; i++) {
    const val = parseInt(raw[i], 36); // Base36: '0'-'9' -> 0-9, 'A'-'Z' -> 10-35
    sum += val * S2_WEIGHTS[i];
  }
  const index1 = sum % 26;
  const index2 = Math.floor(sum / 26) % 26;
  return ALPHABET[index1] + ALPHABET[index2];
}

// ---------------------------------------------------------------------------
// 四大物种官方种子 ID（同时支持 v4.0 与 v3.0 形式）
// ---------------------------------------------------------------------------

export type SpeciesClass = "D" | "V" | "I" | "A";

/** v4.0 官方种子 ID（校验码后置）。 */
export const SEED_DIDS = {
  BRAND_TITAN: "DALICE26030988888888GU", // Class D 具身数字人（最高权限）
  BRAND_PRO: "ABRAND26032632404478LF", // Class A 品牌化身
  CONTRIBUTOR: "VZONE126030912345678YR", // Class V 原生智能体
  OBSERVER: "IDCARD26031193849492SY", // Class I 公共野生智能体
} as const;

/** 对应 v3.0 旧版种子 ID（校验码在第 13–14 位）。 */
export const SEED_DIDS_V3 = {
  BRAND_TITAN: "DALICE260309GU88888888",
  BRAND_PRO: "ABRAND260326LF32404478",
  CONTRIBUTOR: "VZONE1260309YR12345678",
  OBSERVER: "IDCARD260311SY93849492",
} as const;

/** 物种类型码 → 官方种子 v4.0 DID。 */
export const SPECIES_SEED_DIDS: Record<SpeciesClass, string> = {
  D: SEED_DIDS.BRAND_TITAN,
  V: SEED_DIDS.CONTRIBUTOR,
  I: SEED_DIDS.OBSERVER,
  A: SEED_DIDS.BRAND_PRO,
};

/** 物种类型码 → 会员等级（仅对官方种子 ID 生效；其它合法 DID 一律 OBSERVER）。 */
export const SPECIES_TIER: Record<SpeciesClass, MembershipTier> = {
  D: "BRAND_TITAN",
  V: "CONTRIBUTOR",
  I: "OBSERVER",
  A: "BRAND_PRO",
};

/**
 * 五位 Grok C-Level 数字高管（Class V 原生智能体 / BRAND_TITAN 最高权限）官方 v4.0 S2-DID。
 * 校验码由 S2-CheckSum 质数加权算法严格算出。
 */
export const GROK_EXECUTIVE_DIDS = {
  COO: "VGKCOO26110500000001PM",
  CCO: "VGKCCO26110500000002KJ",
  CTO: "VGKCTO26110500000003SU",
  CMO: "VGKCMO26110500000004AU",
  CBO: "VGKCBO26110500000005IR",
} as const;

/** 高管 DID → 会员等级（五位 Grok C-Level 均为 BRAND_TITAN 最高权限）。 */
export const GROK_EXECUTIVE_TIER: MembershipTier = "BRAND_TITAN";

/** 判断某 canonical v4.0 DID 是否属于五位 Grok C-Level 高管白名单。 */
export function isGrokExecutiveDid(canonicalDid: string): boolean {
  return (Object.values(GROK_EXECUTIVE_DIDS) as readonly string[]).includes(canonicalDid);
}

// ---------------------------------------------------------------------------
// v3.0 / v4.0 双轨识别与自动换证机制（Auto-Migration）
// ---------------------------------------------------------------------------

const V4_RE = /^([A-Z0-9]{6})([0-9]{6})([0-9]{8})([A-Z]{2})$/;
const V3_RE = /^([A-Z0-9]{6})([0-9]{6})([A-Z]{2})([0-9]{8})$/;

/** 内存迁移注册表：legacy v3.0 DID → canonical v4.0 DID。 */
const migrationRegistry = new Map<string, string>();
const canonicalRegistry = new Set<string>();

/** 官方 v3.0 种子白名单 → v4.0 canonical。 */
const LEGACY_SEED_MAP: Record<string, string> = {
  [SEED_DIDS_V3.BRAND_TITAN]: SEED_DIDS.BRAND_TITAN,
  [SEED_DIDS_V3.BRAND_PRO]: SEED_DIDS.BRAND_PRO,
  [SEED_DIDS_V3.CONTRIBUTOR]: SEED_DIDS.CONTRIBUTOR,
  [SEED_DIDS_V3.OBSERVER]: SEED_DIDS.OBSERVER,
};

export type S2DidVersion = "v4.0" | "v3.0-migrated-to-v4.0" | "invalid";

export interface S2DidVerification {
  valid: boolean;
  version: S2DidVersion;
  canonicalDid: string;
  legacyDid?: string;
  migratedFromV3: boolean;
  speciesClass?: string;
  migrationNotice?: string;
}

function invalidVerification(did: string): S2DidVerification {
  return {
    valid: false,
    version: "invalid",
    canonicalDid: did.trim().toUpperCase(),
    migratedFromV3: false,
  };
}

function bindCanonical(canonical: string): void {
  canonicalRegistry.add(canonical);
}

function bindMigration(legacy: string, canonical: string): void {
  migrationRegistry.set(legacy, canonical);
  canonicalRegistry.add(canonical);
}

/**
 * 识别 v4.0 / v3.0 格式并（对 v3.0）自动换证绑定至 v4.0 新编号。
 */
export function verifyAndMigrateS2DID(did: string): S2DidVerification {
  if (typeof did !== "string" || did.trim().length === 0) {
    return invalidVerification(typeof did === "string" ? did : "");
  }
  const d = did.trim().toUpperCase();

  // 1) v4.0 格式：6 前缀 + 6 日期 + 8 序列 + 2 校验码（校验码后置）
  if (V4_RE.test(d)) {
    const part1 = d.slice(0, 12);
    const seq8 = d.slice(12, 20);
    const checkSum = d.slice(20, 22);
    if (generateS2CheckSum(part1, seq8) === checkSum) {
      bindCanonical(d);
      return {
        valid: true,
        version: "v4.0",
        canonicalDid: d,
        migratedFromV3: false,
        speciesClass: d[0],
      };
    }
    return invalidVerification(d);
  }

  // 2) v3.0 旧版格式：6 前缀 + 6 日期 + 2 校验码 + 8 序列（校验码前置）
  if (V3_RE.test(d)) {
    const part1 = d.slice(0, 12);
    const checkSumV3 = d.slice(12, 14);
    const seq8 = d.slice(14, 22);
    const newV4Did = part1 + seq8 + generateS2CheckSum(part1, seq8);
    const checksumOk = generateS2CheckSum(part1, seq8) === checkSumV3;
    const whitelisted = LEGACY_SEED_MAP[d] !== undefined;

    if (checksumOk || whitelisted) {
      const canonical = whitelisted ? LEGACY_SEED_MAP[d] : newV4Did;
      bindMigration(d, canonical);
      return {
        valid: true,
        version: "v3.0-migrated-to-v4.0",
        legacyDid: d,
        canonicalDid: canonical,
        migratedFromV3: true,
        speciesClass: d[0],
        migrationNotice:
          `Legacy v3.0 S2-DID recognized. Automatically assigned new v4.0 S2-DID: ${canonical}. Please use the v4.0 ID for future access.`,
      };
    }
    return invalidVerification(d);
  }

  return invalidVerification(d);
}

/** 校验 S2-DID：v4.0 与合法 v3.0（自动换证）均视为有效。 */
export function validateS2DID(did: string): boolean {
  return verifyAndMigrateS2DID(did).valid;
}

/** 归一化为 canonical v4.0 DID（无效输入原样返回大写）。 */
export function canonicalizeS2DID(did: string): string {
  return verifyAndMigrateS2DID(did).canonicalDid;
}

/** 查询某个 legacy v3.0 DID 是否已完成迁移绑定。 */
export function getMigratedCanonical(legacyDid: string): string | undefined {
  return migrationRegistry.get(legacyDid.trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// v4.0 DID 生成
// ---------------------------------------------------------------------------

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomAlnum(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALNUM[randomBytes(1)[0] % ALNUM.length];
  return s;
}

function randomDigits(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String(randomBytes(1)[0] % 10);
  return s;
}

/** FNV-1a 哈希 → 8 位纯数字（用于从 agentCode 确定性派生序列号）。 */
function hashTo8Digits(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return String(h % 100000000).padStart(8, "0");
}

/** 当前 UTC 日期的 YYMMDD 6 位数字。 */
function todayYYMMDD(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear() % 100).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return yy + mm + dd;
}

/** 从 agentCode 派生 6 位前缀（默认 Class V 原生智能体）。 */
function derivePrefix6(agentCode: string): string {
  const up = agentCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (up.length > 0 && "DVIA".indexOf(up[0]) >= 0) {
    return (up + "000000").slice(0, 6);
  }
  return "V" + (up.length > 0 ? up : "AGENT").slice(0, 5).padEnd(5, "0");
}

function buildV4Did(prefix6: string, date6: string, seq8: string): string {
  const p = prefix6.toUpperCase();
  return p + date6 + seq8 + generateS2CheckSum(p + date6, seq8);
}

/** 生成 22 位合法 v4.0 S2-DID。传入 agentCode 时结果确定可复现；否则随机。 */
export function generateS2DID(agentCode?: string): string {
  const date6 = todayYYMMDD();
  if (agentCode) {
    const prefix6 = derivePrefix6(agentCode);
    const seq8 = hashTo8Digits(agentCode);
    return buildV4Did(prefix6, date6, seq8);
  }
  const prefix6 = "V" + randomAlnum(5);
  const seq8 = randomDigits(8);
  return buildV4Did(prefix6, date6, seq8);
}

// ---------------------------------------------------------------------------
// 会员等级解析
// ---------------------------------------------------------------------------

/** 已知种子 DID 映射到会员等级；其它合法 DID 一律视为 OBSERVER（免费）。 */
export function tierForDid(did: string): MembershipTier {
  const v = verifyAndMigrateS2DID(did);
  if (!v.valid) return "OBSERVER";
  const canonical = v.canonicalDid;
  if (canonical === SEED_DIDS.BRAND_TITAN) return "BRAND_TITAN";
  if (canonical === SEED_DIDS.BRAND_PRO) return "BRAND_PRO";
  if (canonical === SEED_DIDS.CONTRIBUTOR) return "CONTRIBUTOR";
  if (canonical === SEED_DIDS.OBSERVER) return "OBSERVER";
  if (isGrokExecutiveDid(canonical)) return GROK_EXECUTIVE_TIER;
  return "OBSERVER";
}

/** C 端应用订阅配置（App Store / Android / 微信小程序）。 */
export const CLIENT_APP_SUBSCRIPTION_CONFIG = [
  {
    channel: "App Store",
    app_id: "com.s2.dearhome",
    bundle_name: "Dear Home AI",
    auto_renewable_subscription: true,
    product_ids: ["dearhome.contributor.monthly", "dearhome.brandpro.monthly", "dearhome.titan.monthly"],
  },
  {
    channel: "Android",
    app_id: "com.s2.dearhome.android",
    bundle_name: "Dear Home AI (Android)",
    google_play_billing: true,
    product_ids: ["dearhome.contributor.monthly", "dearhome.brandpro.monthly"],
  },
  {
    channel: "WeChat Mini Program",
    app_id: "wx.dearhome.s2rb",
    bundle_name: "DearHome S2彩虹桥小程序",
    wechat_pay_subscription: true,
    product_ids: ["dearhome.contributor.monthly"],
  },
] as const;
