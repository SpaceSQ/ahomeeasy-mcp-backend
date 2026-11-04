/**
 * 确定性知识库 + 纯函数逻辑（零幻觉：不编造真实产品价格 / 兼容性声明 / 真实安装商信息）。
 *
 * 所有「价格」均为明确标注的占位估价（is_demo / pricing_disclaimer），
 * 所有「兼容性」均来自协议级事实矩阵，未知协议一律返回 unknown 并提示核实，
 * 所有「安装商」均为 demo 占位，不虚构真实姓名 / 地址 / 评分。
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type Protocol =
  | "matter"
  | "thread"
  | "zigbee"
  | "zwave"
  | "wifi"
  | "bluetooth_le";

export type EcosystemId =
  | "apple_home"
  | "amazon_alexa"
  | "google_home"
  | "samsung_smartthings"
  | "home_assistant"
  | "aqara"
  | "tuya";

export interface EcosystemDef {
  id: EcosystemId;
  label: string;
  protocols: Protocol[];
}

export type RoomType =
  | "living_room"
  | "bedroom"
  | "home_office"
  | "kitchen"
  | "entryway"
  | "bathroom"
  | "outdoor";

export type VibeStyle =
  | "cozy_warm"
  | "futuristic_cool"
  | "minimalist_clean"
  | "bold_color"
  | "zen_calm";

export type ServiceScope = "install" | "consultation" | "retrofit" | "troubleshoot";

// ---------------------------------------------------------------------------
// 生态与协议（协议级事实，非产品级编造）
// ---------------------------------------------------------------------------

export const ECOSYSTEMS: EcosystemDef[] = [
  { id: "apple_home", label: "Apple Home (HomeKit)", protocols: ["matter", "thread", "wifi", "bluetooth_le"] },
  { id: "amazon_alexa", label: "Amazon Alexa", protocols: ["matter", "zigbee", "wifi", "bluetooth_le"] },
  { id: "google_home", label: "Google Home", protocols: ["matter", "thread", "wifi"] },
  { id: "samsung_smartthings", label: "Samsung SmartThings", protocols: ["matter", "zigbee", "zwave", "thread", "wifi"] },
  { id: "home_assistant", label: "Home Assistant", protocols: ["matter", "zigbee", "zwave", "thread", "wifi", "bluetooth_le"] },
  { id: "aqara", label: "Aqara", protocols: ["zigbee", "matter"] },
  { id: "tuya", label: "Tuya Smart", protocols: ["zigbee", "wifi", "matter"] },
];

export const ECOSYSTEM_MAP: Record<EcosystemId, EcosystemDef> = Object.fromEntries(
  ECOSYSTEMS.map((e) => [e.id, e]),
) as Record<EcosystemId, EcosystemDef>;

const BRIDGE_SUGGESTIONS: Record<Protocol, string> = {
  zigbee:
    "Add a Zigbee hub/bridge (e.g. Amazon Echo 4th gen+ with built-in hub, Samsung SmartThings Hub, Aqara Hub, or a USB coordinator such as Conbee II for Home Assistant).",
  zwave:
    "Add a Z-Wave hub (e.g. Samsung SmartThings Hub, or a USB Z-Wave stick such as Aeotec Z-Stick for Home Assistant).",
  matter:
    "Add a Matter controller (e.g. Apple HomePod / Apple TV, Google Nest Hub, Amazon Echo, or Samsung SmartThings Station).",
  thread:
    "Add a Thread border router (e.g. Apple HomePod mini, Google Nest Hub, or Amazon Echo 4th gen+).",
  wifi: "",
  bluetooth_le: "",
};

function detectProtocol(model: string): { protocol: Protocol | null; confidence: "high" | "low" } {
  const s = model.toLowerCase();
  // 关键词命中即确定性协议；顺序有优先级（matter/thread 优先于 wifi 泛化词）
  if (/\b(z-?wave|zwave)\b/.test(s)) return { protocol: "zwave", confidence: "high" };
  if (/\bzigbee\b/.test(s)) return { protocol: "zigbee", confidence: "high" };
  if (/\bthread\b/.test(s)) return { protocol: "thread", confidence: "high" };
  if (/\bmatter\b/.test(s)) return { protocol: "matter", confidence: "high" };
  if (/\b(bluetooth|ble)\b/.test(s)) return { protocol: "bluetooth_le", confidence: "high" };
  if (/\b(wi-?fi|wifi)\b/.test(s)) return { protocol: "wifi", confidence: "high" };
  return { protocol: null, confidence: "low" };
}

// ---------------------------------------------------------------------------
// check_smarthome_compatibility
// ---------------------------------------------------------------------------

export interface DeviceCompatResult {
  model: string;
  detected_protocol: Protocol | null;
  protocol_confidence: "high" | "low" | "none";
  status: "compatible" | "incompatible" | "needs_bridge" | "unknown";
  explanation: string;
  bridge_suggestion: string | null;
}

export interface CompatibilityResult {
  ecosystem: { id: EcosystemId; label: string };
  devices: DeviceCompatResult[];
  overall_status: "compatible" | "partial" | "incompatible" | "unknown";
  summary: string;
}

export function checkCompatibility(
  targetEcosystem: string,
  deviceModels: string[],
): CompatibilityResult {
  const ecosystem = ECOSYSTEM_MAP[targetEcosystem as EcosystemId];
  if (!ecosystem) {
    throw new Error(
      `Unknown ecosystem "${targetEcosystem}". Supported: ${ECOSYSTEMS.map((e) => e.id).join(", ")}`,
    );
  }

  const supported = new Set(ecosystem.protocols);
  const devices: DeviceCompatResult[] = deviceModels.map((model) => {
    const { protocol, confidence } = detectProtocol(model);
    if (!protocol) {
      return {
        model,
        detected_protocol: null,
        protocol_confidence: "none" as const,
        status: "unknown" as const,
        explanation:
          "Protocol could not be determined from the model string. Verify with the manufacturer before assuming compatibility.",
        bridge_suggestion: null,
      };
    }

    let status: DeviceCompatResult["status"];
    let explanation: string;
    let bridgeSuggestion: string | null = null;

    if (supported.has(protocol)) {
      status = "compatible";
      explanation = `${ecosystem.label} natively supports ${protocol}.`;
    } else if (protocol === "zigbee" || protocol === "zwave") {
      // 生态缺 zigbee/zwave 原生支持时，可通过桥接解决
      status = "needs_bridge";
      explanation = `${ecosystem.label} does not natively support ${protocol}; a bridge is required.`;
      bridgeSuggestion = BRIDGE_SUGGESTIONS[protocol];
    } else {
      status = "incompatible";
      explanation = `${ecosystem.label} does not support ${protocol} and there is no standard bridge path.`;
    }

    return {
      model,
      detected_protocol: protocol,
      protocol_confidence: confidence,
      status,
      explanation,
      bridge_suggestion: bridgeSuggestion,
    };
  });

  const statuses = devices.map((d) => d.status);
  let overall: CompatibilityResult["overall_status"];
  if (statuses.every((s) => s === "compatible")) overall = "compatible";
  else if (statuses.every((s) => s === "incompatible")) overall = "incompatible";
  else if (statuses.every((s) => s === "unknown")) overall = "unknown";
  else overall = "partial";

  return {
    ecosystem: { id: ecosystem.id, label: ecosystem.label },
    devices,
    overall_status: overall,
    summary: buildCompatSummary(overall, devices),
  };
}

function buildCompatSummary(overall: CompatibilityResult["overall_status"], devices: DeviceCompatResult[]): string {
  const n = devices.length;
  switch (overall) {
    case "compatible":
      return `All ${n} device(s) are compatible with the target ecosystem.`;
    case "incompatible":
      return `None of the ${n} device(s) are compatible with the target ecosystem.`;
    case "unknown":
      return `Protocol could not be determined for ${n} device(s); manual verification required.`;
    case "partial":
      return `Mixed result across ${n} device(s); some require a bridge or verification.`;
  }
}

// ---------------------------------------------------------------------------
// 报价（curate_smart_vibe_drop / checkout_smart_drop_bundle）
// 价格均为占位估价，明确标注。
// ---------------------------------------------------------------------------

interface CatalogItem {
  name: string;
  price_usd: number;
  rent_friendly: boolean;
}

interface RoomCatalog {
  anchor: CatalogItem;
  accessories: CatalogItem[];
}

// 占位目录：价格固定、确定性地派生，不代表任何真实商品。
const ROOM_CATALOG: Record<RoomType, RoomCatalog> = {
  living_room: {
    anchor: { name: "Smart Floor Lamp (Matter)", price_usd: 129, rent_friendly: true },
    accessories: [
      { name: "Smart LED Strip (5 m)", price_usd: 59, rent_friendly: true },
      { name: "Smart Plug (2-pack)", price_usd: 39, rent_friendly: true },
      { name: "Smart Color Bulb (2-pack)", price_usd: 49, rent_friendly: true },
      { name: "Motion Sensor", price_usd: 29, rent_friendly: true },
    ],
  },
  bedroom: {
    anchor: { name: "Smart Bedside Lamp (Matter)", price_usd: 89, rent_friendly: true },
    accessories: [
      { name: "Smart Color Bulb (2-pack)", price_usd: 49, rent_friendly: true },
      { name: "Smart Plug (2-pack)", price_usd: 39, rent_friendly: true },
      { name: "Smart LED Strip (2 m)", price_usd: 35, rent_friendly: true },
      { name: "Smart Humidifier (Matter)", price_usd: 79, rent_friendly: true },
    ],
  },
  home_office: {
    anchor: { name: "Smart Desk Lamp (Matter)", price_usd: 99, rent_friendly: true },
    accessories: [
      { name: "Smart Plug (2-pack)", price_usd: 39, rent_friendly: true },
      { name: "Smart LED Strip (2 m)", price_usd: 35, rent_friendly: true },
      { name: "Smart Color Bulb (2-pack)", price_usd: 49, rent_friendly: true },
      { name: "Air Quality Monitor", price_usd: 69, rent_friendly: true },
    ],
  },
  kitchen: {
    anchor: { name: "Smart Under-Cabinet Light (Matter)", price_usd: 109, rent_friendly: false },
    accessories: [
      { name: "Smart Plug (2-pack)", price_usd: 39, rent_friendly: true },
      { name: "Smart LED Strip (2 m)", price_usd: 35, rent_friendly: true },
      { name: "Leak Sensor", price_usd: 45, rent_friendly: true },
      { name: "Smart Color Bulb (2-pack)", price_usd: 49, rent_friendly: true },
    ],
  },
  entryway: {
    anchor: { name: "Smart Ceiling Light (Matter)", price_usd: 79, rent_friendly: false },
    accessories: [
      { name: "Motion Sensor", price_usd: 29, rent_friendly: true },
      { name: "Smart Color Bulb (2-pack)", price_usd: 49, rent_friendly: true },
      { name: "Smart Plug (2-pack)", price_usd: 39, rent_friendly: true },
      { name: "Door/Window Sensor (2-pack)", price_usd: 39, rent_friendly: true },
    ],
  },
  bathroom: {
    anchor: { name: "Smart Vanity Light (Matter)", price_usd: 69, rent_friendly: false },
    accessories: [
      { name: "Humidity Sensor", price_usd: 35, rent_friendly: true },
      { name: "Smart Color Bulb (2-pack)", price_usd: 49, rent_friendly: true },
      { name: "Smart Plug (2-pack)", price_usd: 39, rent_friendly: true },
      { name: "Leak Sensor", price_usd: 45, rent_friendly: true },
    ],
  },
  outdoor: {
    anchor: { name: "Smart Outdoor Floodlight (Matter)", price_usd: 149, rent_friendly: false },
    accessories: [
      { name: "Motion Sensor", price_usd: 29, rent_friendly: true },
      { name: "Smart Plug (weatherproof)", price_usd: 45, rent_friendly: true },
      { name: "Smart Color Bulb (2-pack)", price_usd: 49, rent_friendly: true },
      { name: "Door/Window Sensor (2-pack)", price_usd: 39, rent_friendly: true },
    ],
  },
};

// vibe_style → 配件下标偏移，确定性选择 2 个配件
const VIBE_OFFSET: Record<VibeStyle, number> = {
  cozy_warm: 0,
  futuristic_cool: 1,
  minimalist_clean: 2,
  bold_color: 3,
  zen_calm: 2,
};

export const ROOM_TYPES = Object.keys(ROOM_CATALOG) as RoomType[];
export const VIBE_STYLES = Object.keys(VIBE_OFFSET) as VibeStyle[];
export const SERVICE_SCOPES: ServiceScope[] = ["install", "consultation", "retrofit", "troubleshoot"];

export interface QuoteLineItem {
  role: "anchor" | "accessory";
  name: string;
  price_usd: number;
  rent_friendly: boolean;
}

export interface QuoteResult {
  quote_id: string;
  created_at: string;
  valid_until: string;
  room_type: RoomType;
  ecosystem: EcosystemId;
  vibe_style: VibeStyle;
  rent_friendly: boolean;
  max_budget_usd: number;
  line_items: QuoteLineItem[];
  total_usd: number;
  within_budget: boolean;
  checkout_link: string;
  pricing_disclaimer: string;
  is_demo: boolean;
}

const PRICING_DISCLAIMER =
  "Placeholder estimate prices (not real retail pricing). Replace with the live HomeEasy catalog before production.";

export function curateVibeDrop(args: {
  room_type: string;
  ecosystem: string;
  vibe_style: string;
  max_budget_usd: number;
  rent_friendly: boolean;
}): QuoteResult {
  const room = ROOM_CATALOG[args.room_type as RoomType];
  if (!room) {
    throw new Error(`Unknown room_type "${args.room_type}". Supported: ${ROOM_TYPES.join(", ")}`);
  }
  if (!ECOSYSTEM_MAP[args.ecosystem as EcosystemId]) {
    throw new Error(`Unknown ecosystem "${args.ecosystem}". Supported: ${ECOSYSTEMS.map((e) => e.id).join(", ")}`);
  }
  if (!(args.vibe_style in VIBE_OFFSET)) {
    throw new Error(`Unknown vibe_style "${args.vibe_style}". Supported: ${VIBE_STYLES.join(", ")}`);
  }

  const rentFriendly = args.rent_friendly;

  // 锚点：rent_friendly 时若锚点不可租，回退到可租替代（明确标注，不静默）
  let anchor = room.anchor;
  let anchorSubstituted = false;
  if (rentFriendly && !anchor.rent_friendly) {
    const alt = room.accessories.find((a) => a.rent_friendly && a.price_usd >= 60);
    anchor = alt ?? { name: "Smart Plug Lamp (renter-friendly)", price_usd: 49, rent_friendly: true };
    anchorSubstituted = true;
  }

  // 配件池：rent_friendly 时过滤掉不可租项
  const pool = room.accessories.filter((a) => !rentFriendly || a.rent_friendly);
  const offset = VIBE_OFFSET[args.vibe_style as VibeStyle];

  const pick = (i: number) => pool[i % pool.length];
  const acc1 = pick(offset);
  const acc2 = pick(offset + 1 === offset ? offset + 2 : offset + 1); // 避免与 acc1 相同（pool 长度≥4 时天然不同）

  let lineItems: QuoteLineItem[] = [
    { role: "anchor", name: anchor.name, price_usd: anchor.price_usd, rent_friendly: anchor.rent_friendly },
    { role: "accessory", name: acc1.name, price_usd: acc1.price_usd, rent_friendly: acc1.rent_friendly },
    { role: "accessory", name: acc2.name, price_usd: acc2.price_usd, rent_friendly: acc2.rent_friendly },
  ];

  let total = lineItems.reduce((s, l) => s + l.price_usd, 0);
  const withinBudget = total <= args.max_budget_usd;

  const now = Date.now();
  const payload: Omit<QuoteResult, "quote_id"> & { anchor_substituted: boolean } = {
    created_at: new Date(now).toISOString(),
    valid_until: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 天
    room_type: args.room_type as RoomType,
    ecosystem: args.ecosystem as EcosystemId,
    vibe_style: args.vibe_style as VibeStyle,
    rent_friendly: rentFriendly,
    max_budget_usd: args.max_budget_usd,
    line_items: lineItems,
    total_usd: total,
    within_budget: withinBudget,
    checkout_link: "",
    pricing_disclaimer: PRICING_DISCLAIMER,
    is_demo: true,
    anchor_substituted: anchorSubstituted,
  };

  const quoteId = encodeQuotePayload(payload);
  const checkoutLink = buildCheckoutLink(total);

  return {
    ...payload,
    quote_id: quoteId,
    checkout_link: checkoutLink,
  };
}

// ---------------------------------------------------------------------------
// quote_id：自包含 token（无状态，无需数据库即可在 checkout 时还原）
// ---------------------------------------------------------------------------

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function encodeQuotePayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  return `q_${b64}_${fnv1a(json)}`;
}

export function decodeQuotePayload(quoteId: string): (Record<string, unknown> & { total_usd: number }) | null {
  const m = /^q_([A-Za-z0-9_-]+)_([0-9a-f]{8})$/.exec(quoteId);
  if (!m) return null;
  const [, b64, checksum] = m;
  let json: string;
  try {
    json = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (fnv1a(json) !== checksum) return null;
  try {
    const obj = JSON.parse(json);
    if (typeof obj !== "object" || obj === null || typeof obj.total_usd !== "number") return null;
    return obj;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 结账链接
// ---------------------------------------------------------------------------

export function buildCheckoutLink(totalUsd: number): string {
  // 有真实结账跳板时用 STRIPE_PAYMENT_LINK / SHOPIFY_STORE，否则返回 demo 占位链接。
  const stripe = process.env.STRIPE_PAYMENT_LINK;
  const shopify = process.env.SHOPIFY_STORE;
  if (stripe) return stripe;
  if (shopify) return `${shopify}/cart?amount_usd=${totalUsd}`;
  return `https://checkout.demo.ahomeeasy.example/cart?total_usd=${totalUsd}&mode=demo`;
}

export interface CheckoutResult {
  quote_id: string;
  user_confirmed: boolean;
  status: "ready" | "not_confirmed" | "invalid_quote";
  total_usd: number | null;
  checkout_url: string | null;
  is_demo: boolean;
  message: string;
}

export function checkoutBundle(quoteId: string, userConfirmed: boolean): CheckoutResult {
  if (!userConfirmed) {
    return {
      quote_id: quoteId,
      user_confirmed: false,
      status: "not_confirmed",
      total_usd: null,
      checkout_url: null,
      is_demo: true,
      message: "User has not confirmed the bundle; checkout not initiated.",
    };
  }

  const payload = decodeQuotePayload(quoteId);
  if (!payload) {
    return {
      quote_id: quoteId,
      user_confirmed: true,
      status: "invalid_quote",
      total_usd: null,
      checkout_url: null,
      is_demo: true,
      message: "quote_id is invalid or its integrity check failed.",
    };
  }

  return {
    quote_id: quoteId,
    user_confirmed: true,
    status: "ready",
    total_usd: payload.total_usd,
    checkout_url: buildCheckoutLink(payload.total_usd),
    is_demo: true,
    message: "Checkout link ready.",
  };
}

// ---------------------------------------------------------------------------
// match_local_installer（demo 占位，不虚构真实安装商）
// ---------------------------------------------------------------------------

export interface InstallerMatchResult {
  location_or_zip: string;
  zip_valid: boolean | null;
  service_scope: ServiceScope;
  match_status: "available" | "pending_verification";
  installer: {
    name: string;
    is_placeholder: boolean;
    service_area_confirmed: boolean;
    eta_days: number | null;
  };
  booking_confirmation_code: string;
  is_demo: boolean;
  note: string;
}

const US_ZIP_RE = /^\d{5}(-\d{4})?$/;

export function matchInstaller(locationOrZip: string, serviceScope: string): InstallerMatchResult {
  const scope = SERVICE_SCOPES.includes(serviceScope as ServiceScope)
    ? (serviceScope as ServiceScope)
    : ("install" as ServiceScope);

  const zipValid = US_ZIP_RE.test(locationOrZip.trim()) ? true : /^[a-zA-Z\s,'.-]+$/.test(locationOrZip) ? false : null;

  // 确定性、可复现的确认码（非安全凭证，仅作演示追踪码）
  const code = `HE-${scope.toUpperCase().slice(0, 4)}-${fnv1a(`${locationOrZip.trim().toLowerCase()}:${scope}`).slice(0, 6).toUpperCase()}`;

  return {
    location_or_zip: locationOrZip,
    zip_valid: zipValid,
    service_scope: scope,
    match_status: "pending_verification",
    installer: {
      name: "HomeEasy Pro Network (placeholder)",
      is_placeholder: true,
      service_area_confirmed: false,
      eta_days: null,
    },
    booking_confirmation_code: code,
    is_demo: true,
    note:
      "Live installer matching requires the real installer directory. This sandbox returns a placeholder and a deterministic confirmation code only — no real installer name, address, rating, or availability is asserted.",
  };
}
