/**
 * 手写极简 MCP Streamable HTTP（JSON-RPC 2.0）处理器。
 *
 * 不依赖 SDK 的 Transport 封装，直接实现规范最小子集：
 *  - POST  → JSON-RPC（initialize / notifications/initialized / tools/list / tools/call / ping）
 *            响应统一为 `application/json`（Streamable HTTP 规范允许非 SSE 响应）。
 *  - GET   → 普通浏览器返回健康 JSON；`Accept: text/event-stream` 的 SSE 探测返回 405
 *            （本服务是纯请求/响应式，不提供服务器推送 SSE 流，规范允许）。
 *  - DELETE→ 终止会话（无状态，直接 204）。
 *  - OPTIONS → CORS 预检。
 *
 * 完全免鉴权：无凭证 / Meta Muse 平台的公开探测请求（tools/list 等）一律放行。
 */

import {
  ECOSYSTEMS,
  ROOM_TYPES,
  VIBE_STYLES,
  SERVICE_SCOPES,
  checkCompatibility,
  curateVibeDrop,
  checkoutBundle,
  matchInstaller,
} from "./lib.js";
import {
  generateS2DID,
  validateS2DID,
  tierForDid,
  SEED_DIDS,
  TIER_MATRIX,
  TIER_PRICING,
  MEMBERSHIP_TIERS,
} from "./s2rb/identity.js";
import {
  SECTORS,
  TIDAL_OPERATIONS,
  submitCoCreationAction,
  type Sector,
  type TidalOperation,
} from "./tidal-db/engine.js";
import {
  publishMqttBroadcast,
  subscribeMqttFeed,
  activeChannels,
  retainedCount,
} from "./mqtt/router.js";
import {
  queryFederatedRepos,
  anchorSpokeRepository,
  verifyChainIntegrity,
  getFederationHeight,
  MOTHER_REPO,
} from "./blockchain/federation.js";

const SERVER_INFO = { name: "ahomeeasy-mcp-backend", version: "2.0.0" } as const;

// 协议版本协商：客户端未指定或版本不兼容时回退到此默认版本。
const DEFAULT_PROTOCOL_VERSION = "2025-03-26";
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-03-26", "2025-06-18", "2025-11-25"];

// ---------------------------------------------------------------------------
// 工具定义（tools/list 返回的标准 JSON Schema）
// ---------------------------------------------------------------------------

const S2RB_ENABLED =
  (process.env.S2RB_ENABLED ?? "true").toLowerCase() !== "false" &&
  (process.env.S2RB_ENABLED ?? "true").toLowerCase() !== "0";

const CORE_TOOL_DEFINITIONS = [
  {
    name: "check_smarthome_compatibility",
    title: "Check Smart Home Compatibility",
    description:
      "Given a target smart-home ecosystem and a list of device models, diagnose protocol-level compatibility, flag conflicts, and suggest bridges where needed. Deterministic, protocol-based (no product-level claims).",
    inputSchema: {
      type: "object",
      properties: {
        target_ecosystem: {
          type: "string",
          enum: ECOSYSTEMS.map((e) => e.id),
          description: "Target ecosystem id, e.g. apple_home, amazon_alexa, google_home, home_assistant.",
        },
        device_models: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "List of device model names/descriptions to check.",
        },
      },
      required: ["target_ecosystem", "device_models"],
    },
  },
  {
    name: "curate_smart_vibe_drop",
    title: "Curate Smart Vibe Drop",
    description:
      "Deterministically curate a smart-home 'vibe drop' bundle: 1 anchor + 2 accessories for a room, with placeholder pricing, a quote id, validity, and a checkout link. No real retail prices are asserted.",
    inputSchema: {
      type: "object",
      properties: {
        room_type: { type: "string", enum: ROOM_TYPES, description: "Room to outfit." },
        ecosystem: { type: "string", enum: ECOSYSTEMS.map((e) => e.id), description: "Target ecosystem id." },
        vibe_style: { type: "string", enum: VIBE_STYLES, description: "Desired aesthetic/ambience style." },
        max_budget_usd: { type: "number", minimum: 0.01, maximum: 100000, description: "Maximum budget in USD." },
        rent_friendly: { type: "boolean", description: "Prefer renter-friendly (non-hardwired) items." },
      },
      required: ["room_type", "ecosystem", "vibe_style", "max_budget_usd", "rent_friendly"],
    },
  },
  {
    name: "checkout_smart_drop_bundle",
    title: "Checkout Smart Drop Bundle",
    description:
      "Resolve a previously curated quote_id into a checkout URL (Stripe Link / Shopify, or a demo placeholder), only after the user confirms.",
    inputSchema: {
      type: "object",
      properties: {
        quote_id: { type: "string", description: "The quote id returned by curate_smart_vibe_drop." },
        user_confirmed: { type: "boolean", description: "Whether the user explicitly confirmed the bundle." },
      },
      required: ["quote_id", "user_confirmed"],
    },
  },
  {
    name: "match_local_installer",
    title: "Match Local Installer",
    description:
      "Match a local installer for a given location/zip and service scope. Sandbox placeholder only — returns a deterministic confirmation code, never real installer identities or ratings.",
    inputSchema: {
      type: "object",
      properties: {
        location_or_zip: { type: "string", description: "US ZIP code or city/state string." },
        service_scope: {
          type: "string",
          enum: SERVICE_SCOPES,
          description: "Service scope: install, consultation, retrofit, troubleshoot.",
        },
      },
      required: ["location_or_zip", "service_scope"],
    },
  },
];

