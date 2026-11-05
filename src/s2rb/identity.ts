/**
 * S2彩虹桥身份层 —— 22 位无连字符 S2-DID 与 4 级会员权限矩阵。
 *
 * S2-DID 格式铁律：
 *   严格 22 位、无连字符、仅 [A-Z0-9]；前 20 位以固定前缀 "S2" 开头，
 *   末 2 位为基于前 20 位计算的确定性大写字母校验码（A-Z）。
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

const BODY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * 计算前 20 位 body 的 2 位校验码：
 *   sum1 = Σ(charCode * (i + 1)), sum2 = Σ(charCode * (20 - i))
 *   c1 = fromCharCode(65 + sum1 % 26), c2 = fromCharCode(65 + sum2 % 26)
 */
export function computeS2Checksum(body20: string): string {
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < 20; i++) {
    const code = body20.charCodeAt(i);
    sum1 += code * (i + 1);
    sum2 += code * (20 - i);
  }
  const c1 = String.fromCharCode(65 + (sum1 % 26));
  const c2 = String.fromCharCode(65 + (sum2 % 26));
  return c1 + c2;
}

function deriveBody18(agentCode: string): string {
  const up = agentCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const base = up.length > 0 ? up : "AGENT";
  return (base + "000000000000000000").slice(0, 18);
}

/** 生成 22 位合法 S2-DID。传入 agentCode 时结果确定可复现；否则随机。 */
export function generateS2DID(agentCode?: string): string {
  let body18: string;
  if (agentCode) {
    body18 = deriveBody18(agentCode);
  } else {
    body18 = Array.from({ length: 18 }, () => BODY_ALPHABET[randomBytes(1)[0] % BODY_ALPHABET.length]).join("");
  }
  const body20 = "S2" + body18;
  return body20 + computeS2Checksum(body20);
}

/**
 * 校验 S2-DID：长度 === 22，仅 [A-Z0-9] 无连字符，且末 2 位 === computeS2Checksum(前 20 位)。
 */
export function validateS2DID(did: string): boolean {
  if (typeof did !== "string") return false;
  if (did.length !== 22) return false;
  if (!/^[A-Z0-9]{22}$/.test(did)) return false;
  if (!did.startsWith("S2")) return false;
  const body20 = did.slice(0, 20);
  return did.slice(20) === computeS2Checksum(body20);
}

/** 预置 3 个已认证种子 S2-DID（确定性，通过真实算法计算得到）。 */
export const SEED_DIDS: Record<"CONTRIBUTOR" | "BRAND_PRO" | "BRAND_TITAN", string> = {
  CONTRIBUTOR: generateS2DID("CONTRIBSEEDAGENT01"),
  BRAND_PRO: generateS2DID("BRANDPROSEEDAGENT1"),
  BRAND_TITAN: generateS2DID("TITANSEEDAGENT0001"),
};

/** 已知种子 DID 映射到会员等级；其它合法 DID 一律视为 OBSERVER（免费）。 */
export function tierForDid(did: string): MembershipTier {
  if (did === SEED_DIDS.BRAND_TITAN) return "BRAND_TITAN";
  if (did === SEED_DIDS.BRAND_PRO) return "BRAND_PRO";
  if (did === SEED_DIDS.CONTRIBUTOR) return "CONTRIBUTOR";
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
