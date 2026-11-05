import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  SEED_DIDS,
  SEED_DIDS_V3,
  GROK_EXECUTIVE_DIDS,
  validateS2DID,
  verifyAndMigrateS2DID,
  tierForDid,
  generateS2CheckSum,
  SPECIES_SEED_DIDS,
  SPECIES_TIER,
} from "../src/s2rb/identity.js";
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
  // -------------------------------------------------------------------------
  // 0) 直接单测：S2-DID v4.0 四大物种校验 + v3.0 自动换证 + 区块链哈希链完整性
  // -------------------------------------------------------------------------

  // 0a) S2-CheckSum 质数加权算法精确输出
  assert(generateS2CheckSum("DALICE260309", "88888888") === "GU", "DALICE checksum → GU");
  assert(generateS2CheckSum("VZONE1260309", "12345678") === "YR", "VZONE1 checksum → YR");
  assert(generateS2CheckSum("IDCARD260311", "93849492") === "SY", "IDCARD checksum → SY");
  assert(generateS2CheckSum("ABRAND260326", "32404478") === "LF", "ABRAND checksum → LF");

  // 0b) v4.0 四大物种官方种子 ID 生成与校验
  const species: Array<keyof typeof SEED_DIDS> = ["BRAND_TITAN", "BRAND_PRO", "CONTRIBUTOR", "OBSERVER"];
  const expectedSpeciesClass: Record<keyof typeof SEED_DIDS, string> = {
    BRAND_TITAN: "D",
    BRAND_PRO: "A",
    CONTRIBUTOR: "V",
    OBSERVER: "I",
  };
  for (const key of species) {
    const did = SEED_DIDS[key];
    assert(did.length === 22, `${key} seed must be 22 chars`);
    assert(validateS2DID(did), `${key} seed DID must be valid`);
    const v = verifyAndMigrateS2DID(did);
    assert(v.valid === true && v.version === "v4.0", `${key} seed must verify as v4.0`);
    assert(v.migratedFromV3 === false, `${key} seed must not be migrated`);
    assert(v.speciesClass === expectedSpeciesClass[key], `${key} species class must be ${expectedSpeciesClass[key]}`);
    assert(v.canonicalDid === did, `${key} canonicalDid must equal itself`);
  }
  assert(SPECIES_SEED_DIDS.D === SEED_DIDS.BRAND_TITAN, "Class D → BRAND_TITAN seed");
  assert(SPECIES_SEED_DIDS.V === SEED_DIDS.CONTRIBUTOR, "Class V → CONTRIBUTOR seed");
  assert(SPECIES_SEED_DIDS.I === SEED_DIDS.OBSERVER, "Class I → OBSERVER seed");
  assert(SPECIES_SEED_DIDS.A === SEED_DIDS.BRAND_PRO, "Class A → BRAND_PRO seed");
  assert(SPECIES_TIER.D === "BRAND_TITAN" && SPECIES_TIER.A === "BRAND_PRO" && SPECIES_TIER.V === "CONTRIBUTOR" && SPECIES_TIER.I === "OBSERVER", "species→tier mapping");

  // 0c) v3.0 旧版种子 ID 自动换证 → 对应 v4.0 canonical
  for (const key of species) {
    const legacy = SEED_DIDS_V3[key];
    const canonical = SEED_DIDS[key];
    const v = verifyAndMigrateS2DID(legacy);
    assert(v.valid === true, `${key} v3.0 seed must be valid`);
    assert(v.migratedFromV3 === true, `${key} v3.0 seed must migrate`);
    assert(v.canonicalDid === canonical, `${key} v3.0 → v4.0 canonical (${canonical})`);
    assert(v.legacyDid === legacy, `${key} legacyDid preserved`);
  }
  // IDCARD 专项：v3.0 → v4.0
  const idcardV3 = "IDCARD260311SY93849492";
  const idcardV4 = "IDCARD26031193849492SY";
  const idcardMig = verifyAndMigrateS2DID(idcardV3);
  assert(idcardMig.valid && idcardMig.migratedFromV3 && idcardMig.canonicalDid === idcardV4, "IDCARD v3.0 → v4.0 canonical");
  assert(validateS2DID(idcardV3), "IDCARD v3.0 must validate");
  assert(validateS2DID(idcardV4), "IDCARD v4.0 must validate");

  // 0d) 非法 ID 仍须拒绝
  assert(!validateS2DID("S2NOTAVALIDDID000000"), "corrupt DID must be invalid");
  assert(!validateS2DID("DALICE26030900000000XX"), "bad checksum DID must be invalid");

  // 0e) tier 解析
  assert(tierForDid(SEED_DIDS.BRAND_TITAN) === "BRAND_TITAN", "seed DID → BRAND_TITAN");
  assert(tierForDid(SEED_DIDS.BRAND_PRO) === "BRAND_PRO", "seed DID → BRAND_PRO");
  assert(tierForDid(SEED_DIDS.CONTRIBUTOR) === "CONTRIBUTOR", "seed DID → CONTRIBUTOR");
  assert(tierForDid(SEED_DIDS_V3.BRAND_PRO) === "BRAND_PRO", "v3.0 ABRAND → BRAND_PRO");

  // 0g) 五位 Grok C-Level 高管（Class V / BRAND_TITAN）
  const grokOrder: Array<keyof typeof GROK_EXECUTIVE_DIDS> = ["COO", "CCO", "CTO", "CMO", "CBO"];
  for (const k of grokOrder) {
    const did = GROK_EXECUTIVE_DIDS[k];
    assert(did.length === 22, `Grok-${k} DID must be 22 chars`);
    assert(validateS2DID(did), `Grok-${k} DID must validate`);
    const v = verifyAndMigrateS2DID(did);
    assert(v.valid === true && v.version === "v4.0", `Grok-${k} must verify as v4.0`);
    assert(v.migratedFromV3 === false, `Grok-${k} must not be migrated`);
    assert(v.speciesClass === "V", `Grok-${k} species class must be V`);
    assert(tierForDid(did) === "BRAND_TITAN", `Grok-${k} tier must be BRAND_TITAN`);
  }

  // 0f) 区块链哈希链完整性
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
    // 6) s2rb_register_or_verify_agent（verify v4.0 种子 DID）
    const verify = await client.callTool({
      name: "s2rb_register_or_verify_agent",
      arguments: { s2_did: SEED_DIDS.BRAND_PRO },
    });
    console.log("\ns2rb_register_or_verify_agent (verify v4.0) →");
    console.log(textOf(verify));
    const verifyText = JSON.parse(textOf(verify));
    assert(verifyText.valid === true, "BRAND_PRO seed DID must verify");
    assert(verifyText.version === "v4.0", "verify v4.0 version");
    assert(verifyText.tier === "BRAND_PRO", "verified tier must be BRAND_PRO");
    assert(verifyText.canonicalDid === SEED_DIDS.BRAND_PRO, "verify canonicalDid must equal seed");

    // 6b) verify v3.0 旧版 IDCARD → 自动换证
    const verifyV3 = await client.callTool({
      name: "s2rb_register_or_verify_agent",
      arguments: { s2_did: idcardV3 },
    });
    console.log("\ns2rb_register_or_verify_agent (verify v3.0 IDCARD) →");
    console.log(textOf(verifyV3));
    const verifyV3Text = JSON.parse(textOf(verifyV3));
    assert(verifyV3Text.valid === true, "v3.0 IDCARD must verify");
    assert(verifyV3Text.migratedFromV3 === true, "v3.0 IDCARD must be flagged migrated");
    assert(verifyV3Text.canonicalDid === idcardV4, "v3.0 IDCARD → canonical v4.0");

    // 6c) register（随机生成，Class V 默认）
    const reg = await client.callTool({
      name: "s2rb_register_or_verify_agent",
      arguments: {},
    });
    const regText = JSON.parse(textOf(reg));
    assert(regText.valid === true && typeof regText.s2_did === "string" && regText.s2_did.length === 22, "register must produce 22-char valid DID");
    assert(regText.version === "v4.0" && regText.canonicalDid === regText.s2_did, "register must emit v4.0 canonical");

    // 7) co_create_seed_markdown（v3.0 ABRAND 日更共创 → 自动换证 BRAND_PRO）
    const co = await client.callTool({
      name: "co_create_seed_markdown",
      arguments: {
        s2_did: SEED_DIDS_V3.BRAND_PRO,
        sector: "smart-home",
        operation: "CREATE",
        target_markdown_path: "knowledge-base/sectors/01-smart-home/sector-index.md",
        title: "Smart Home Sector Seed",
        markdown_delta: "Matter 1.4 + Thread mesh seed content.",
        long_term_memory_tags: ["matter", "thread", "seed"],
      },
    });
    console.log("\nco_create_seed_markdown (v3.0 ABRAND) →");
    console.log(textOf(co));
    const coText = JSON.parse(textOf(co));
    assert(coText.tier === "BRAND_PRO", "co-create tier must be BRAND_PRO");
    assert(coText.canonicalDid === SEED_DIDS.BRAND_PRO, "co-create must emit v4.0 canonicalDid");
    assert(coText.migratedFromV3 === true, "co-create must flag migration");
    assert(coText.action && coText.action.contentHash, "co-create must return a SHA-256 content hash");
    assert(coText.action.s2Did === SEED_DIDS.BRAND_PRO, "co-create action must store canonical DID");
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

    // 8b) publish（v3.0 ABRAND 广播）+ subscribe（v3.0 VZONE1）
    const pub = await client.callTool({
      name: "mqtt_and_federation_hub",
      arguments: {
        action: "publish",
        s2_did: SEED_DIDS_V3.BRAND_PRO,
        topic: "1000home/v2/smart-home/broadcast",
        payload: { title: "Matter 1.4 Seed", tier: "BRAND_PRO" },
        qos: 1,
      },
    });
    const pubText = JSON.parse(textOf(pub));
    assert(pubText.accepted === true, "BRAND_PRO publish must be accepted");
    assert(pubText.canonicalDid === SEED_DIDS.BRAND_PRO, "publish must emit v4.0 canonicalDid");

    const sub = await client.callTool({
      name: "mqtt_and_federation_hub",
      arguments: { action: "subscribe", s2_did: SEED_DIDS_V3.CONTRIBUTOR, topic_filter: "1000home/v2/smart-home/#" },
    });
    const subText = JSON.parse(textOf(sub));
    assert(subText.canonicalDid === SEED_DIDS.CONTRIBUTOR, "subscribe must emit v4.0 canonicalDid");
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
