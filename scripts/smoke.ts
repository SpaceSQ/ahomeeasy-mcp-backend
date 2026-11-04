import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL || "http://localhost:8787/mcp";

function textOf(result: unknown): string {
  const content = (result as { content?: unknown }).content;
  if (Array.isArray(content)) {
    const first = content[0] as { text?: string } | undefined;
    if (first && typeof first.text === "string") return first.text;
  }
  return JSON.stringify(result);
}

async function main() {
  const client = new Client({ name: "smoke", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url));

  // 免鉴权连接
  await client.connect(transport);

  // 1) tools/list（公开探测，必须免鉴权返回）
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  console.log("tools/list OK →", names);

  const expected = [
    "check_smarthome_compatibility",
    "checkout_smart_drop_bundle",
    "curate_smart_vibe_drop",
    "match_local_installer",
  ].sort();
  const missing = expected.filter((n) => !names.includes(n));
  if (missing.length) {
    throw new Error(`Missing tools: ${missing.join(", ")}`);
  }

  // 2) check_smarthome_compatibility
  const compat = await client.callTool({
    name: "check_smarthome_compatibility",
    arguments: {
      target_ecosystem: "apple_home",
      device_models: ["Aqara Door Sensor (Zigbee)", "Nanoleaf Matter Bulb (Matter)"],
    },
  });
  console.log("\ncheck_smarthome_compatibility →");
  console.log(textOf(compat));

  // 3) curate_smart_vibe_drop
  const quote = await client.callTool({
    name: "curate_smart_vibe_drop",
    arguments: {
      room_type: "living_room",
      ecosystem: "apple_home",
      vibe_style: "cozy_warm",
      max_budget_usd: 250,
      rent_friendly: true,
    },
  });
  console.log("\ncurate_smart_vibe_drop →");
  console.log(textOf(quote));

  // 4) checkout（用上一步的 quote_id）
  const quoteText = textOf(quote);
  const quoteId = (JSON.parse(quoteText).quote_id as string) || "q_invalid";
  const checkout = await client.callTool({
    name: "checkout_smart_drop_bundle",
    arguments: { quote_id: quoteId, user_confirmed: true },
  });
  console.log("\ncheckout_smart_drop_bundle →");
  console.log(textOf(checkout));

  // 5) match_local_installer
  const installer = await client.callTool({
    name: "match_local_installer",
    arguments: { location_or_zip: "94105", service_scope: "install" },
  });
  console.log("\nmatch_local_installer →");
  console.log(textOf(installer));

  await client.close();
  console.log("\n✅ Smoke test passed (4 tools, unauthenticated).");
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exit(1);
});
