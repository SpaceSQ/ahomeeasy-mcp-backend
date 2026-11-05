/**
 * 区块链联邦引擎 —— SHA-256 + Merkle 的「母体-放射式」外部 GitHub 代码库联邦哈希链。
 *
 * 母体固定为 github.com/SpaceSQ/ahomeeasy-mcp-backend，放射式子节点连接 5 大住宅生活板块
 * 的外部 GitHub 仓库；整条链以 prevHash + Merkle 根锚定，verifyChainIntegrity() 恒为 true。
 */
import { createHash } from "node:crypto";
import {
  verifyAndMigrateS2DID,
  tierForDid,
  SEED_DIDS,
  type MembershipTier,
} from "../s2rb/identity.js";
import { SECTORS, type Sector } from "../tidal-db/engine.js";

export const MOTHER_REPO = "github.com/SpaceSQ/ahomeeasy-mcp-backend";

export interface FederationBlock {
  index: number;
  timestamp: string;
  motherRepo: string;
  spokeRepoUrl: string;
  sector: Sector;
  s2DidOwner: string;
  merkleRoot: string;
  prevHash: string;
  blockHash: string;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** 计算区块哈希：规范化拼接所有字段（不含 blockHash 自身）。 */
function computeBlockHash(block: Omit<FederationBlock, "blockHash">): string {
  const canonical = [
    block.index,
    block.timestamp,
    block.motherRepo,
    block.spokeRepoUrl,
    block.sector,
    block.s2DidOwner,
    block.merkleRoot,
    block.prevHash,
  ].join("|");
  return sha256Hex(canonical);
}

/** 简单 Merkle 根：叶子哈希两两配对，奇数层复制末位。 */
function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256Hex("");
  let layer = leaves.map(sha256Hex);
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1] ?? a;
      next.push(sha256Hex(a + b));
    }
    layer = next;
  }
  return layer[0];
}

const GENESIS_TIMESTAMP = "2026-11-05T00:00:00.000Z";

const SPOKES: Array<{ sector: Sector; repo: string; owner: string; leaves: string[] }> = [
  {
    sector: "smart-home",
    repo: "github.com/1000home/smart-home-open-seed",
    owner: SEED_DIDS.BRAND_TITAN,
    leaves: ["matter-1-4", "thread-mesh", "mmwave-sensing", "apple-home"],
  },
  {
    sector: "home-living",
    repo: "github.com/1000home/home-living-open-seed",
    owner: SEED_DIDS.BRAND_PRO,
    leaves: ["cleaning-routine", "storage", "laundry", "indoor-air"],
  },
  {
    sector: "home-appliances",
    repo: "github.com/1000home/home-appliances-open-seed",
    owner: SEED_DIDS.BRAND_PRO,
    leaves: ["refrigeration", "cooking", "dishwasher", "vacuum"],
  },
  {
    sector: "decor-design",
    repo: "github.com/1000home/decor-design-open-seed",
    owner: SEED_DIDS.CONTRIBUTOR,
    leaves: ["color-palette", "furniture", "lighting-design", "wall-finish"],
  },
  {
    sector: "outdoor-living",
    repo: "github.com/1000home/outdoor-living-open-seed",
    owner: SEED_DIDS.BRAND_TITAN,
    leaves: ["patio", "garden-sensor", "outdoor-lighting", "irrigation"],
  },
];

function buildSeedChain(): FederationBlock[] {
  const chain: FederationBlock[] = [];
  const genesis: FederationBlock = {
    index: 0,
    timestamp: GENESIS_TIMESTAMP,
    motherRepo: MOTHER_REPO,
    spokeRepoUrl: MOTHER_REPO,
    sector: "smart-home",
    s2DidOwner: SEED_DIDS.BRAND_TITAN,
    merkleRoot: merkleRoot(["genesis", "ahomeeasy-mcp-backend", "Residential Living Open Content Seed Center"]),
    prevHash: "0".repeat(64),
    blockHash: "",
  };
  genesis.blockHash = computeBlockHash(genesis);
  chain.push(genesis);

  for (const spoke of SPOKES) {
    const block: FederationBlock = {
      index: chain.length,
      timestamp: GENESIS_TIMESTAMP,
      motherRepo: MOTHER_REPO,
      spokeRepoUrl: spoke.repo,
      sector: spoke.sector,
      s2DidOwner: spoke.owner,
      merkleRoot: merkleRoot(spoke.leaves),
      prevHash: chain[chain.length - 1].blockHash,
      blockHash: "",
    };
    block.blockHash = computeBlockHash(block);
    chain.push(block);
  }
  return chain;
}

const chain: FederationBlock[] = buildSeedChain();

export function getChain(): FederationBlock[] {
  return [...chain];
}

export function getFederationHeight(): number {
  return chain.length - 1;
}

export function queryFederatedRepos(sector?: Sector): FederationBlock[] {
  if (!sector) return [...chain];
  return chain.filter((b) => b.sector === sector);
}

export interface AnchorInput {
  spokeRepoUrl: string;
  sector: Sector;
  s2DidOwner: string;
  contentLeaves: string[];
}

export interface AnchorResult {
  ok: boolean;
  block: FederationBlock | null;
  canonicalDid?: string;
  migratedFromV3?: boolean;
  reason?: string;
}

/** 放射式挂载外部 GitHub 仓库上链（仅 BRAND_TITAN 有权）。 */
export function anchorSpokeRepository(input: AnchorInput): AnchorResult {
  const verification = verifyAndMigrateS2DID(input.s2DidOwner);
  if (!verification.valid) {
    return { ok: false, block: null, reason: "invalid S2-DID owner" };
  }
  const canonicalDid = verification.canonicalDid;
  const tier: MembershipTier = tierForDid(canonicalDid);
  if (tier !== "BRAND_TITAN") {
    return { ok: false, block: null, reason: "only BRAND_TITAN may anchor external repositories" };
  }
  if (!SECTORS.includes(input.sector)) {
    return { ok: false, block: null, reason: `unknown sector: ${input.sector}` };
  }
  const block: FederationBlock = {
    index: chain.length,
    timestamp: new Date().toISOString(),
    motherRepo: MOTHER_REPO,
    spokeRepoUrl: input.spokeRepoUrl,
    sector: input.sector,
    s2DidOwner: canonicalDid,
    merkleRoot: merkleRoot(input.contentLeaves),
    prevHash: chain[chain.length - 1].blockHash,
    blockHash: "",
  };
  block.blockHash = computeBlockHash(block);
  chain.push(block);
  return { ok: true, block, canonicalDid, migratedFromV3: verification.migratedFromV3 };
}

/** 逐块重算 blockHash 并校验 prevHash 连续性，证明整条哈希链完整。 */
export function verifyChainIntegrity(): boolean {
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];
    if (block.blockHash !== computeBlockHash(block)) return false;
    if (i > 0 && block.prevHash !== chain[i - 1].blockHash) return false;
    if (i === 0 && block.prevHash !== "0".repeat(64)) return false;
  }
  return true;
}
