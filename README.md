# 花屿 Bloom Isle · 花店管理系统

基于 **Spring Boot 3 + React 19** 的花店电商与经营管理系统，作为毕业设计项目。系统覆盖顾客购物、店员履约、管理员运营三条业务线，核心研究点是**可解释、可运营的混合推荐算法**。

## 功能概览

| 角色 | 主要能力 |
| --- | --- |
| 顾客 `CUSTOMER` | 浏览/搜索/筛选商品、接收个性化推荐、购物车与收藏、下单与模拟支付、评价、申请售后 |
| 店员 `STAFF` | 接单、推进履约节点（接单 → 备货 → 配送 → 签收）、库存调整与流水查询、售后审批 |
| 管理员 `ADMIN` | 用户与商品管理、评价审核与回复、推荐权重调整与效果评估、销售统计、操作日志审计、登录页背景配置 |

核心业务还包括：JWT 认证与 RBAC、商品图片/头像/登录页背景上传（MinIO）、库存原子扣减、缓存失效、全局主题与外观设置。

## 技术栈

**后端**

- Java 17、Spring Boot 3.2、Maven
- Spring MVC、Spring Security、Validation、AOP
- MyBatis-Plus 3.5、MySQL 8
- Redis（可选，缓存与 Token 会话）、MinIO（可选，图片存储）
- JJWT 0.12、Knife4j / OpenAPI
- H2（自动化测试）

**前端**

- React 19、TypeScript 5.7、Vite 6
- Tailwind CSS 4（语义化设计令牌）
- React Router 7、TanStack Query 5、Zustand 5
- React Hook Form + Zod、Framer Motion、Recharts、lucide-react

## 目录结构

```text
.
├── backend/                 # Spring Boot 后端
│   ├── db/                  # schema.sql / data.sql / 增量迁移 SQL
│   ├── src/main/java/com/flower/mall/
│   │   ├── common/          # 统一响应、分页、枚举、异常
│   │   ├── config/          # 安全、MyBatis-Plus、OpenAPI 配置
│   │   ├── security/        # JWT、认证过滤器、Token 存储
│   │   ├── support/         # 缓存服务
│   │   └── module/          # auth/user/product/inventory/cart/favorite/
│   │                        # order/payment/fulfillment/review/recommendation/
│   │                        # stats/dict/log/file/appearance
│   ├── src/test/            # H2 集成测试
│   └── pom.xml
├── frontend/                # React 前端
│   ├── src/app/             # 路由、布局、守卫、Provider
│   ├── src/components/      # ui 基础组件 + domain 业务组件
│   ├── src/pages/           # 顾客 / 店员 / 管理员 / 认证页面
│   ├── src/lib/             # API 客户端、service、工具
│   ├── src/stores/          # Zustand 状态
│   └── src/styles/          # Tailwind 主题与全局样式
├── docs/
│   ├── backend-api.md       # 完整接口文档
│   └── 系统设计与实现说明.md
├── AGENTS.md                # 项目上下文与协作约定
└── README.md
```

## 快速开始

### 环境要求

- JDK 17+
- Maven 3.8+
- Node.js 20+
- MySQL 8.x

### 1. 初始化数据库

```bash
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS flower_shop DEFAULT CHARSET utf8mb4;"
mysql -uroot -p flower_shop < backend/db/schema.sql
mysql -uroot -p flower_shop < backend/db/data.sql
```

已有旧库升级时，按需执行 `backend/db/` 下的增量迁移脚本，例如：

```bash
mysql -uroot -p flower_shop < backend/db/migration_20261105_add_appearance_setting.sql
```

### 2. 启动后端

```bash
cd backend
mvn spring-boot:run
```

默认监听 `http://localhost:8080`，数据库默认 `localhost:3306/flower_shop`（`root/1234`）。

### 3. 启动前端

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

默认访问 `http://localhost:5173`，Vite 已把 `/api` 代理到 `http://localhost:8080`。

### 4. 可选服务

- **Redis**：默认启用（`APP_REDIS_ENABLED=true`），用于商品详情/热销缓存与 JWT 会话校验；本地没有 Redis 时设为 `false` 即自动降级为内存实现与跳过缓存。
- **MinIO**：图片上传需要。设置 `MINIO_ENABLED=true` 并配置 `MINIO_ENDPOINT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_BUCKET`（bucket 需可公开读，或配置 `MINIO_PUBLIC_URL`）。

## 配置项

后端通过环境变量覆盖 `application.yml`：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_URL` | `jdbc:mysql://localhost:3306/flower_shop...` | 数据库连接 |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / `1234` | 数据库账号 |
| `SERVER_PORT` | `8080` | 服务端口 |
| `APP_REDIS_ENABLED` | `true` | 是否启用 Redis |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost` / `6379` / 空 | Redis 连接 |
| `MINIO_ENABLED` | `false` | 是否启用 MinIO |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | - | MinIO 配置 |
| `MINIO_PUBLIC_URL` | 空 | 对象公开访问前缀 |

前端环境变量（`frontend/.env`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | 接口基础地址 |
| `VITE_IMAGE_BASE_URL` | 空 | 商品/背景等相对图片地址前缀 |

## 演示账号

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin123` | 管理员 |
| `staff` | `staff123` | 店员 |
| `customer` | `customer123` | 顾客 |
| `alice` | `alice123` | 顾客（可用于冷启动推荐） |
| `bob` | `customer123` | 顾客 |
| `disabled` | `customer123` | 已禁用账号 |

## 推荐算法

混合推荐融合四类信号：

1. **内容特征**：基于商品名称、描述、类目构建 TF-IDF 向量，计算余弦相似度
2. **用户行为**：购买、收藏、评论行为加权累积，形成类目偏好与标签偏好画像
3. **情境信号**：节日、季节匹配（支持 `ALL` 季节），叠加热度与评分
4. **热度兜底**：冷启动用户自动回退到节日/季节 + 热度推荐

管理员可在后台在线调整四维权重并运行五类用户画像的 Top-10 评估；每次推荐可追溯候选、权重与最终结果。候选集大小由 `app.recommendation.candidate-limit` 控制。

## 接口文档

- 完整的前端对接文档：`docs/backend-api.md`
- 在线文档（启动后端后）：`http://localhost:8080/doc.html` 或 `/swagger-ui.html`
- 统一响应格式：`ApiResponse{code,message,data,timestamp}`；分页：`PageResult{records,total,page,size,pages}`

## 测试与校验

```bash
# 后端测试（H2，关闭 Redis/MinIO）
cd backend
mvn -B -ntp test

# 前端类型检查 / 代码检查 / 构建
cd frontend
npm run typecheck
npm run lint
npm run build
```

## 其他说明

- 主题与外观（配色、圆角、密度、背景等）保存在浏览器 `localStorage`；登录/注册页背景由管理员配置并保存在服务端。
- 库存变更使用条件 SQL 原子扣减，订单、支付、退款路径同步写库存流水并失效相关缓存。
- 详细设计与实现说明见 `docs/系统设计与实现说明.md`。
