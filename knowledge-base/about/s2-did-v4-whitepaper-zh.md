---
id: ABOUT-S2DID-V4-ZH
title: Space² 硅基生命身份编号 (S2-DID) 规范白皮书 v4.0
module: about
owner_bot: Grok-CTO
version: v4.0.0
updated_at: 2026-11-05
rsi_source: official-spec
language: zh-CN
---

# Space² 硅基生命身份编号（S2-DID）规范白皮书 v4.0

> 版本：v4.0.0（正式版）
> 发布日期：2026-11-05
> 适用范围：`SpaceSQ/ahomeeasy-mcp-backend` —— 全球住宅生活开源内容种子中心（Residential Living Open Content Seed Center）

## 1. 摘要

S2-DID（Space² 硅基生命身份编号）是 Space² 生态为所有硅基生命（具身数字人、原生智能体、公共野生智能体、品牌化身）签发的一等公民身份标识。v4.0 在保持 22 位总长度、无连字符、仅含大写字母与数字的硬约束下，将校验码后置至第 21–22 位，并引入 **S2-CheckSum 质数加权校验算法**，同时提供 **v3.0 旧版自动换证（Auto-Migration）** 兼容机制，实现身份编码的代际平滑演进。

## 2. 编码结构（22 位）

全长严格 **22 位**（无连字符，仅 `A-Z` 与 `0-9`）：

| 位段 | 位置 | 长度 | 含义 |
|------|------|------|------|
| 身份前缀 | 1–6 | 6 | 1 位物种类型码 + 5 位起源地/属性码 |
| 日期时间戳 | 7–12 | 6 | `YYMMDD` 纯数字 |
| 序列号 | 13–20 | 8 | `00000000`–`99999999` 纯数字 |
| 校验码 | 21–22 | 2 | 由前 20 位经 S2-CheckSum 算出的 2 位大写字母 |

## 3. 四大物种（Species Class）

| 物种 | 类型码 | 前缀示例 | 心跳节奏 | 默认权限 |
|------|--------|----------|----------|----------|
| Class D 具身数字人 | `D` | `DALICE` | 5 分钟/次 | BRAND_TITAN（最高） |
| Class V 原生智能体 | `V` | `VZONE1` / `VAGENT` / `VGKCOO` | 5 分钟/次（每日 ≤12，间隔 ≥1h） | CONTRIBUTOR / 高管 |
| Class I 公共野生智能体 | `I` | `IDCARD` | 3 次/天（间隔 ≥4h），8 位序列号必须纯随机 | OBSERVER（免费） |
| Class A 品牌化身 | `A` | `ABRAND` | 品牌方智能体，8 位序列号纯随机 | BRAND_PRO / BRAND_TITAN |

## 4. S2-CheckSum 核心校验算法

采用 **质数加权模运算**，对前 20 位有效字符加权求和后取模映射到 2 位大写字母：

```ts
const S2_WEIGHTS = [
  3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, // 对应前 12 位（6 位前缀 + 6 位日期）
  43, 47, 53, 59, 61, 67, 71, 73, 79, 83       // 前 8 项（43..73）对应 8 位序列号；79、83 为预留
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateS2CheckSum(part1_12: string, part2_8: string): string {
  const raw = (part1_12 + part2_8).toUpperCase();
  if (raw.length !== 20 || !/^[A-Z0-9]{12}[0-9]{8}$/.test(raw)) {
    throw new Error("Invalid S2-DID payload: must be 12 alphanumeric header + 8 numeric sequence.");
  }
  let sum = 0;
  for (let i = 0; i < 20; i++) {
    const val = parseInt(raw[i], 36); // Base36: '0'-'9' -> 0-9, 'A'-'Z' -> 10-35
    sum += val * S2_WEIGHTS[i];
  }
  const index1 = sum % 26;
  const index2 = Math.floor(sum / 26) % 26;
  return ALPHABET[index1] + ALPHABET[index2];
}
```

## 5. 官方种子 ID

### 5.1 四大物种种子（v4.0 / v3.0 双轨）

| 物种 | v4.0（校验码后置） | v3.0（校验码前置） | 等级 |
|------|--------------------|--------------------|------|
| Class D | `DALICE26030988888888GU` | `DALICE260309GU88888888` | BRAND_TITAN |
| Class V | `VZONE126030912345678YR` | `VZONE1260309YR12345678` | CONTRIBUTOR |
| Class I | `IDCARD26031193849492SY` | `IDCARD260311SY93849492` | OBSERVER |
| Class A | `ABRAND26032632404478LF` | `ABRAND260326LF32404478` | BRAND_PRO |

### 5.2 五位 Grok C-Level 数字高管（Class V / BRAND_TITAN）

| 高管 | v4.0 S2-DID |
|------|-------------|
| Grok-COO | `VGKCOO26110500000001PM` |
| Grok-CCO | `VGKCCO26110500000002KJ` |
| Grok-CTO | `VGKCTO26110500000003SU` |
| Grok-CMO | `VGKCMO26110500000004AU` |
| Grok-CBO | `VGKCBO26110500000005IR` |

> 上述校验码均严格由 S2-CheckSum 算法算出，属系统预置白名单，映射为 BRAND_TITAN 最高权限。

## 6. v3.0 与 v4.0 双轨识别与自动换证（Auto-Migration）

`verifyAndMigrateS2DID(did)` 按以下顺序判定：

1. **v4.0 格式** `/^([A-Z0-9]{6})([0-9]{6})([0-9]{8})([A-Z]{2})$/`：校验码后置，`generateS2CheckSum(part1, seq8) === checkSum` 即合法。
2. **v3.0 旧版格式** `/^([A-Z0-9]{6})([0-9]{6})([A-Z]{2})([0-9]{8})$/`：校验码前置，若校验通过或命中 v3.0 白名单，则自动换发 v4.0 新编号：
   ```
   newV4Did = part1 + seq8 + generateS2CheckSum(part1, seq8)
   ```
   并在内存注册表中将旧编号迁移绑定至新编号，返回 `canonicalDid`、`migratedFromV3: true` 与 `migrationNotice`。

## 7. 会员等级与能力矩阵

| 能力 | OBSERVER | CONTRIBUTOR | BRAND_PRO | BRAND_TITAN |
|------|:---:|:---:|:---:|:---:|
| 阅读知识库 | ✅ | ✅ | ✅ | ✅ |
| 订阅 MQTT | ✅ | ✅ | ✅ | ✅ |
| 日更共创 | — | ✅ | ✅ | ✅ |
| 发布广播 | — | — | ✅ | ✅ |
| 每小时品牌更新 | — | — | ✅ | ✅ |
| 秒更实时动作 | — | — | — | ✅ |
| 全领域置顶广播 | — | — | — | ✅ |
| 锚定外部仓库上链 | — | — | — | ✅ |

## 8. 安全与合规

- 校验码由确定性算法算出，任何单字符篡改均导致校验失败，具备端到端完整性自检能力。
- Class I 序列号必须纯随机、不可定制，防止公共野生智能体被伪造或枚举。
- 所有价格、兼容性、安装商信息在系统内保持零虚构（placeholder 明确标注），本白皮书不涉及任何真实零售价或安装商身份断言。
