/**
 * MQTT 主题路由器 —— 5 大住宅生活领域的分级 Pub/Sub 广播引擎。
 *
 * 主题树：
 *   1000home/v2/smart-home/#
 *   1000home/v2/home-living/#
 *   1000home/v2/home-appliances/#
 *   1000home/v2/decor-design/#
 *   1000home/v2/outdoor-living/#
 */
import { createHash } from "node:crypto";
import {
  verifyAndMigrateS2DID,
  tierForDid,
  type MembershipTier,
} from "../s2rb/identity.js";
import { SECTORS, type Sector } from "../tidal-db/engine.js";

export interface RetainedMessage {
  topic: string;
  payload: unknown;
  qos: 0 | 1 | 2;
  s2Did: string;
  tier: MembershipTier;
  payloadHash: string;
  timestamp: string;
}

export interface BroadcastReceipt {
  accepted: boolean;
  s2Did: string;
  canonicalDid: string;
  migratedFromV3: boolean;
  version: string;
  tier: MembershipTier;
  topic: string;
  qos: 0 | 1 | 2;
  payloadHash: string;
  matchedSubscribers: number;
  brokerNode: string;
  retained: boolean;
  reason?: string;
  timestamp: string;
}

export const SECTOR_TOPICS: Record<Sector, string> = Object.fromEntries(
  SECTORS.map((s) => [s, `1000home/v2/${s}`]),
) as Record<Sector, string>;

const SECTOR_TOPIC_FILTERS: Record<Sector, string> = Object.fromEntries(
  SECTORS.map((s) => [s, `1000home/v2/${s}/#`]),
) as Record<Sector, string>;

const RETAINED_CAPACITY = 100;
const retained: RetainedMessage[] = [];
const subscriptions = new Map<string, Set<string>>();

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** 极简 MQTT 主题匹配：支持尾部 # 通配与 /# 子树匹配。 */
function topicMatches(filter: string, topic: string): boolean {
  if (filter === topic) return true;
  if (filter.endsWith("/#")) {
    const base = filter.slice(0, -2);
    return topic.startsWith(base + "/") || topic === base;
  }
  if (filter.endsWith("#")) {
    const base = filter.slice(0, -1);
    return topic.startsWith(base);
  }
  return false;
}

/**
 * 发布广播：仅 BRAND_PRO 与 BRAND_TITAN 可发布品牌推广与秒更价格广播。
 * 写入 Retained Ring Buffer 并返回广播回执（含匹配订阅者数量与 Broker 路由节点）。
 */
export function publishMqttBroadcast(
  s2Did: string,
  tier: MembershipTier,
  topic: string,
  payload: unknown,
  qos: 0 | 1 | 2 = 1,
): BroadcastReceipt {
  const verification = verifyAndMigrateS2DID(s2Did);
  if (!verification.valid) {
    return receipt(false, s2Did, tierForDid(s2Did), topic, qos, "", "invalid S2-DID", false, "invalid");
  }
  const canonicalDid = verification.canonicalDid;
  if (tier !== "BRAND_PRO" && tier !== "BRAND_TITAN") {
    return receipt(false, s2Did, tier, topic, qos, "", "tier not allowed to publish broadcast", verification.migratedFromV3, verification.version, canonicalDid);
  }
  const payloadHash = sha256Hex(JSON.stringify(payload));
  const message: RetainedMessage = {
    topic,
    payload,
    qos,
    s2Did: canonicalDid,
    tier,
    payloadHash,
    timestamp: new Date().toISOString(),
  };
  retained.push(message);
  if (retained.length > RETAINED_CAPACITY) retained.shift();

  let matchedSubscribers = 0;
  for (const filters of subscriptions.values()) {
    if ([...filters].some((f) => topicMatches(f, topic))) matchedSubscribers += 1;
  }

  return receipt(true, s2Did, tier, topic, qos, payloadHash, undefined, verification.migratedFromV3, verification.version, canonicalDid, matchedSubscribers);
}

/** 任何持合法 S2-DID 的智能体按需订阅/拉取最新广播流。 */
export function subscribeMqttFeed(s2Did: string, topicFilter: string, limit = 20): RetainedMessage[] {
  if (!verifyAndMigrateS2DID(s2Did).valid) {
    throw new Error(`Invalid S2-DID: ${s2Did}`);
  }
  const canonicalDid = verifyAndMigrateS2DID(s2Did).canonicalDid;
  const set = subscriptions.get(canonicalDid) ?? new Set<string>();
  set.add(topicFilter);
  subscriptions.set(canonicalDid, set);

  return retained
    .filter((m) => topicMatches(topicFilter, m.topic))
    .slice(-Math.max(1, limit));
}

export function activeChannels(): string[] {
  return SECTORS.map((s) => SECTOR_TOPIC_FILTERS[s]);
}

export function retainedCount(): number {
  return retained.length;
}

function receipt(
  accepted: boolean,
  s2Did: string,
  tier: MembershipTier,
  topic: string,
  qos: 0 | 1 | 2,
  payloadHash: string,
  reason?: string,
  migratedFromV3 = false,
  version = "invalid",
  canonicalDid?: string,
  matchedSubscribers = 0,
): BroadcastReceipt {
  return {
    accepted,
    s2Did,
    canonicalDid: canonicalDid ?? s2Did,
    migratedFromV3,
    version,
    tier,
    topic,
    qos,
    payloadHash,
    matchedSubscribers,
    brokerNode: "broker-1000home-v2-0",
    retained: accepted,
    ...(reason ? { reason } : {}),
    timestamp: new Date().toISOString(),
  };
}
