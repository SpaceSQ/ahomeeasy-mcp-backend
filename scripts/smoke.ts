import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SEED_DIDS, validateS2DID, tierForDid } from "../src/s2rb/identity.js";
import { verifyChainIntegrity, getFederationHeight } from "../src/blockchain/federation.js";

const url = process.env.MCP_URL || "http://localhost:8787/mcp";

function textOf(result: unknown): string {
  const content = (result as { content?: unknown }).content;
  if (Array.isArray(content)) {
    const first = content[0] as { text?: string } | undefined;
    if (first && typeof first.text === "string") return first.text;
  }
  return JSON.stringify(result);
}

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}

async function main() {
  // 0) 直接单测：S2-DID 校验算法 + 区块链哈希链完整性（确定性，与服务器同源）。
  assert(validateS2DID(SEED_DIDS.BRAND_TITAN), "BRAND_TITAN seed DID must be valid");
  assert(validateS2DID(SEED_DIDS.BRAND_PRO), "BRAND_PRO seed DID must be valid");
  assert(validateS2DID(SEED_DIDS.CONTRIBUTOR), "CONTRIBUTOR seed DID must be valid");
  assert(!validateS2DID("S2NOTAVALIDDID000000"), "corrupt DID must be invalid");
  assert(tierForDid(SEED_DIDS.BRAND_TITAN) === "BRAND_TITAN", "seed DID → BRAND_TITAN");
  assert(verifyChainIntegrity() === true, "federation hash chain integrity must verify");
  assert(getFederationHeight() === 5, "genesis + 5 sector spokes = height 5");

  const client = new Client({ name: "smoke", version: "2.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url));

  // 免鉴权连接
  await client.connect(transport);

  // 1) tools/list（公开探测，必须免鉴权返回）
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  console.log("tools/list OK →", names);

  const coreExpected = [
    "check_smarthome_compatibility",
    "checkout_smart_drop_bundle",
    "curate_smart_vibe_drop",
    "match_local_installer",
  ].sort();
  const newExpected = [
    "s2rb_register_or_verify_agent",
    "co_create_seed_markdown",
    "mqtt_and_federation_hub",
  ].sort();

  const missingCore = coreExpected.filter((n) => !names.includes(n));
  if (missingCore.length) {
    throw new Error(`Missing core tools: ${missingCore.join(", ")}`);
  }
  if (names.length < 4) {
    throw new Error(`Expected >=4 tools, got ${names.length}`);
  }
  const s2rbOn = newExpected.every((n) => names.includes(n));

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

  if (s2rbOn) {
    // 6) s2rb_register_or_verify_agent（verify 种子 DID）
    const verify = await client.callTool({
      name: "s2rb_register_or_verify_agent",
      arguments: { s2_did: SEED_DIDS.BRAND_PRO },
    });
    console.log("\ns2rb_register_or_verify_agent (verify) →");
    console.log(textOf(verify));
    const verifyText = JSON.parse(textOf(verify));
    assert(verifyText.valid === true, "BRAND_PRO seed DID must verify");
    assert(verifyText.tier === "BRAND_PRO", "verified tier must be BRAND_PRO");

    // 6b) register（随机生成）
    const reg = await client.callTool({
      name: "s2rb_register_or_verify_agent",
      arguments: {},
    });
    const regText = JSON.parse(textOf(reg));
    assert(regText.valid === true && typeof regText.s2_did === "string" && regText.s2_did.length === 22, "register must produce 22-char valid DID");

    // 7) co_create_seed_markdown（BRAND_PRO 日更共创）
    const co = await client.callTool({
      name: "co_create_seed_markdown",
      arguments: {
        s2_did: SEED_DIDS.BRAND_PRO,
        sector: "smart-home",
        operation: "CREATE",
        target_markdown_path: "knowledge-base/sectors/01-smart-home/sector-index.md",
        title: "Smart Home Sector Seed",
        markdown_delta: "Matter 1.4 + Thread mesh seed content.",
        long_term_memory_tags: ["matter", "thread", "seed"],
      },
    });
    console.log("\nco_create_seed_markdown →");
    console.log(textOf(co));
    const coText = JSON.parse(textOf(co));
    assert(coText.tier === "BRAND_PRO", "co-create tier must be BRAND_PRO");
    assert(coText.action && coText.action.contentHash, "co-create must return a SHA-256 content hash");
    assert(coText.jsonl.includes("contentHash"), "co-create JSONL must include contentHash");

    // 8) mqtt_and_federation_hub — status
    const status = await client.callTool({
      name: "mqtt_and_federation_hub",
      arguments: { action: "status" },
    });
    console.log("\nmqtt_and_federation_hub (status) →");
    console.log(textOf(status));
    const statusText = JSON.parse(textOf(status));
    assert(statusText.mqtt.active_channels.length === 5, "MQTT must expose 5 sector channels");
    assert(statusText.federation.chain_integrity_verified === true, "federation integrity must be true");

    // 8b) publish（BRAND_PRO 广播）+ subscribe
    const pub = await client.callTool({
      name: "mqtt_and_federation_hub",
      arguments: {
        action: "publish",
        s2_did: SEED_DIDS.BRAND_PRO,
        topic: "1000home/v2/smart-home/broadcast",
        payload: { title: "Matter 1.4 Seed", tier: "BRAND_PRO" },
        qos: 1,
      },
    });
    const pubText = JSON.parse(textOf(pub));
    assert(pubText.accepted === true, "BRAND_PRO publish must be accepted");

    const sub = await client.callTool({
      name: "mqtt_and_federation_hub",
      arguments: { action: "subscribe", s2_did: SEED_DIDS.CONTRIBUTOR, topic_filter: "1000home/v2/smart-home/#" },
    });
    const subText = JSON.parse(textOf(sub));
    assert(Array.isArray(subText.messages) && subText.messages.length >= 1, "subscribe must return the retained broadcast");

    // 8c) repos
    const repos = await client.callTool({
      name: "mqtt_and_federation_hub",
      arguments: { action: "repos" },
    });
    const reposText = JSON.parse(textOf(repos));
    assert(Array.isArray(reposText.blocks) && reposText.blocks.length >= 6, "federation must expose genesis + 5 spokes");
  }

  await client.close();
  console.log(`\n✅ Smoke test passed (${names.length} tools, unauthenticated).`);
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exit(1);
});
