import {
  generateS2DID,
  verifyAndMigrateS2DID,
  tierForDid,
  SEED_DIDS,
  SEED_DIDS_V3,
  GROK_EXECUTIVE_DIDS,
  TIER_MATRIX,
  TIER_PRICING,
  MEMBERSHIP_TIERS,
} from "../src/s2rb/identity.js";
import {
  SECTORS,
  listActions,
  submitCoCreationAction,
  type Sector,
  type TidalOperation,
} from "../src/tidal-db/engine.js";
import {
  publishMqttBroadcast,
  subscribeMqttFeed,
  activeChannels,
  retainedCount,
} from "../src/mqtt/router.js";
import {
  queryFederatedRepos,
  anchorSpokeRepository,
  verifyChainIntegrity,
  getFederationHeight,
  MOTHER_REPO,
} from "../src/blockchain/federation.js";
import {
  searchLake,
  buildKnowledgeLakePlan,
  type LakeSearchQuery,
} from "../src/lake/genesis.js";

/**
 * S2彩虹桥 2.0 网关（Vercel Serverless, Node.js runtime）。
 *
 * 独立于 /api/mcp 的 REST 风格状态/命令入口：
 *  - GET    → 种子中心状态仪表盘（5 板块统计、区块链高度、MQTT 活跃频道、B2A/B2C 矩阵）
 *  - POST   → 命令分派（register/verify/co_create/publish/subscribe/repos/anchor/status）
 *  - OPTIONS→ CORS 预检
 */
export const config = {
  runtime: "nodejs",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function buildDashboard() {
  const actions = listActions();
  const sectors = {} as Record<Sector, Record<string, unknown>>;
  for (const sector of SECTORS) {
    sectors[sector] = {
      tidal_actions: actions.filter((a) => a.sector === sector).length,
      federated_repos: queryFederatedRepos(sector).length,
      mqtt_topic: `1000home/v2/${sector}/#`,
    };
  }
  return {
    service: "S2彩虹桥 2.0 — Residential Living Open Content Seed Center",
    version: "2.0.0",
    status: "online",
    sectors,
    blockchain: {
      mother_repo: MOTHER_REPO,
      height: getFederationHeight(),
      chain_integrity_verified: verifyChainIntegrity(),
    },
    mqtt: {
      active_channels: activeChannels(),
      retained_messages: retainedCount(),
    },
    membership: {
      tiers: MEMBERSHIP_TIERS,
      pricing: TIER_PRICING,
      matrix: TIER_MATRIX,
    },
    b2a_b2c_matrix: {
      b2a: "Brand → Agent 日更/秒更内容共创（Tidal DB + MQTT 广播）",
      b2c: "Agent → Consumer 选购/安装/氛围服务（smart-drop 4 工具）",
      a2a: "Agent → Agent 联邦知识库读写（S2-DID 分级门控）",
    },
    knowledge_lake_plan: buildKnowledgeLakePlan(),
  };
}

async function handlePost(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = (input.action as string) ?? "status";
  const did = input.s2_did as string | undefined;

  try {
    switch (action) {
      case "status":
        return jsonResponse(buildDashboard());

      case "register": {
        const did = generateS2DID(input.agent_code as string | undefined);
        return jsonResponse({
          mode: "register",
          s2_did: did,
          valid: true,
          version: "v4.0",
          canonicalDid: did,
          migratedFromV3: false,
          speciesClass: did[0],
          tier: "OBSERVER",
          membership_tiers: MEMBERSHIP_TIERS,
          seed_dids: SEED_DIDS,
          seed_dids_v3: SEED_DIDS_V3,
          grok_executive_dids: GROK_EXECUTIVE_DIDS,
        });
      }

      case "verify": {
        if (!did) return jsonResponse({ error: "verify requires s2_did" }, 400);
        const v = verifyAndMigrateS2DID(did);
        const tier = tierForDid(v.canonicalDid);
        return jsonResponse({
          mode: "verify",
          s2_did: did,
          valid: v.valid,
          version: v.version,
          canonicalDid: v.canonicalDid,
          migratedFromV3: v.migratedFromV3,
          speciesClass: v.speciesClass,
          ...(v.legacyDid ? { legacyDid: v.legacyDid } : {}),
          ...(v.migrationNotice ? { migrationNotice: v.migrationNotice } : {}),
          tier,
          tier_pricing: TIER_PRICING[tier],
          capabilities: TIER_MATRIX[tier],
        });
      }

      case "co_create":
        return jsonResponse(
          submitCoCreationAction({
            s2Did: did as string,
            sector: input.sector as Sector,
            operation: input.operation as TidalOperation,
            targetMarkdownPath: input.target_markdown_path as string,
            title: input.title as string,
            markdownDelta: input.markdown_delta as string,
            longTermMemoryTags: input.long_term_memory_tags as string[],
          }),
        );

      case "publish": {
        if (!did) return jsonResponse({ error: "publish requires s2_did" }, 400);
        const v = verifyAndMigrateS2DID(did);
        const canonicalDid = v.canonicalDid;
        const tier = tierForDid(canonicalDid);
        const receipt = publishMqttBroadcast(did, tier, input.topic as string, input.payload ?? {}, ((input.qos as 0 | 1 | 2) ?? 1) as 0 | 1 | 2);
        return jsonResponse({ ...receipt, canonicalDid, migratedFromV3: v.migratedFromV3, version: v.version });
      }

      case "subscribe": {
        if (!did) return jsonResponse({ error: "subscribe requires s2_did" }, 400);
        const v = verifyAndMigrateS2DID(did);
        const canonicalDid = v.canonicalDid;
        const topicFilter = (input.topic_filter as string) ?? "1000home/v2/#";
        const messages = subscribeMqttFeed(did, topicFilter, (input.limit as number) ?? 20);
        return jsonResponse({ s2_did: did, canonicalDid, migratedFromV3: v.migratedFromV3, version: v.version, topic_filter: topicFilter, messages });
      }

      case "repos":
        return jsonResponse({ blocks: queryFederatedRepos(input.sector as Sector | undefined) });

      case "lake_search": {
        const tags = (input.sixd_tags as Partial<LakeSearchQuery> | undefined) ?? {};
        const query: LakeSearchQuery = {
          dwelling_type: tags.dwelling_type,
          spatial_zone: tags.spatial_zone,
          living_scenario: tags.living_scenario,
          functional_domain: tags.functional_domain,
          protocol_ecosystem: tags.protocol_ecosystem,
          user_and_commercial: tags.user_and_commercial,
          sector: input.sector as Sector | undefined,
        };
        return jsonResponse(searchLake(query));
      }

      case "anchor": {
        if (!did) return jsonResponse({ error: "anchor requires s2_did" }, 400);
        const res = anchorSpokeRepository({
          spokeRepoUrl: input.spoke_repo_url as string,
          sector: input.sector as Sector,
          s2DidOwner: did,
          contentLeaves: input.content_leaves as string[],
        });
        if (!res.ok) return jsonResponse({ error: res.reason ?? "anchor failed" }, 403);
        return jsonResponse(res);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
}

export async function GET(request: Request): Promise<Response> {
  return jsonResponse(buildDashboard());
}

export async function POST(request: Request): Promise<Response> {
  return handlePost(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
