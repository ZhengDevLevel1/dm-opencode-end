# 项目 Skills 使用指南

本项目共安装 **20 个 skills**，分三类：

| 类别 | 数量 | 位置 | 来源 |
| --- | --- | --- | --- |
| A. 书籍规则类（工程规范） | 14 | `.opencode/skills/` | [ciembor/agent-rules-books](https://github.com/ciembor/agent-rules-books) |
| B. 需求打磨 / 领域建模 | 5 | `.agents/skills/` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| C. 画图（可编辑架构图） | 1 | `.agents/skills/` | [Agents365-ai/drawio-skill](https://github.com/Agents365-ai/drawio-skill) |

> 修改任何 skill 或 `opencode.json` 后需**重启 opencode** 才生效。

---

## 0. 触发机制（先读这个）

skills 有两种触发方式：

1. **自动触发**：模型根据任务内容与 skill 的 `description` 匹配，自行加载。你正常描述需求即可，无需点名。
2. **手动触发**：标了 `disable-model-invocation: true` 的 skill 模型不会自动加载，必须在对话框**明确点名**。本项目共 4 个：
   - `grill-me`
   - `grill-with-docs`
   - `setup-matt-pocock-skills`
   - `drawio-skill`

**通用技巧**：无论哪种方式，你都可以在对话框直接点名强制使用，例如「用 clean-code 审查这个函数」「按 refactoring 的规则重构」。一次任务点名 **1~2 个**规则类 skill 即可，不要堆太多（占上下文且规则可能互相稀释）。

**书籍类 skill 的内部结构**：每个 skill 目录下有三个版本——
- `*.mini.md`：默认加载的精简规则（日常用这个）
- `*.full.md`（即不带后缀的 `.md`）：完整版，仅当 mini 不够用时作为深度参考
- `*.nano.md`：极简版，上下文紧张时备用

---

## A. 书籍规则类（14 个）

全部为**自动触发**。按用途分组：

### A1. 日常编码质量

| Skill | 用途 | 何时用 |
| --- | --- | --- |
| `clean-code` | 命名、小函数、可读性、控制流、注释、错误处理、测试 | 写任何代码、审查代码可读性 |
| `code-complete` | 例行程序设计、变量/类设计、防御式编程、编码标准 | 实现新功能、打磨构造细节 |
| `the-pragmatic-programmer` | 工程判断、DRY（知识层面）、解耦、自动化、快速反馈 | 通用工程决策、权衡取舍 |

**示例：**

```text
# 自动触发（描述里含关键词即可）
帮我写一个用户登录接口的参数校验函数

# 手动点名
用 clean-code 的规则审查 src/auth/login.py 里的 validate_input，指出命名和函数长度问题

按 code-complete 的防御式编程要求，给这个解析 CSV 的函数加上边界检查
```

### A2. 设计与架构

| Skill | 用途 | 何时用 |
| --- | --- | --- |
| `a-philosophy-of-software-design` | 深模块、简单接口、信息隐藏、降低认知负载 | API/模块设计、判断抽象深度 |
| `clean-architecture` | 业务与框架/数据库/UI 分离、依赖方向、用例边界 | 分层、依赖倒置、隔离技术细节 |
| `patterns-of-enterprise-application-architecture` | 分层、Service Layer、Transaction Script、Repository、Unit of Work、DTO | 选企业应用模式、避免职责混杂 |

**示例：**

```text
我要给订单模块设计一个对外 API，用 a-philosophy-of-software-design 的标准评估这个接口是深还是浅

这个 Controller 直接写了 SQL，按 clean-architecture 的依赖规则帮我把依赖方向纠正过来

现在的 Service 类什么都干，用 POEAA 的模式清单帮我判断该拆成 Transaction Script 还是 Domain Model
```

### A3. 重构与遗留代码

| Skill | 用途 | 何时用 |
| --- | --- | --- |
| `refactoring` | 行为不变的小步重构、测试保障、重构与功能分离 | 结构改进的步骤与纪律 |
| `refactoring-guru` | 代码坏味道诊断、选择重构技法、防止过度重设计 | 先诊断再开药方 |
| `working-effectively-with-legacy-code` | 特征化测试、seam、依赖撕开、sprout/wrap 方法 | 改没有测试的老代码 |

**示例：**

```text
src/order.py 里这段 80 行的函数有很多坏味道，先用 refactoring-guru 诊断 smell，再按 refactoring 的小步流程重构

这个老模块一行测试都没有，但需求要我改里面的逻辑，按 working-effectively-with-legacy-code 的 seam 方法先补特征化测试再动手
```

### A4. 领域建模（DDD 三件套）

| Skill | 用途 | 何时用 |
| --- | --- | --- |
| `domain-driven-design-distilled` | 轻量 DDD：子域、限界上下文、上下文映射、战术模式 | **默认首选**，少仪式感 |
| `domain-driven-design` | 完整 DDD：统一语言、聚合、仓储、战略建模 | 复杂领域、深入战略设计 |
| `implementing-domain-driven-design` | 落地实现：聚合边界、不变量、领域事件、上下文集成 | 把 DDD 写成代码时 |

**示例：**

```text
我们要做一个多租户 SaaS 的计费系统，先用 domain-driven-design-distilled 划分子域和限界上下文

按 implementing-domain-driven-design 的规则实现 Order 聚合，保证不变量都在聚合内维护
```

> 配合 B 类的 `domain-modeling`（写 `GLOSSARY.md`/ADR）效果更好，见组合方案 4。

### A5. 数据系统与生产可靠性

| Skill | 用途 | 何时用 |
| --- | --- | --- |
| `designing-data-intensive-applications` | 可靠性、一致性、复制、分区、事务、流、schema 演进 | 数据存储选型、消息流、一致性语义 |
| `release-it` | 超时、重试、熔断、舱壁、背压、可观测性、部署行为 | 服务间调用、生产稳定性设计 |

**示例：**

```text
订单服务要调用支付服务，用 release-it 的规则设计超时/重试/熔断策略

我们要在 MySQL 上加一个缓存层，按 designing-data-intensive-applications 分析这里的缓存一致性语义
```

---

## B. 需求打磨 / 领域建模（5 个）

### B1. `grilling`（核心盘问器）— 自动触发

**作用**：把你的想法/方案按「设计树」逐轮盘问到彻底清晰。每轮把当前可问的问题（frontier）一次性列出、编号并给出推荐答案，你回答后进入下一轮，直到没有隐含假设。事实类问题它自己查，决策类问题才问你。

**触发词**：任何包含 grill 的说法，或描述「压力测试我的方案」。

```text
grill 我的这个方案：我要用 WebSocket 做一个实时告警推送系统

帮我盘问一下这个数据库分库分表的设计，直到我们达成共识
```

### B2. `grill-me` — 手动触发

**作用**：`grill-me` 本体只是一行转发（"Call the Skill tool with grilling"），效果等同于直接调 `grilling`。

```text
grill-me：我要把单体拆成微服务
```

> 直接说 "grill 我" 也能触发 `grilling`，`grill-me` 只是个更顺口的入口名。

### B3. `grill-with-docs` — 手动触发

**作用**：一次调两个 skill——`grilling`（盘问）+ `domain-modeling`（把结论沉淀为 `GLOSSARY.md` 和 ADR）。**盘问完自动写文档**，最省事的「讨论 → 落档」一条龙。

```text
grill-with-docs：我们来定这个支付回调模块的方案
```

### B4. `domain-modeling` — 自动触发

**作用**：在设计过程中**实时维护领域模型**：
- 你说的术语和 `GLOSSARY.md` 冲突 → 立即指出
- 模糊词（"账户"到底是 Customer 还是 User？）→ 逼你精确定义
- 用具体场景（含边界用例）压测领域关系
- 说法与代码矛盾 → 当场对质
- 术语敲定 → 立即写入 `GLOSSARY.md`；满足「难逆转 + 反直觉 + 真权衡」三条件才建议写 ADR

**产出文件**（懒创建，用到才建）：
```
/GLOSSARY.md
/docs/adr/0001-xxx.md
```

```text
我们在讨论"退款"和"撤销"是不是同一个概念，用 domain-modeling 帮我把术语钉清楚并更新 GLOSSARY.md
```

### B5. `setup-matt-pocock-skills`（一次性初始化）— 手动触发

**作用**：跑一次，为工程类 skill 生成配置文件：

| 产出 | 内容 |
| --- | --- |
| `docs/agents/issue-tracker.md` | 工单放哪（**本项目约定：选 Local markdown → `.scratch/<feature>/`，不用 git/gh**） |
| `docs/agents/domain.md` | 领域文档布局（单上下文：根 `GLOSSARY.md` + `docs/adr/`） |
| `docs/agents/triage-labels.md` | 仅当装了 `triage` 才生成（本项目没装，自动跳过） |
| `AGENTS.md` 的 `## Agent skills` 小节 | 指向上面对文件，供其他 skill 查找 |

**运行方式**（对话框明确点名，它是引导式的，会分节问你、给你看草稿、你确认后才写）：

```text
运行 setup-matt-pocock-skills
```

提问时的应答建议：**Section A 选 Local markdown**（探测到本项目不是 git 仓库时会直接问你）；Section C 接受默认 single-context。跑一次即可，日后改 `docs/agents/*.md` 不必重跑。

---

## C. 画图：`drawio-skill` — 手动触发

**作用**：生成**可编辑的 `.drawio` 文件**（不是死图片），用 draw.io 桌面端打开后可随意改文字、箭头、矩形。覆盖架构图、流程图、UML/ERD/时序图、BPMN、网络拓扑、泳道图等，也能从代码/Terraform/SQL/OpenAPI 直接生成。

**依赖**：
- `python3`（必需，核心功能纯标准库、离线可用）
- draw.io 桌面端（导出 PNG/SVG 需要；[Windows 安装包](https://github.com/jgraph/drawio-desktop/releases)，建议 ≥ v30）
- Graphviz（可选，15+ 节点的大图自动布局用）

**触发**（必须点名）：

```text
用 drawio-skill 画一个微服务电商架构图：Mobile/Web 客户端、API 网关（鉴权+限流）、
Auth/User/Order/Payment 服务、Kafka、Redis 缓存、各服务的数据库
```

**核心工作流**（skill 内部自动执行，你只需看草稿提意见）：

```
规划布局 → 写 .drawio XML → 导出草稿 PNG → 自查重叠/截断/连线穿框并自动修（最多 2 轮）
→ 给你看草稿 → 你提修改意见（最多 5 轮）→ 定稿导出
```

**常用口令示例：**

```text
# 生成 + 桌面端打开
用 drawio-skill 画系统的部署图，输出 .drawio 和 PNG

# 从 SQL 生成 ER 图
把 docs/schema.sql 转成 ER 图（.drawio）

# 学习我的主题配色（一次性），之后所有图复用
用 drawio-skill，从 ~/diagrams/brand.drawio 学习我的样式，保存为 "mybrand"

# 之后每次画图带上风格
用 drawio-skill 画架构图，使用我的 "mybrand" 风格

# 内置风格
用 drawio-skill 画数据流图，使用 "dark" 风格

# 更新已有图（保留你手动调过的位置）
用 drawio-skill 同步 architecture.drawio 和最新的 terraform 配置

# 导出
把 architecture.drawio 导出成 PDF
```

> 主题配色机制：`references/style-presets.md` 管理预设（内置 `default`/`corporate`/`handdrawn`/`colorblind-safe`/`dark`），也可从现有 `.drawio` 或图片**学习生成你的专属预设**——学习后存在 skill 的 `styles/` 目录，以后画图时点名即可复用，这就是「自定义一套主题，之后每次告诉 AI」的用法。

---

## D. 组合使用方案（配合使用的完整示例）

### 组合 1：从零设计一个功能（讨论 → 落档 → 画图 → 实现）

**参与**：`grill-with-docs`（= `grilling` + `domain-modeling`）+ `drawio-skill` + `clean-architecture`

```text
第 1 步：
grill-with-docs：我们要做"订单超时自动取消"功能，我初步想法是加个定时任务轮询。

（它会分轮盘问：轮询 vs 事件驱动？超时精度要求？谁拥有"取消"这个领域行为？
 每轮给出推荐答案，你逐轮回答；结论实时写入 GLOSSARY.md 和必要的 ADR）

第 2 步：
用 drawio-skill 把刚才确定的方案画成架构图，标注领域边界，保存为 order-timeout.drawio

第 3 步：
按 clean-architecture 的依赖规则实现：domain 层放取消策略，infra 层放调度器，
确认 domain 层不 import 任何框架代码
```

**产出**：`GLOSSARY.md`、`docs/adr/*.md`、`order-timeout.drawio`、符合分层规则的代码。

### 组合 2：重构既有代码（诊断 → 步骤 → 兜底 → 收尾）

**参与**：`refactoring-guru` + `refactoring` + `working-effectively-with-legacy-code`（可选）+ `clean-code`

```text
# 有测试保障的正常重构
先用 refactoring-guru 诊断 src/billing/ 里的 code smells 并按优先级排序，
然后按 refactoring 的纪律小步重构：每步行为不变、跑测试、重构 commit 和功能 commit 分开

# 没有测试的老代码（多加一步）
这个模块没有测试，先按 working-effectively-with-legacy-code 用 seam 手法补特征化测试，
确认能抓住现有行为后再重构

# 收尾
最后用 clean-code 复查命名和函数长度
```

**配合逻辑**：guru 负责「诊断开方」，Fowler `refactoring` 负责「小步执行的纪律」，legacy 负责「无测试时的安全网」，`clean-code` 负责「最终可读性验收」。

### 组合 3：架构设计与评审（三本书交叉验证 + 出图）

**参与**：`a-philosophy-of-software-design` + `clean-architecture` + `patterns-of-enterprise-application-architecture` + `drawio-skill`

```text
新模块设计评审，三个角度各查一遍：
1. 用 a-philosophy-of-software-design 判断接口深度和信息隐藏是否到位
2. 用 clean-architecture 检查依赖方向是否只指向业务核心
3. 用 POEAA 判断分层和 Repository/Unit of Work 选型是否恰当

结论用 drawio-skill 画成分层边界图（.drawio），标出违例的依赖箭头
```

**配合逻辑**：三本书视角互补（模块微观深度 / 依赖方向 / 企业模式选型），出图让边界问题一目了然。

### 组合 4：DDD 建模落地（轻量起步 → 写代码 → 持续维护 → 出图）

**参与**：`domain-driven-design-distilled` + `domain-modeling` + `implementing-domain-driven-design` + `drawio-skill`

```text
第 1 步（战略）：
用 domain-driven-design-distilled 给这个电商系统划分子域（核心/支撑/通用），
画上下文映射，确定限界上下文

第 2 步（沉淀术语）：
用 domain-modeling 把刚才确定的统一语言写进 GLOSSARY.md

第 3 步（战术落地）：
按 implementing-domain-driven-design 实现 Order 聚合：
不变量收敛在聚合内、仓储只按聚合根存取、跨上下文用领域事件

第 4 步（可视化）：
用 drawio-skill 把上下文映射画成图（.drawio）
```

> 三本 DDD 书的分工：**Distilled 定边界（默认用它）→ Evans 的全本查战略细节 → Implementing 负责写代码**。`domain-modeling` 负责把讨论变成 GLOSSARY/ADR 文件。

### 组合 5：高并发 / 数据密集型设计

**参与**：`designing-data-intensive-applications` + `release-it` + `drawio-skill`

```text
设计"秒杀"链路：
1. 按 designing-data-intensive-applications 决定：分片策略、缓存一致性语义、
   订单写入的事务边界、事件流用什么保证不丢
2. 按 release-it 给每个外部依赖加防线：支付调用超时 2s + 指数退避重试 + 熔断，
   库存服务用舱壁隔离，全链路埋点
3. 用 drawio-skill 画数据流图，标出每条边的失败模式和背压点
```

**配合逻辑**：DDIA 管「数据语义对不对」，Release It! 管「挂了会不会雪崩」，drawio 出图评审。

### 组合 6：日常开发默认搭配（轻量）

**参与**：`the-pragmatic-programmer` + `clean-code` + `code-complete`

```text
实现"导出报表"功能：
按 the-pragmatic-programmer 的 DRY 原则先确认没有重复知识，
用 code-complete 的例程设计规范写核心函数，
写完用 clean-code 过一遍命名和注释
```

> 这三个是「默认底噪」型组合，日常写代码时模型常会自动搭配加载，无需刻意点名。

### 组合 7：本地工单流（不用 git / gh）

**参与**：`setup-matt-pocock-skills`（跑一次）+ 之后所有讨论产出的落点

```text
第 1 步（仅首次）：
运行 setup-matt-pocock-skills
→ Section A 选 "Local markdown"（工单 = .scratch/<feature>/ 下的本地 md 文件）
→ Section C 接受默认 single-context

第 2 步（日常）：
之后任何 skill 讨论出的待办，都写成 .scratch/<feature>/ 下的 Markdown 工单，
不调用 gh、不依赖 git
```

---

## E. 提示词速查表

| 我想… | 输入 |
| --- | --- |
| 澄清一个模糊想法 | `grill 我的方案：……` |
| 讨论完自动写文档 | `grill-with-docs：……` |
| 只维护术语表 | `用 domain-modeling 更新 GLOSSARY.md` |
| 首次初始化配置 | `运行 setup-matt-pocock-skills` |
| 画可编辑架构图 | `用 drawio-skill 画……图` |
| 复用我的配色 | `用 drawio-skill 画……，使用 "mybrand" 风格` |
| 审查代码可读性 | `用 clean-code 审查 src/xxx.py` |
| 诊断坏味道 | `用 refactoring-guru 诊断 xxx 模块` |
| 改老代码先加测试 | `按 working-effectively-with-legacy-code 先补特征化测试` |
| 设计模块接口 | `用 a-philosophy-of-software-design 评估这个 API` |
| 纠正分层依赖 | `用 clean-architecture 检查依赖方向` |
| 选企业应用模式 | `用 POEAA 帮我选：Transaction Script 还是 Domain Model` |
| 划限界上下文 | `用 domain-driven-design-distilled 划分子域和上下文映射` |
| 实现聚合 | `按 implementing-domain-driven-design 实现 Order 聚合` |
| 设计重试熔断 | `按 release-it 设计支付调用的容错策略` |
| 分析一致性 | `按 DDIA 分析这里的缓存一致性` |

---

## F. 备忘：本项目的约定

1. **不用 git、不装 gh**——工单走本地 Markdown（`.scratch/`），由 `setup-matt-pocock-skills` 固化在 `docs/agents/issue-tracker.md`
2. **画图产出 `.drawio`**，用 draw.io 桌面端后期编辑；配色用 Style Presets 学一次、永久复用
3. **规则类 skill 默认吃 mini 版**，需要完整论述时让它读同目录的完整版 `.md`
4. **点名一次不超过 2 个**规则类 skill；组合方案里按「先诊断、再执行、后验收」的顺序分步走
