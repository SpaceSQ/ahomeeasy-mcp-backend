# ahomeeasy-mcp-backend

轻量级 **MCP（Model Context Protocol）后端**，为 Meta Muse 的 HomeEasy SmartDrop 提供 4 个工具。

- 基于 `@modelcontextprotocol/sdk` v1.32（`WebStandardStreamableHTTPServerTransport`）
- Vercel Serverless（Node.js runtime），无状态（`sessionIdGenerator: undefined`）
- **完全免鉴权**：无凭证 / Meta Muse 平台的公开探测请求（`tools/list` 等）一律放行，彻底解决 `Your server asks for credentials` 报错
- 与静态落地页 `ahomeeasy` 相互独立（不同 Vercel 项目，不混在一起）

## 4 个工具

| 工具 | 输入 | 输出 |
| --- | --- | --- |
| `check_smarthome_compatibility` | `target_ecosystem`, `device_models[]` | 协议级兼容性诊断、冲突、桥接建议 |
| `curate_smart_vibe_drop` | `room_type`, `ecosystem`, `vibe_style`, `max_budget_usd`, `rent_friendly` | 确定性报价（1 锚点 + 2 配件）、`quote_id`、有效期、结账链接 |
| `checkout_smart_drop_bundle` | `quote_id`, `user_confirmed` | Stripe Link / Shopify（或 demo 占位）结账 URL |
| `match_local_installer` | `location_or_zip`, `service_scope` | 安装商匹配状态 + 确定性确认码（demo 占位） |

> 零幻觉：价格均为占位估价（`is_demo`/`pricing_disclaimer` 明确标注）；兼容性仅基于协议级事实矩阵；安装商为 demo 占位，不虚构真实姓名/地址/评分。

## 本地运行

```bash
npm install
npm run dev        # http://localhost:8787/mcp
npm run smoke      # 另开一个终端，跑免鉴权 tools/list + 4 工具回环测试
npm run typecheck
```

## 部署到 Vercel

1. 在 Vercel 新建项目，根目录指向 `~/AppleHome/mcp-backend/`（**不是** `ahomeeasy` 那个静态项目）。
2. Framework Preset 选 **Other**（或手动识别）。
3. 部署后得到生产 URL（例如 `https://<project>.vercel.app/mcp`）。
4. 可选：绑定自定义子域（如 `api-mcp.1000home.com`）。
5. 回到 **Meta Muse 平台**，把 Hosted MCP endpoint 改为该真实 URL（以 `/mcp` 结尾）。

### 环境变量（可选）

- `STRIPE_PAYMENT_LINK` — 真实 Stripe 结账链接（不配置则返回 demo 占位链接）
- `SHOPIFY_STORE` — Shopify 店铺地址（不配置则返回 demo 占位链接）
