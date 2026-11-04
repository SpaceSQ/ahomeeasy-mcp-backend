import { handleMCPRequest } from "../src/server.js";

/**
 * Vercel Serverless 入口（Node.js runtime）。
 *
 * 采用 Vercel 推荐的 Web 'fetch'-style 命名 HTTP 方法导出：
 * 每个 HTTP 方法一个命名导出，接收标准 `Request`、返回 `Response`。
 * （不要用 `export default` 返回 Response —— 那会被 Vercel 当成 legacy (req,res) 处理器，
 *   导致响应未被正确写入、触发 FUNCTION_INVOCATION_TIMEOUT。）
 *
 * 完全免鉴权：无凭证 / Meta Muse 平台的公开探测请求（tools/list 等）一律放行。
 */
export const config = {
  runtime: "nodejs",
};

export async function GET(request: Request): Promise<Response> {
  return handleMCPRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleMCPRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleMCPRequest(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleMCPRequest(request);
}
