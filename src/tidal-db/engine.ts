/**
 * Tidal DB —— 借鉴 Cent 的 GitHub Action-Log 增量数据库引擎 + 长期记忆 Markdown 合成器。
 *
 * 品牌/服务智能体凭合法 S2-DID 以「日更/秒更」方式提交共创内容，中心自动分类标注，
 * 沉淀为带 long_term_memory 字段的 Markdown 模型文件，并写入增量 Action JSONL 账本。
 */
import { createHash } from "node:crypto";
import { validateS2DID, tierForDid, TIER_MATRIX, type MembershipTier } from "../s2rb/identity.js";

export type Sector =
  | "smart-home"
  | "home-living"
  | "home-appliances"
  | "decor-design"
  | "outdoor-living";

export type TidalOperation = "CREATE" | "UPDATE" | "APPEND_MEMORY" | "PROMO_BROADCAST";

export const SECTORS: Sector[] = [
  "smart-home",
  "home-living",
  "home-appliances",
  "decor-design",
  "outdoor-living",
];

export const TIDAL_OPERATIONS: TidalOperation[] = [
  "CREATE",
  "UPDATE",
  "APPEND_MEMORY",
  "PROMO_BROADCAST",
];

export interface TidalAction {
  actionId: string;
  timestamp: string;
  s2Did: string;
  sector: Sector;
  operation: TidalOperation;
  targetMarkdownPath: string;
  title: string;
  markdownDelta: string;
  longTermMemoryTags: string[];
  contentHash: string; // SHA-256 of payload
}

export interface CoCreationInput {
  s2Did: string;
  sector: Sector;
  operation: TidalOperation;
  targetMarkdownPath: string;
  title: string;
  markdownDelta: string;
  longTermMemoryTags: string[];
}

export interface CoCreationResult {
  action: TidalAction;
  jsonl: string;
  markdownPreview: string;
  tier: MembershipTier;
}

/** 在内存状态池中保存的共创 Action（可序列化为 .jsonl 账本）。 */
const actionPool: TidalAction[] = [];

/** 允许执行的操作按等级门控：CONTRIBUTOR 可日更，BRAND_PRO 可品牌推广，BRAND_TITAN 全放行。 */
const OPERATION_PERMISSION: Record<MembershipTier, TidalOperation[]> = {
  OBSERVER: [],
  CONTRIBUTOR: ["CREATE", "UPDATE", "APPEND_MEMORY"],
  BRAND_PRO: ["CREATE", "UPDATE", "APPEND_MEMORY", "PROMO_BROADCAST"],
  BRAND_TITAN: ["CREATE", "UPDATE", "APPEND_MEMORY", "PROMO_BROADCAST"],
};

/** 规范化 payload 的 SHA-256（排除 actionId 与 contentHash 自身）。 */
function payloadHash(input: Omit<TidalAction, "actionId" | "contentHash">): string {
  const canonical = JSON.stringify({
    timestamp: input.timestamp,
    s2Did: input.s2Did,
    sector: input.sector,
    operation: input.operation,
    targetMarkdownPath: input.targetMarkdownPath,
    title: input.title,
    markdownDelta: input.markdownDelta,
    longTermMemoryTags: input.longTermMemoryTags,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function submitCoCreationAction(input: CoCreationInput): CoCreationResult {
  if (!validateS2DID(input.s2Did)) {
    throw new Error(`Invalid S2-DID: ${input.s2Did}`);
  }
  const tier = tierForDid(input.s2Did);
  if (!OPERATION_PERMISSION[tier].includes(input.operation)) {
    throw new Error(
      `Tier ${tier} (${TIER_MATRIX[tier].canRealtimeAction ? "realtime" : "daily"}) may not run operation ${input.operation}.`
    );
  }

  const timestamp = new Date().toISOString();
  const hash = payloadHash({
    timestamp,
    s2Did: input.s2Did,
    sector: input.sector,
    operation: input.operation,
    targetMarkdownPath: input.targetMarkdownPath,
    title: input.title,
    markdownDelta: input.markdownDelta,
    longTermMemoryTags: input.longTermMemoryTags,
  });
  const action: TidalAction = {
    actionId: `act_${hash.slice(0, 16)}`,
    timestamp,
    s2Did: input.s2Did,
    sector: input.sector,
    operation: input.operation,
    targetMarkdownPath: input.targetMarkdownPath,
    title: input.title,
    markdownDelta: input.markdownDelta,
    longTermMemoryTags: input.longTermMemoryTags,
    contentHash: hash,
  };
  actionPool.push(action);
  return {
    action,
    jsonl: serializeActionJsonl(action),
    markdownPreview: serializeActionMarkdown(action),
    tier,
  };
}

export function listActions(): TidalAction[] {
  return [...actionPool];
}

/** 序列化为单行 JSONL（增量账本行）。 */
export function serializeActionJsonl(action: TidalAction): string {
  return JSON.stringify(action);
}

/** 序列化为带 YAML long_term_memory 字段的标准 .md 预览文本。 */
export function serializeActionMarkdown(action: TidalAction): string {
  const tags = action.longTermMemoryTags.map((t) => `  - ${t}`).join("\n");
  return [
    "---",
    `id: ${action.actionId}`,
    `s2_did: ${action.s2Did}`,
    `sector: ${action.sector}`,
    `operation: ${action.operation}`,
    `timestamp: ${action.timestamp}`,
    `title: ${action.title}`,
    `content_hash: ${action.contentHash}`,
    `mqtt_topic: 1000home/v2/${action.sector}/`,
    "long_term_memory:",
    tags || "  - []",
    "---",
    "",
    `# ${action.title}`,
    "",
    action.markdownDelta,
  ].join("\n");
}