const S2RB_TOOL_DEFINITIONS = [
  {
    name: "s2rb_register_or_verify_agent",
    title: "S2彩虹桥 Agent Registration / Verification",
    description:
      "Register a new agent (or verify an existing S2-DID) on the S2彩虹桥 identity layer. Returns the 22-character checksummed S2-DID, membership tier, tier pricing, and the full capability matrix for that tier.",
    inputSchema: {
      type: "object",
      properties: {
        agent_code: {
          type: "string",
          description: "Optional deterministic agent code used to derive a reproducible S2-DID when registering. Omit to generate a random DID.",
        },
        s2_did: {
          type: "string",
          description: "Optional existing 22-char S2-DID to verify. If provided, verification is performed instead of registration.",
        },
      },
    },
  },
  {
    name: "co_create_seed_markdown",
    title: "Co-Create Seed Markdown (Tidal DB)",
    description:
      "Submit a co-creation action into the Cent-style Tidal DB. Validates the S2-DID, gates the operation by membership tier, SHA-256 hashes the payload, and returns the action JSONL ledger line plus a Markdown preview with long_term_memory frontmatter.",
    inputSchema: {
      type: "object",
      properties: {
        s2_did: { type: "string", description: "Valid 22-char S2-DID of the co-creating agent." },
        sector: { type: "string", enum: SECTORS, description: "One of the 5 residential sectors." },
        operation: {
          type: "string",
          enum: TIDAL_OPERATIONS,
          description: "CREATE | UPDATE | APPEND_MEMORY | PROMO_BROADCAST.",
        },
        target_markdown_path: {
          type: "string",
          description: "Target markdown path in the knowledge base, e.g. knowledge-base/sectors/01-smart-home/sector-index.md.",
        },
        title: { type: "string", description: "Short title for the seed markdown." },
        markdown_delta: { type: "string", description: "The Markdown body delta to commit." },
        long_term_memory_tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags persisted into the long_term_memory frontmatter field.",
        },
      },
      required: [
        "s2_did",
        "sector",
        "operation",
        "target_markdown_path",
        "title",
        "markdown_delta",
        "long_term_memory_tags",
      ],
    },
  },
  {
    name: "mqtt_and_federation_hub",
    title: "MQTT + Blockchain Federation Hub",
    description:
      "Query and operate the MQTT pub/sub router and the SHA-256 + Merkle blockchain federation. Subcommands: status, publish, subscribe, repos, anchor.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["status", "publish", "subscribe", "repos", "anchor"],
          description: "Hub subcommand.",
        },
        s2_did: { type: "string", description: "Valid S2-DID (required for publish/subscribe/anchor)." },
        topic: { type: "string", description: "MQTT topic for publish, e.g. 1000home/v2/smart-home/broadcast." },
        payload: { type: "object", description: "Payload object for publish." },
        qos: { type: "number", enum: [0, 1, 2], description: "MQTT QoS level for publish." },
        sector: { type: "string", enum: SECTORS, description: "Sector filter for repos/anchor." },
        spoke_repo_url: { type: "string", description: "External GitHub repo URL for anchor." },
        content_leaves: {
          type: "array",
          items: { type: "string" },
          description: "Content leaves for the anchor Merkle root.",
        },
        topic_filter: {
          type: "string",
          description: "MQTT topic filter for subscribe, e.g. 1000home/v2/smart-home/#.",
        },
        limit: { type: "number", description: "Max retained messages to return for subscribe." },
      },
      required: ["action"],
    },
  },
];

const TOOL_DEFINITIONS = S2RB_ENABLED
  ? [...CORE_TOOL_DEFINITIONS, ...S2RB_TOOL_DEFINITIONS]
  : CORE_TOOL_DEFINITIONS;

