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
  return handleMCPRequest(request);
}
