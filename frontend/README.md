# 花屿 Bloom Isle · 花店管理系统前端

基于 React 19、TypeScript、Vite、Tailwind CSS v4 的花店经营前端，直接对接本地 Spring Boot 后端（默认 `http://localhost:8080/api`）。覆盖顾客商城、购物车与模拟支付、履约工作台、库存流水、管理员经营总览以及推荐运营。

## 快速开始

要求 Node.js 20+（建议 20 或 22）与可用的后端服务。

```bash
npm install
copy .env.example .env
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`，Vite 会将 `/api` 代理到 `http://localhost:8080`。

```bash
npm run typecheck   # TypeScript 严格检查
npm run lint        # ESLint
npm run build       # tsc --noEmit + 生产构建
npm run preview     # 预览 dist
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | API 基础地址。保持 `/api` 使用 Vite 代理；直连后端可设为 `http://localhost:8080/api` |
| `VITE_IMAGE_BASE_URL` | 空 | 可选图片静态资源基础地址。后端返回 `/images/...` 相对路径且未提供静态资源；为空时显示渐变占位图，配置后把相对路径拼接到该地址 |

后端没有图片上传接口，管理端只保存 `imageUrl` 字符串地址。

## 路由与权限

| 路径 | 页面 | 权限 |
| --- | --- | --- |
| `/` | 花礼首页 | 公开 |
| `/products`、`/products/:id` | 商品列表 / 详情 | 公开 |
| `/recommendations` | 智能推荐 | 公开 |
| `/login`、`/register` | 登录 / 注册 | 公开 |
| `/favorites`、`/cart`、`/checkout` | 收藏、购物车、结算 | 登录 |
| `/orders`、`/orders/:id` | 我的订单 / 订单详情 | 登录 |
| `/reviews` | 我的评价 | 登录 |
| `/profile`、`/settings` | 个人中心、主题与账户设置 | 登录 |
| `/staff/orders`、`/staff/orders/:id` | 履约工作台 | STAFF / ADMIN |
| `/staff/inventory` | 库存管理 | STAFF / ADMIN |
| `/admin` | 经营总览（含本地布局配置） | ADMIN |
| `/board` | 门店大屏看板（只读，Esc 退出） | ADMIN |
| `/admin/products` | 商品管理 | ADMIN |
| `/admin/users` | 用户管理 | ADMIN |
| `/admin/reviews` | 评价管理 | ADMIN |
| `/admin/recommendations` | 推荐运营 | ADMIN |
| `/admin/logs` | 操作日志 | ADMIN |
| `/forbidden`、`*` | 403 / 404 | 公开 |

未登录访问受保护页面会跳转登录并保留 `redirect`。登录后按角色进入默认落地页：顾客 `/`、店员 `/staff/orders`、管理员 `/admin`。

## 已实现能力

- 认证：JWT 持久化、启动时 `/auth/me` 校验、401 统一清理、过期前自动登出、注册后回到登录页。
- 商城：首页、商品筛选排序、商品详情、公开评价、收藏、推荐结果与推荐理由。
- 交易：购物车勾选与数量修改、结算、订单创建、模拟支付、订单列表与详情、取消、售后、评价。
- 履约：订单检索、接单、备花、配送、签收、取消、售后同意/拒绝、履约轨迹。
- 库存：库存流水筛选（商品、变动类型、订单号、时间），人工入库/扣减，低库存标记。
- 管理：经营总览图表与可拖拽/隐藏/恢复默认的本地布局、只读门店大屏、商品 CRUD 与上下架、用户创建/编辑/重置密码、评价显示隐藏与回复、推荐权重/评估/日志/覆盖率统计、操作日志审计详情。
- 体验：明暗模式与多套配色、强调色、圆角、密度、缩放、背景图、减少动效、高对比度、主题导入导出；命令面板（Ctrl/Cmd+K）、侧栏悬停自动展开/移出收起、钉住侧栏（Ctrl/Cmd+B）、Toast、确认弹窗、加载骨架、空状态与错误重试。

## 项目结构

```text
src/
  app/                 # 路由、Shell、权限守卫、主题与认证副作用
  components/
    domain/            # 商品、订单、评价、状态等业务组件
    ui/                # 无 Radix 的轻量基础组件
  hooks/               # 公共查询与登录跳转
  lib/                 # API Client、服务、查询键、格式化、存储
  pages/
    admin/             # 管理员页面
    staff/             # 店员页面
    auth/              # 登录、注册
  stores/              # Zustand：认证、主题、Toast、UI
  styles/globals.css   # Tailwind v4 主题令牌与全局样式
  types/api.ts         # 后端接口类型
```

## 联调约定

- 成功响应必须同时满足 HTTP 成功与 `code === 200`；分页参数满足 `page >= 1`、`size <= 100`。
- 常见业务错误码：`1001` 用户名已存在、`1005` 原密码错误、`2002` 商品已下架、`2003` 库存不足、`3002` 购物车为空、`4002` 订单状态冲突、`6001` 已评价、`7001` 推荐权重无效。
- 顾客只能取消 `PENDING_PAYMENT` 订单；申请售后只能针对 `COMPLETED` 订单。
- 店员可取消 `PENDING_PAYMENT` 与 `PAID` 订单；售后处理只针对 `AFTER_SALE` 订单。
- 履约节点严格按 `ACCEPTED → PREPARING → DELIVERING → SIGNED` 推进。
- 推荐权重四项各取 0-1，四舍五入到 3 位小数后之和必须严格等于 1。
- 库存调整 `delta` 为非零整数，调整后库存不能小于 0。