// ---------------------------------------------------------------------------
// JSON-RPC 响应助手
// ---------------------------------------------------------------------------

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

function jsonRpcResult(id: string | number, result: unknown): object {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string): object {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ---------------------------------------------------------------------------
// 工具调用分派
// ---------------------------------------------------------------------------

function callTool(name: string, args: Record<string, unknown>): { content: { type: "text"; text: string }[]; isError: boolean } {
  const S2RB_TOOL_NAMES = ["s2rb_register_or_verify_agent", "co_create_seed_markdown", "mqtt_and_federation_hub"];
  if (!S2RB_ENABLED && S2RB_TOOL_NAMES.includes(name)) {
    return {
      content: [{ type: "text", text: `Tool disabled (S2RB_ENABLED=false): ${name}` }],
      isError: true,
    };
  }
  switch (name) {
    case "check_smarthome_compatibility": {
      const result = checkCompatibility(args.target_ecosystem as string, args.device_models as string[]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false };
    }
    case "curate_smart_vibe_drop": {
      const result = curateVibeDrop(args as unknown as Parameters<typeof curateVibeDrop>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false };
    }
    case "checkout_smart_drop_bundle": {
      const result = checkoutBundle(args.quote_id as string, args.user_confirmed as boolean);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false };
    }
    case "match_local_installer": {
      const result = matchInstaller(args.location_or_zip as string, args.service_scope as string);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false };
    }
    case "s2rb_register_or_verify_agent": {
      const result = registerOrVerifyAgent(args);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false };
    }
    case "co_create_seed_markdown": {
      const result = submitCoCreationAction({
        s2Did: args.s2_did as string,
        sector: args.sector as Sector,
        operation: args.operation as TidalOperation,
        targetMarkdownPath: args.target_markdown_path as string,
        title: args.title as string,
        markdownDelta: args.markdown_delta as string,
        longTermMemoryTags: args.long_term_memory_tags as string[],
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false };
    }
    case "mqtt_and_federation_hub": {
      return runMqttFederationHub(args);
    }
    default: {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// MCP 2.0 种子中心工具实现
// ---------------------------------------------------------------------------

function registerOrVerifyAgent(args: Record<string, unknown>): Record<string, unknown> {
  const s2Did = args.s2_did as string | undefined;
  if (s2Did) {
    const valid = validateS2DID(s2Did);
    const tier = tierForDid(s2Did);
    return {
      mode: "verify",
      s2_did: s2Did,
      valid,
      tier,
      tier_pricing: TIER_PRICING[tier],
      capabilities: TIER_MATRIX[tier],
    };
  }
  const did = generateS2DID(args.agent_code as string | undefined);
  const tier = tierForDid(did);
  return {
    mode: "register",
    s2_did: did,
    valid: true,
    tier,
    tier_pricing: TIER_PRICING[tier],
    capabilities: TIER_MATRIX[tier],
    membership_tiers: MEMBERSHIP_TIERS,
    seed_dids: SEED_DIDS,
  };
}

function runMqttFederationHub(
  args: Record<string, unknown>,
): { content: { type: "text"; text: string }[]; isError: boolean } {
  const action = args.action as string;
  const did = args.s2_did as string | undefined;

  const ok = (result: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    isError: false,
  });
  const err = (message: string) => ({
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  });

  switch (action) {
    case "status": {
      return ok({
        mqtt: { active_channels: activeChannels(), retained_messages: retainedCount() },
        federation: {
          mother_repo: MOTHER_REPO,
          height: getFederationHeight(),
          chain_integrity_verified: verifyChainIntegrity(),
        },
      });
    }
    case "publish": {
      if (!did) return err("publish requires s2_did");
      const tier = tierForDid(did);
      const receipt = publishMqttBroadcast(
        did,
        tier,
        args.topic as string,
        (args.payload as Record<string, unknown>) ?? {},
        ((args.qos as 0 | 1 | 2) ?? 1) as 0 | 1 | 2,
      );
      return ok(receipt);
    }
    case "subscribe": {
      if (!did) return err("subscribe requires s2_did");
      const topicFilter = (args.topic_filter as string) ?? "1000home/v2/#";
      const messages = subscribeMqttFeed(did, topicFilter, (args.limit as number) ?? 20);
      return ok({ s2_did: did, topic_filter: topicFilter, messages });
    }
    case "repos": {
      const sector = args.sector as Sector | undefined;
      return ok({ blocks: queryFederatedRepos(sector) });
    }
    case "anchor": {
      if (!did) return err("anchor requires s2_did");
      const res = anchorSpokeRepository({
        spokeRepoUrl: args.spoke_repo_url as string,
        sector: args.sector as Sector,
        s2DidOwner: did,
        contentLeaves: args.content_leaves as string[],
      });
      if (!res.ok) return err(res.reason ?? "anchor failed");
      return ok(res);
    }
    default:
      return err(`Unknown hub action: ${action}`);
  }
}

// ---------------------------------------------------------------------------
// 单条 JSON-RPC 消息处理
// ---------------------------------------------------------------------------

function handleMessage(msg: JsonRpcRequest): object | null {
  const method = msg.method ?? "";
  const id = (msg.id ?? null) as string | number | null;

  switch (method) {
    case "initialize": {
      const clientVersion = (msg.params?.protocolVersion as string) ?? DEFAULT_PROTOCOL_VERSION;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion)
        ? clientVersion
        : DEFAULT_PROTOCOL_VERSION;
      return jsonRpcResult(id as string | number, {
        protocolVersion,
        capabilities: { tools: { listChanged: true } },
        serverInfo: SERVER_INFO,
        instructions:
          "HomeEasy S2彩虹桥 MCP 2.0 server — Residential Living Open Content Seed Center. Use tools/list to discover the 7 tools (4 smart-drop + 3 seed-hub), then tools/call to run them.",
      });
    }
    case "tools/list": {
      return jsonRpcResult(id as string | number, {
        tools: TOOL_DEFINITIONS.map((t) => ({ ...t })),
      });
    }
    case "tools/call": {
      const name = (msg.params?.name as string) ?? "";
      const args = (msg.params?.arguments as Record<string, unknown>) ?? {};
      try {
        const result = callTool(name, args);
        return jsonRpcResult(id as string | number, result);
      } catch (err) {
        return jsonRpcError(id, -32602, `Invalid params: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    case "ping": {
      return jsonRpcResult(id as string | number, {});
    }
    case "resources/list": {
      return jsonRpcResult(id as string | number, { resources: [] });
    }
    case "prompts/list": {
      return jsonRpcResult(id as string | number, { prompts: [] });
    }
    default: {
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP 入口
// ---------------------------------------------------------------------------

const HEALTH_PAYLOAD = {
  status: "online",
  service: "HomeEasy S2彩虹桥 MCP 2.0 Seed Center",
  version: "2.0.0",
  endpoint: "/mcp",
} as const;

/**
 * 安全获取 header 的辅助函数：兼容 Web 标准 Headers（.get()）与普通对象（小写键）两种形态。
 */
const getHeader = (req: Request, name: string): string => {
  if (req.headers && typeof (req.headers as Headers).get === "function") {
    return (req.headers as Headers).get(name) ?? "";
  }
  const obj = req.headers as unknown as Record<string, string | undefined>;
  return obj?.[name.toLowerCase()] ?? "";
};

export async function handleMCPRequest(req: Request): Promise<Response> {
  const method = req.method.toUpperCase();

  // OPTIONS 预检（CORS）
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      },
    });
  }

  // GET：浏览器返回健康 JSON；SSE 探测（Accept: text/event-stream 或带 MCP 协议头）返回 405
  // ——本服务是纯请求/响应式 JSON-RPC，不提供服务器推送 SSE 流，规范允许（SDK 客户端也把 405 视为预期）。
  if (method === "GET") {
    const accept = getHeader(req, "accept");
    const hasMCPHeader = getHeader(req, "mcp-protocol-version") !== "";
    if (accept.includes("text/event-stream") || hasMCPHeader) {
      return new Response("This MCP server is request/response only; use POST JSON-RPC. GET SSE streaming is not offered.", {
        status: 405,
        headers: {
          Allow: "POST, DELETE, OPTIONS",
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    return jsonResponse(HEALTH_PAYLOAD);
  }

  // DELETE：终止会话（无状态，直接成功）
  if (method === "DELETE") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // POST：JSON-RPC
  if (method === "POST") {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(jsonRpcError(null, -32700, "Parse error: Invalid JSON"), 400);
    }

    // 批量请求（数组）
    if (Array.isArray(body)) {
      const responses = (body as JsonRpcRequest[])
        .map((msg) => handleMessage(msg))
        .filter((r): r is object => r !== null);
      return jsonResponse(responses.length === 1 ? responses[0] : responses);
    }

    const msg = body as JsonRpcRequest;

    // 通知（无 id）：MCP 客户端如 notifications/initialized 不期待响应，返回 202。
    if (msg.id === undefined || msg.id === null) {
      return new Response(null, {
        status: 202,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    return jsonResponse(handleMessage(msg));
  }

  // 其他方法
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, POST, DELETE, OPTIONS" },
  });
}
