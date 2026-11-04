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

const SERVER_INFO = { name: "ahomeeasy-mcp-backend", version: "1.0.0" } as const;

// 协议版本协商：客户端未指定或版本不兼容时回退到此默认版本。
const DEFAULT_PROTOCOL_VERSION = "2025-03-26";
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-03-26", "2025-06-18", "2025-11-25"];

// ---------------------------------------------------------------------------
// 工具定义（tools/list 返回的标准 JSON Schema）
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
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
] as const;

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
    default: {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
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
          "HomeEasy SmartDrop MCP server. Use tools/list to discover the 4 tools, then tools/call to run them.",
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
  service: "HomeEasy SmartDrop MCP Server",
  version: "1.0.0",
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
