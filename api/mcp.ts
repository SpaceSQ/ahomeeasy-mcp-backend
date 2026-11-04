import { handleMCPRequest } from "../src/server.js";

/**
 * Vercel Serverless 入口（Node.js runtime）。
 *
 * 完全免鉴权：无凭证 / Meta Muse 平台的公开探测请求（tools/list 等）一律放行。
 * GET=SSE、POST=JSON-RPC、DELETE=会话终止，均由 WebStandardStreamableHTTPServerTransport 内部处理。
 */
export const config = {
  runtime: "nodejs",
};

export default async function handler(request: Request): Promise<Response> {
  // 完全免鉴权；普通浏览器 GET 返回健康检查 JSON、MCP GET/POST/DELETE 走底层 transport，
  // 均由 handleMCPRequest 统一处理（见 src/server.ts）。
  return handleMCPRequest(request);
}
