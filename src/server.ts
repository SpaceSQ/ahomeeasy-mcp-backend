import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
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

/**
 * 创建并注册 4 个 SmartDrop 工具的 McpServer。
 * 每个请求都新建一份（无状态），Vercel 单次调用即单请求，天然安全。
 */
export function createServer(): McpServer {
  const server = new McpServer(SERVER_INFO);

  // 1) 兼容性诊断
  server.registerTool(
    "check_smarthome_compatibility",
    {
      title: "Check Smart Home Compatibility",
      description:
        "Given a target smart-home ecosystem and a list of device models, diagnose protocol-level compatibility, flag conflicts, and suggest bridges where needed. Deterministic, protocol-based (no product-level claims).",
      inputSchema: {
        target_ecosystem: z
          .enum(ECOSYSTEMS.map((e) => e.id) as [string, ...string[]])
          .describe("Target ecosystem id, e.g. apple_home, amazon_alexa, google_home, home_assistant."),
        device_models: z
          .array(z.string().min(1))
          .min(1)
          .describe("List of device model names/descriptions to check."),
      },
    },
    async (args) => {
      const result = checkCompatibility(args.target_ecosystem, args.device_models);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // 2) 智能氛围套餐报价
  server.registerTool(
    "curate_smart_vibe_drop",
    {
      title: "Curate Smart Vibe Drop",
      description:
        "Deterministically curate a smart-home 'vibe drop' bundle: 1 anchor + 2 accessories for a room, with placeholder pricing, a quote id, validity, and a checkout link. No real retail prices are asserted.",
      inputSchema: {
        room_type: z
          .enum(ROOM_TYPES as [string, ...string[]])
          .describe("Room to outfit."),
        ecosystem: z
          .enum(ECOSYSTEMS.map((e) => e.id) as [string, ...string[]])
          .describe("Target ecosystem id."),
        vibe_style: z
          .enum(VIBE_STYLES as [string, ...string[]])
          .describe("Desired aesthetic/ambience style."),
        max_budget_usd: z
          .number()
          .positive()
          .max(100000)
          .describe("Maximum budget in USD."),
        rent_friendly: z
          .boolean()
          .describe("Prefer renter-friendly (non-hardwired) items."),
      },
    },
    async (args) => {
      const result = curateVibeDrop(args);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // 3) 结账
  server.registerTool(
    "checkout_smart_drop_bundle",
    {
      title: "Checkout Smart Drop Bundle",
      description:
        "Resolve a previously curated quote_id into a checkout URL (Stripe Link / Shopify, or a demo placeholder), only after the user confirms.",
      inputSchema: {
        quote_id: z.string().min(1).describe("The quote id returned by curate_smart_vibe_drop."),
        user_confirmed: z.boolean().describe("Whether the user explicitly confirmed the bundle."),
      },
    },
    async (args) => {
      const result = checkoutBundle(args.quote_id, args.user_confirmed);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // 4) 本地安装商匹配
  server.registerTool(
    "match_local_installer",
    {
      title: "Match Local Installer",
      description:
        "Match a local installer for a given location/zip and service scope. Sandbox placeholder only — returns a deterministic confirmation code, never real installer identities or ratings.",
      inputSchema: {
        location_or_zip: z
          .string()
          .min(1)
          .describe("US ZIP code or city/state string."),
        service_scope: z
          .enum(SERVICE_SCOPES as [string, ...string[]])
          .describe("Service scope: install, consultation, retrofit, troubleshoot."),
      },
    },
    async (args) => {
      const result = matchInstaller(args.location_or_zip, args.service_scope);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

/**
 * 处理一个 Web 标准 Request，返回 Response。
 * 完全免鉴权（无凭证也放行 tools/list 等公开探测请求）。
 * GET=SSE、POST=JSON-RPC、DELETE=会话终止，均由 transport 内部处理。
 */
export async function handleMCPRequest(req: Request): Promise<Response> {
  // OPTIONS 预检（CORS）
  if (req.method === "OPTIONS") {
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

  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // 无状态模式：不校验 session，免鉴权
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}
