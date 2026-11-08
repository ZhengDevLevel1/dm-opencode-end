# 花店管理系统后端 API 文档

> 面向前端开发、接口联调和 AI 生成前端代码使用。  
> 文档依据当前后端代码整理，接口版本 `1.0.0`。  
> 本地默认地址：`http://localhost:8080`，所有业务接口统一以 `/api` 开头。

## 1. 快速约定

### 1.1 认证方式

除公开接口外，请求必须携带登录后返回的 JWT：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json
```

- 登录成功后从 `data.token` 获取令牌，`data.tokenType` 为 `Bearer`。
- 默认有效期 `86400` 秒（24 小时），可通过 `JWT_EXPIRATION` 配置。
- 注册成功不会自动登录，需要再调用登录接口。
- 退出登录会尝试吊销服务端会话；前端无论如何都应清理本地令牌。
- 令牌失效、未携带或格式错误时返回 HTTP `401`，业务码 `401`。

### 1.2 统一响应

成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1760000000000
}
```

无数据响应（`ApiResponse.ok()`）由于全局 `non_null` 序列化配置，`data` 字段会被省略：

```json
{
  "code": 200,
  "message": "success",
  "timestamp": 1760000000000
}
```

失败响应：

```json
{
  "code": 2003,
  "message": "商品「红玫瑰」库存不足，当前库存 6",
  "timestamp": 1760000000000
}
```

约定：

- `code` 是业务码，不一定等于 HTTP 状态码；前端拦截器应同时判断 HTTP 状态和 `code`。
- `timestamp` 为毫秒时间戳。
- 后端开启了 `spring.jackson.default-property-inclusion: non_null`，值为 `null` 的字段通常不会出现在 JSON 中；前端应将缺失字段视为可选或空。
- 分页对象中的 `records` 始终是数组，空结果为 `[]`。

### 1.3 分页

分页接口统一使用请求参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `page` | long | `1` | 页码，从 1 开始；前端应始终传 `>=1` |
| `size` | long | `10` | 每页数量 |

分页响应：

```json
{
  "records": [],
  "total": 0,
  "page": 1,
  "size": 10,
  "pages": 0
}
```

- 商品、订单、评价、推荐日志的 `page/size` 会在服务层归一到 `>=1`，且 `size` 最大 `100`。
- 用户、库存记录、操作日志等分页接口按传入的 `page/size` 透传，前端应统一保证 `page >= 1` 且 `size <= 100`。
- 排序由各接口固定：商品默认销量降序；订单、评价、日志、库存记录、用户默认按 ID 降序。

### 1.4 数据格式

| 类型 | JSON 形式 | 说明 |
| --- | --- | --- |
| `Long` | number | 主键、用户 ID、订单 ID 等 |
| `BigDecimal` | number | 金额、评分、权重；展示时建议保留两位小数 |
| `LocalDateTime` | string | `yyyy-MM-ddTHH:mm:ss`，无时区后缀，服务端时区为 `Asia/Shanghai` |
| `LocalDate` | string | `yyyy-MM-dd` |
| boolean | boolean | 如 `coldStart`、`available`、`reviewed` |
| 枚举 | string | 使用大写下划线值，如 `PENDING_PAYMENT` |
| 商品标签 | string | `occasionTags`、`festivalTags` 是逗号分隔字符串，不是数组 |
| 推荐标签 | string[] | 推荐结果中的 `occasionTags`、`festivalTags` 已转换为数组 |
| 图片地址 | string | 商品图片 `imageUrl` 兼容 `/images/products/xxx.svg` 相对路径；上传接口返回 MinIO 绝对 URL。地址不可用时前端应显示占位图 |

日期时间请求参数使用 `@DateTimeFormat(iso = DATE_TIME)`，格式为 `yyyy-MM-ddTHH:mm:ss`，例如：

```text
start=2026-10-01T00:00:00&end=2026-10-31T23:59:59
```

### 1.5 CORS

默认允许：

- `http://localhost:5173`
- `http://localhost:3000`

可通过环境变量 `CORS_ALLOWED_ORIGINS` 覆盖，多个地址用逗号分隔。允许携带凭证，但当前认证使用 Bearer Token，不依赖 Cookie。

### 1.6 角色与权限

| 标记 | 含义 |
| --- | --- |
| 公开 | 不需要令牌 |
|      |            |
|      |            |
|      |            |
|      |            |

说明：

- `ADMIN` 可以访问所有 `/api/staff/**` 接口。
- `/api/orders/**`、`/api/cart/**`、`/api/favorites/**`、`/api/payments/**`、`/api/reviews/my`、`POST /api/reviews` 只要求登录，业务上主要供消费者使用；数据按当前登录用户隔离。
- 商品浏览、商品评价列表、推荐、字典、登录、注册是公开接口。

### 1.7 错误码

| 业务码 | HTTP | 默认消息 | 说明 |
| --- | --- | --- | --- |
| `400` | `400` | 请求参数错误 | 参数校验失败、请求体格式错误、非法枚举等 |
| `401` | `401` | 未登录或登录已过期 | 缺少或无效 JWT |
| `403` | `403` | 没有访问权限 | 角色不匹配或访问他人资源 |
| `404` | `404` | 资源不存在 | 接口或资源不存在 |
| `405` | `405` | 请求方法不支持 | HTTP 方法错误 |
| `409` | `409` | 请求与当前资源状态冲突 | 通用冲突、唯一约束冲突 |
| `500` | `500` | 服务器内部错误 | 未预期异常 |
| `1001` | `409` | 用户名已存在 | 注册或创建用户时重复 |
| `1002` | `404` | 用户不存在 | 管理端查询/更新用户 |
| `1003` | `401` | 用户名或密码错误 | 登录失败 |
| `1004` | `403` | 账号已被禁用 | 禁用账号登录 |
| `1005` | `400` | 原密码不正确 | 修改密码 |
| `2001` | `404` | 商品不存在 | 商品 ID 不存在或已删除 |
| `2002` | `409` | 商品已下架 | 公开详情、收藏、购物车、下单 |
| `2003` | `409` | 商品库存不足 | 加购、下单、库存调整 |
| `2004` | `400` | 商品状态不合法 | 管理端上下架参数错误 |
| `3001` | `404` | 购物车商品不存在 | 购物车记录不存在或不属于当前用户 |
| `3002` | `400` | 购物车为空，无法创建订单 | 未选择任何购物车商品 |
| `3003` | `400` | 商品数量必须大于0 | 数量不在 1-99 范围，或合并后超限 |
| `4001` | `404` | 订单不存在 | 订单 ID 不存在或不属于当前用户 |
| `4002` | `409` | 订单状态不允许该操作 | 取消、支付、售后等状态不匹配 |
| `4003` | `403` | 无权操作该订单 | 评价时订单明细不属于当前用户 |
| `4004` | `404` | 订单明细不存在 | 评价时订单明细 ID 不存在 |
| `5001` | `404` | 支付记录不存在 | 支付单号不存在或不属于当前用户 |
| `5002` | `409` | 支付状态不允许该操作 | 支付回调状态异常 |
| `5003` | `409` | 订单已支付，请勿重复支付 | 已支付订单再次发起支付 |
| `5501` | `409` | 履约状态不允许该操作 | 接单、推进节点状态不匹配 |
| `5502` | `409` | 履约节点顺序不正确 | 节点跳跃或未先接单 |
| `6001` | `409` | 该订单商品已评价 | 同一订单明细重复评价 |
| `6002` | `403` | 当前订单状态不允许评价 | 仅已完成订单可评价 |
| `6003` | `404` | 评价不存在 | 管理端操作不存在的评价 |
| `7001` | `400` | 推荐权重不合法，四项权重之和必须为1 | 权重校验失败 |
| `7002` | `200` | 暂无可推荐商品 | 已定义，当前推荐接口不主动抛出，空结果仍返回 200 |
| `8001` | `503` | 图片上传服务未启用 | MinIO 未配置或 `app.minio.enabled=false` |
| `8002` | `400` | 仅支持 JPG、PNG、WEBP、GIF 格式的图片 | 文件为空或类型不支持 |
| `8003` | `400` | 图片大小不能超过5MB | 文件超过单图限制 |
| `8004` | `500` | 图片上传失败，请检查 MinIO 配置 | MinIO 连接、存储桶或写入失败 |
| `8005` | `400` | 图片分类不合法 | `category` 不是 `avatar/product/background` |

参数校验失败时，`message` 可能是多个字段错误用 `; ` 拼接的文本，例如：

```json
{
  "code": 400,
  "message": "用户名不能为空; 密码长度需在6-32个字符之间",
  "timestamp": 1760000000000
}
```

## 2. 枚举与字典

### 2.1 枚举值

| 枚举 | 值 | 标签 |
| --- | --- | --- |
| 用户角色 `UserRole` | `CUSTOMER` | 消费者/会员 |
|  | `STAFF` | 店员 |
|  | `ADMIN` | 运营管理员 |
| 用户状态 `UserStatus` | `ENABLED` | 正常 |
|  | `DISABLED` | 禁用 |
| 商品状态 `ProductStatus` | `ON_SALE` | 已上架 |
|  | `OFF_SHELF` | 已下架 |
| 季节 `SeasonSuitability` | `SPRING` | 春季 |
|  | `SUMMER` | 夏季 |
|  | `AUTUMN` | 秋季 |
|  | `WINTER` | 冬季 |
|  | `ALL` | 四季 |
| 订单状态 `OrderStatus` | `PENDING_PAYMENT` | 待支付 |
|  | `PAID` | 已支付 |
|  | `FULFILLING` | 履约中 |
|  | `COMPLETED` | 已完成 |
|  | `CANCELLED` | 已取消 |
|  | `AFTER_SALE` | 售后中 |
|  | `REFUNDED` | 已退款 |
| 支付状态 `PaymentStatus` | `PENDING` | 待支付 |
|  | `SUCCESS` | 支付成功 |
|  | `FAILED` | 支付失败 |
|  | `REFUNDED` | 已退款 |
| 履约节点 `FulfillmentNode` | `ACCEPTED` | 接单 |
|  | `PREPARING` | 备花 |
|  | `DELIVERING` | 配送 |
|  | `SIGNED` | 签收 |
| 评价状态 `ReviewStatus` | `VISIBLE` | 显示 |
|  | `HIDDEN` | 隐藏 |
| 库存变动 `InventoryChangeType` | `STOCK_IN` | 入库 |
|  | `ORDER_DEDUCT` | 下单扣减 |
|  | `ORDER_CANCEL` | 取消订单回补 |
|  | `MANUAL_ADJUST` | 人工调整 |
|  | `AFTER_SALE_RESTORE` | 售后退款回补 |

价格带由后端按 `price` 计算：

| 价格 | `priceBand` |
| --- | --- |
| `< 100` | 平价 |
| `>= 100` 且 `< 300` | 中端 |
| `>= 300` | 高端 |

### 2.2 字典接口

`GET /api/dict/options` · 公开 · `ApiResponse<DictOptions>`

返回前端筛选、表单和状态展示所需的基础选项：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "categories": ["玫瑰", "百合", "康乃馨", "向日葵", "郁金香", "混合花束", "永生花", "绿植", "满天星", "礼盒"],
    "occasions": ["表白", "生日", "纪念日", "求婚", "婚礼", "母亲节", "教师节", "毕业季", "情人节", "七夕", "日常", "办公", "探望", "开业", "乔迁", "聚会", "商务", "感谢", "祝福", "道歉", "鼓励", "思念", "订婚", "结婚", "结婚纪念", "约会", "满月", "百日", "寿宴", "升学", "升职", "退休", "周年庆", "慰问", "探病", "康复祝福", "圣诞派对", "新年", "告白"],
    "festivals": ["情人节", "七夕", "520", "元宵节", "妇女节", "母亲节", "父亲节", "儿童节", "端午节", "教师节", "中秋节", "国庆节", "重阳节", "感恩节", "平安夜", "圣诞节", "元旦", "春节", "毕业季", "周年庆"],
    "flowerMeanings": ["热烈爱情", "至死不渝", "天长地久", "只此一人", "永恒的爱", "永不凋零", "浪漫星河", "只为你来", "爱的告白", "优雅浪漫", "纯洁的爱", "默默守护", "深情不变", "心动瞬间", "温暖祝福", "日日欢喜", "平安顺遂", "节日祝福", "温暖团圆", "幸福启程", "幸福美满", "岁岁平安", "心想事成", "前程似锦", "事业有成", "开业大吉", "乔迁之喜", "学业进步", "金榜题名", "感恩母爱", "温柔守护", "感恩祝福", "感恩每一天", "感谢有你", "真诚祝福", "纯洁高雅", "百年好合", "阳光忠诚", "勇敢追梦", "生机陪伴", "清新每一天", "思念守望", "温柔星河", "友谊长存", "健康平安", "康复祝福"],
    "tagMaxCounts": { "occasions": 8, "festivals": 6, "flowerMeanings": 6 },
    "priceBands": ["平价", "中端", "高端"],
    "seasons": [{ "value": "SPRING", "label": "春季" }, { "value": "ALL", "label": "四季" }],
    "roles": [{ "value": "CUSTOMER", "label": "消费者/会员" }],
    "orderStatuses": [{ "value": "PENDING_PAYMENT", "label": "待支付" }],
    "paymentStatuses": [{ "value": "PENDING", "label": "待支付" }],
    "reviewStatuses": [{ "value": "VISIBLE", "label": "显示" }],
    "fulfillmentNodes": [{ "value": "ACCEPTED", "label": "接单" }],
    "inventoryChangeTypes": [{ "value": "STOCK_IN", "label": "入库" }]
  },
  "timestamp": 1760000000000
}
```

注意：`categories`、`occasions`、`festivals`、`flowerMeanings`、`priceBands` 是字符串数组；其余枚举项是 `{ value, label }` 数组。`tagMaxCounts` 是三类标签各自允许商品选择的最大个数。场景、节日、花语以数据库 `tag_option` 为唯一来源，管理员在「标签管理」中增删改后，商品编辑选择器与各页面搜索下拉都读取最新列表；`frontend/src/lib/product-tags.ts` 只作为接口未返回时的兜底常量。其他枚举从接口读取，不要另行写死。

## 3. 接口总览

| 方法 | 路径 | 权限 | 响应 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公开 | `ApiResponse<UserVO>` |
| POST | `/api/auth/login` | 公开 | `ApiResponse<LoginResponse>` |
| POST | `/api/auth/logout` | 登录 | `ApiResponse<Void>` |
| GET | `/api/auth/me` | 登录 | `ApiResponse<UserVO>` |
| PUT | `/api/auth/me` | 登录 | `ApiResponse<UserVO>` |
| PUT | `/api/auth/password` | 登录 | `ApiResponse<Void>` |
| GET | `/api/auth/preferences` | 登录 | `ApiResponse<ThemePreferenceVO>` |
| PUT | `/api/auth/preferences` | 登录 | `ApiResponse<ThemePreferenceVO>` |
| POST | `/api/files/images` | 登录 | `ApiResponse<FileUploadVO>` |
| GET | `/api/dict/options` | 公开 | `ApiResponse<DictOptions>` |
| GET | `/api/appearance/auth-background` | 公开 | `ApiResponse<AuthBackgroundVO>` |
| GET | `/api/products` | 公开 | `ApiResponse<PageResult<ProductVO>>` |
| GET | `/api/products/hot` | 公开 | `ApiResponse<ProductVO[]>` |
| GET | `/api/products/{id}` | 公开 | `ApiResponse<ProductVO>` |
| GET | `/api/cart` | 登录 | `ApiResponse<CartItemVO[]>` |
| POST | `/api/cart/items` | 登录 | `ApiResponse<CartItemVO>` |
| PUT | `/api/cart/items/{id}` | 登录 | `ApiResponse<CartItemVO>` |
| DELETE | `/api/cart/items/{id}` | 登录 | `ApiResponse<Void>` |
| DELETE | `/api/cart` | 登录 | `ApiResponse<Void>` |
| GET | `/api/favorites` | 登录 | `ApiResponse<ProductVO[]>` |
| POST | `/api/favorites/{productId}` | 登录 | `ApiResponse<Void>` |
| DELETE | `/api/favorites/{productId}` | 登录 | `ApiResponse<Void>` |
| POST | `/api/orders` | 登录 | `ApiResponse<OrderVO>` |
| GET | `/api/orders` | 登录 | `ApiResponse<PageResult<OrderVO>>` |
| GET | `/api/orders/{id}` | 登录 | `ApiResponse<OrderVO>` |
| POST | `/api/orders/{id}/cancel` | 登录 | `ApiResponse<OrderVO>` |
| POST | `/api/orders/{id}/after-sale` | 登录 | `ApiResponse<OrderVO>` |
| GET | `/api/orders/{id}/fulfillments` | 登录 | `ApiResponse<FulfillmentVO[]>` |
| POST | `/api/payments/orders/{orderId}` | 登录 | `ApiResponse<PaymentVO>` |
| POST | `/api/payments/{paymentNo}/mock-callback` | 登录 | `ApiResponse<PaymentVO>` |
| GET | `/api/payments/orders/{orderId}` | 登录 | `ApiResponse<PaymentVO>` |
| POST | `/api/reviews` | 登录 | `ApiResponse<ReviewVO>` |
| GET | `/api/reviews/products/{productId}` | 公开 | `ApiResponse<PageResult<ReviewVO>>` |
| GET | `/api/reviews/my` | 登录 | `ApiResponse<PageResult<ReviewVO>>` |
| GET | `/api/recommendations` | 公开（可选登录） | `ApiResponse<RecommendationResponse>` |
| GET | `/api/staff/orders` | 店员 | `ApiResponse<PageResult<OrderVO>>` |
| GET | `/api/staff/orders/{id}` | 店员 | `ApiResponse<OrderVO>` |
| POST | `/api/staff/orders/{id}/accept` | 店员 | `ApiResponse<FulfillmentVO[]>` |
| POST | `/api/staff/orders/{id}/fulfillment` | 店员 | `ApiResponse<FulfillmentVO[]>` |
| POST | `/api/staff/orders/{id}/cancel` | 店员 | `ApiResponse<OrderVO>` |
| POST | `/api/staff/orders/{id}/after-sale` | 店员 | `ApiResponse<OrderVO>` |
| GET | `/api/staff/orders/{id}/fulfillments` | 店员 | `ApiResponse<FulfillmentVO[]>` |
| GET | `/api/staff/products` | 店员 | `ApiResponse<PageResult<ProductVO>>` |
| GET | `/api/staff/products/{id}` | 店员 | `ApiResponse<ProductVO>` |
| POST | `/api/staff/products/{id}/stock` | 店员 | `ApiResponse<InventoryRecord>` |
| GET | `/api/staff/inventory` | 店员 | `ApiResponse<PageResult<InventoryRecord>>` |
| GET | `/api/admin/users` | 管理员 | `ApiResponse<PageResult<UserVO>>` |
| GET | `/api/admin/users/{id}` | 管理员 | `ApiResponse<UserVO>` |
| POST | `/api/admin/users` | 管理员 | `ApiResponse<UserVO>` |
| PUT | `/api/admin/users/{id}` | 管理员 | `ApiResponse<UserVO>` |
| PUT | `/api/admin/users/{id}/password` | 管理员 | `ApiResponse<Void>` |
| GET | `/api/admin/products` | 管理员 | `ApiResponse<PageResult<ProductVO>>` |
| GET | `/api/admin/products/{id}` | 管理员 | `ApiResponse<ProductVO>` |
| POST | `/api/admin/products` | 管理员 | `ApiResponse<ProductVO>` |
| PUT | `/api/admin/products/{id}` | 管理员 | `ApiResponse<ProductVO>` |
| PUT | `/api/admin/products/{id}/status` | 管理员 | `ApiResponse<ProductVO>` |
| DELETE | `/api/admin/products/{id}` | 管理员 | `ApiResponse<Void>` |
| GET | `/api/admin/tags` | 管理员 | `ApiResponse<TagOverviewVO>` |
| POST | `/api/admin/tags` | 管理员 | `ApiResponse<TagOptionVO>` |
| PUT | `/api/admin/tags/{id}` | 管理员 | `ApiResponse<TagOptionVO>` |
| DELETE | `/api/admin/tags/{id}` | 管理员 | `ApiResponse<Void>` |
| PUT | `/api/admin/tags/max-count` | 管理员 | `ApiResponse<{ maxCount: number }>` |
| GET | `/api/admin/reviews` | 管理员 | `ApiResponse<PageResult<ReviewVO>>` |
| PUT | `/api/admin/reviews/{id}/status` | 管理员 | `ApiResponse<ReviewVO>` |
| PUT | `/api/admin/reviews/{id}/reply` | 管理员 | `ApiResponse<ReviewVO>` |
| GET | `/api/admin/operation-logs` | 管理员 | `ApiResponse<PageResult<OperationLog>>` |
| PUT | `/api/admin/appearance/auth-background` | 管理员 | `ApiResponse<AuthBackgroundVO>` |
| GET | `/api/admin/recommendations/weights` | 管理员 | `ApiResponse<RecommendationWeightsVO>` |
| PUT | `/api/admin/recommendations/weights` | 管理员 | `ApiResponse<RecommendationWeightsVO>` |
| GET | `/api/admin/recommendations/logs` | 管理员 | `ApiResponse<PageResult<RecommendationLogVO>>` |
| GET | `/api/admin/recommendations/evaluation` | 管理员 | `ApiResponse<RecommendationEvaluationVO>` |
| GET | `/api/admin/recommendations/stats` | 管理员 | `ApiResponse<RecommendationStatsVO>` |
| GET | `/api/admin/stats/overview` | 管理员 | `ApiResponse<OverviewStatsVO>` |
| GET | `/api/admin/stats/sales-trend` | 管理员 | `ApiResponse<SalesTrendVO[]>` |
| GET | `/api/admin/stats/category-sales` | 管理员 | `ApiResponse<CategorySalesVO[]>` |
| GET | `/api/admin/stats/order-status` | 管理员 | `ApiResponse<OrderStatusVO[]>` |
| GET | `/api/admin/stats/top-products` | 管理员 | `ApiResponse<TopProductVO[]>` |

## 4. 认证与个人中心

### 4.1 接口清单

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公开 | 注册消费者账号 |
| POST | `/api/auth/login` | 公开 | 登录并获取 JWT |
| POST | `/api/auth/logout` | 登录 | 吊销当前 JWT 会话 |
| GET | `/api/auth/me` | 登录 | 获取当前用户资料 |
| PUT | `/api/auth/me` | 登录 | 修改当前用户资料 |
| PUT | `/api/auth/password` | 登录 | 修改当前用户密码 |
| GET | `/api/auth/preferences` | 登录 | 获取当前账号的外观偏好 |
| PUT | `/api/auth/preferences` | 登录 | 保存当前账号的外观偏好 |

### 4.2 请求体

`RegisterRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `username` | string | 是 | 3-30 位，只允许字母、数字、下划线；全局唯一 |
| `password` | string | 是 | 6-32 位 |
| `nickname` | string | 否 | 最长 30；为空时默认使用用户名 |
| `phone` | string | 否 | 空字符串或中国大陆手机号 `1[3-9]xxxxxxxxx` |
| `email` | string | 否 | 邮箱格式 |

`LoginRequest`

| 字段 | 类型 | 必填 |
| --- | --- | --- |
| `username` | string | 是 |
| `password` | string | 是 |

`UpdateProfileRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `nickname` | string | 否 | 最长 30；不传则不变 |
| `phone` | string | 否 | 传空字符串 `""` 可清空 |
| `email` | string | 否 | 传空字符串 `""` 可清空 |
| `avatarUrl` | string | 否 | 最长 500；传空字符串 `""` 可清空，恢复默认首字母头像 |

`ChangePasswordRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `oldPassword` | string | 是 | 原密码 |
| `newPassword` | string | 是 | 6-32 位 |

### 4.3 登录响应示例

`POST /api/auth/login`

```json
{
  "username": "customer",
  "password": "customer123"
}
```

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": 3,
      "username": "customer",
      "nickname": "小梅",
      "phone": "13900000003",
      "email": "customer@flower.local",
      "role": "CUSTOMER",
      "roleLabel": "消费者/会员",
      "status": "ENABLED",
      "statusLabel": "正常",
      "createdAt": "2026-06-30T10:00:00"
    }
  },
  "timestamp": 1760000000000
}
```

### 4.4 关键行为

- 注册固定创建 `CUSTOMER` 角色，状态为 `ENABLED`。
- 登录失败返回 `401/1003`；账号被禁用返回 `403/1004`。
- `POST /api/auth/logout` 需要有效 JWT；控制器允许缺省 `Authorization` 头仅用于容错，实际没有有效令牌会在安全过滤器返回 `401`。令牌已失效时应直接清理本地状态。
- `PUT /api/auth/me` 只更新传入的非 `null` 字段；手机号、邮箱、头像地址传空字符串会清空。
- 修改密码不会自动使当前 JWT 失效，前端可在成功后要求重新登录。

### 4.5 图片上传

`POST /api/files/images`

- 权限：登录用户即可调用；个人头像、商品图片、背景图片共用此接口。
- 请求：`multipart/form-data`
- 文件字段：`file`，支持 JPG/PNG/WEBP/GIF，单张最大 5MB。
- 分类字段：`category`，取值为 `avatar`、`product`、`background`，默认 `product`。
- 响应：`ApiResponse<FileUploadVO>`，`data.url` 可直接保存到 `avatarUrl` 或 `imageUrl`。

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "url": "http://localhost:9000/flower-shop/product/2026-11-04/xxx.jpg",
    "objectName": "product/2026-11-04/xxx.jpg",
    "originalName": "rose.jpg",
    "contentType": "image/jpeg",
    "size": 245760
  },
  "timestamp": 1760000000000
}
```

MinIO 配置位于 `application.yml` 的 `app.minio`，默认关闭；启用后需保证 `bucket` 可公开读取，或配置 `public-url` 指向可访问的对象前缀。

### 4.6 登录页背景（外观设置）

登录页与注册页共用一张全局背景图，由管理员统一配置，所有访客读取。

`GET /api/appearance/auth-background`（公开）

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "backgroundType": "IMAGE",
    "imageUrl": "http://localhost:9000/flower-shop/background/2026-11-05/xxx.jpg",
    "backgroundOpacity": 0.78,
    "backgroundBlur": 0,
    "componentOpacity": 1,
    "updatedAt": "2026-11-05T10:30:00"
  },
  "timestamp": 1760000000000
}
```

- `backgroundType`：`NONE`（无背景）、`GRADIENT`（渐变光晕，与页面背景渐变一致）、`IMAGE`（自定义图片），默认 `NONE`；早期没有该字段的数据按是否有 `imageUrl` 推断为 `IMAGE`/`NONE`。
- `imageUrl` 为空或不存在时，前端使用默认主题背景。
- 图片地址由 `POST /api/files/images`（`category=background`）上传获得。
- `backgroundOpacity`：遮罩不透明度，取值 `0.4–0.98`，默认 `0.78`，仅对 `IMAGE` 生效。
- `backgroundBlur`：背景模糊像素，取值 `0–20`，默认 `0`（清晰），仅对 `IMAGE` 生效。
- `componentOpacity`：登录卡片与左侧介绍栏的不透明度，取值 `0.4–1`，默认 `1`。

`PUT /api/admin/appearance/auth-background`（管理员）

```json
{
  "backgroundType": "IMAGE",
  "imageUrl": "http://localhost:9000/flower-shop/background/2026-11-05/xxx.jpg",
  "backgroundOpacity": 0.72,
  "backgroundBlur": 4,
  "componentOpacity": 0.9
}
```

- `imageUrl` 传空字符串或空白字符表示清除背景，响应中 `imageUrl` 为 `null`。
- `backgroundType` 省略时按 `imageUrl` 是否有值推断为 `IMAGE`/`NONE`；传 `GRADIENT` 时无需图片。
- 三个调节参数均可省略；省略时保持服务端已有值，便于旧客户端只更新图片。

### 4.7 用户外观偏好

外观偏好按账号保存，登录后读取、修改后自动同步；登录页背景仍是 4.6 的全局配置。

`GET /api/auth/preferences`（登录）

- 已保存：返回 `ApiResponse<ThemePreferenceVO>`；
- 未保存：`data` 为空（响应中省略），前端可用当前本地主题初始化并调用 `PUT`。

`PUT /api/auth/preferences`（登录）

```json
{
  "mode": "dark",
  "palette": "rose-pine",
  "accent": "rose",
  "customAccent": "#c25b6a",
  "radius": "round",
  "density": "comfortable",
  "sidebarStyle": "follow",
  "scale": 1,
  "reduceMotion": false,
  "highContrast": false,
  "background": "gradient",
  "backgroundImage": "",
  "backgroundOpacity": 0.82,
  "backgroundBlur": 0,
  "componentOpacity": 1
}
```

字段约束：

| 字段 | 取值 |
| --- | --- |
| `mode` | `light` / `dark` / `system` |
| `palette` | `default` / `rose-pine-dawn` / `catppuccin-latte` / `everforest-light` / `rose-pine` |
| `accent` | `sky` / `blue` / `violet` / `rose` / `emerald` / `amber` / `orange` / `custom` |
| `customAccent` | `#RRGGBB` |
| `radius` | `compact` / `default` / `comfortable` / `round` |
| `density` | `compact` / `comfortable` |
| `sidebarStyle` | `follow` / `panel` / `accent` |
| `scale` | 0.8–1.2 |
| `background` | `solid` / `gradient` / `image` |
| `backgroundImage` | ≤ 500 字符 |
| `backgroundOpacity` / `componentOpacity` | 0–1 |
| `backgroundBlur` | 0–30 |

表结构：`user_theme_preference`，主键 `user_id`，外键关联 `sys_user.id`。
- 最长 500 字符；更新会记录操作日志（模块「外观管理」）。
- 数据保存在 `appearance_setting` 表单行记录（`id=1`），首次读取或更新时自动创建。

## 5. 商品浏览与字典

### 5.1 公开商品接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/products` | 公开 | 组合条件分页检索，仅返回已上架商品 |
| GET | `/api/products/hot` | 公开 | 热销商品，按销量降序，最多 8 条 |
| GET | `/api/products/{id}` | 公开 | 商品详情，仅已上架商品可访问 |

`GET /api/products` 查询参数：

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | long | `1` | 页码 |
| `size` | long | `10` | 每页数量，最大 100 |
| `keyword` | string |  | 模糊匹配商品名、花语、场景标签、节日标签 |
| `category` | string |  | 品类精确匹配，如 `玫瑰` |
| `occasion` | string |  | 场景标签模糊匹配，如 `表白` |
| `festival` | string |  | 节日标签模糊匹配 |
| `season` | string |  | `SPRING/SUMMER/AUTUMN/WINTER/ALL`；会同时匹配对应季节和 `ALL` |
| `minPrice` | number |  | 最低价格，包含边界 |
| `maxPrice` | number |  | 最高价格，包含边界 |
| `sort` | string | `sales_desc` | `sales_desc`、`price_asc`、`price_desc`、`newest`、`rating_desc`、`stock_asc`；非法值回退为销量降序 |

说明：

- 公开接口忽略 `status` 参数，始终只查 `ON_SALE`。
- `season` 非法时返回 `400`，消息为“季节参数不合法”。
- `occasionTags`、`festivalTags` 是逗号分隔字符串；`occasion`/`festival` 查询参数目前是单个模糊匹配值，不支持把多个标签拼成一个字符串做多选筛选。
- 商品详情下架或不存在分别返回 `409/2002`、`404/2001`。
- 热销接口返回数组，不分页；缓存约 5 分钟。

商品列表响应示例（`ProductVO` 单条）：

```json
{
  "id": 1,
  "name": "红玫瑰花束·11枝",
  "category": "玫瑰",
  "flowerMeaning": "热烈爱意，真诚告白",
  "occasionTags": "表白,纪念日,求婚",
  "festivalTags": "情人节,七夕",
  "price": 199.00,
  "originalPrice": 239.00,
  "stock": 120,
  "imageUrl": "/images/products/rose-11.svg",
  "description": "精选红玫瑰与尤加利叶搭配。",
  "seasonSuitability": "ALL",
  "seasonLabel": "四季",
  "priceBand": "中端",
  "salesCount": 320,
  "ratingAvg": 4.80,
  "ratingCount": 86,
  "status": "ON_SALE",
  "statusLabel": "已上架",
  "createdAt": "2026-05-21T10:00:00",
  "updatedAt": "2026-10-28T10:00:00"
}
```

## 6. 购物车

### 6.1 接口清单

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/cart` | 登录 | 无 | `ApiResponse<CartItemVO[]>` |
| POST | `/api/cart/items` | 登录 | `CartAddRequest` | `ApiResponse<CartItemVO>` |
| PUT | `/api/cart/items/{id}` | 登录 | `CartUpdateRequest` | `ApiResponse<CartItemVO>` |
| DELETE | `/api/cart/items/{id}` | 登录 | 无 | `ApiResponse<Void>` |
| DELETE | `/api/cart` | 登录 | 无 | `ApiResponse<Void>` |

### 6.2 请求体

`CartAddRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `productId` | number | 是 | 商品 ID |
| `quantity` | number | 是 | 1-99 |

`CartUpdateRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `quantity` | number | 是 | 1-99 |

### 6.3 关键行为

- 购物车按当前用户隔离；列表按购物车记录 ID 降序。
- 加入已存在商品时会累加数量，合并后总数量必须在 1-99 且不能超过库存。
- `available=false` 表示商品已下架或库存小于购买数量，前端应提示用户调整或移除。
- 商品已被彻底删除时，该购物车记录不会出现在列表中。
- `DELETE /api/cart/items/{id}` 只能删除当前用户自己的记录，否则返回 `404/3001`。
- 清空购物车不会影响订单和收藏。
- 创建订单成功后，被选中的购物车记录会被自动删除。

## 7. 收藏

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/favorites` | 登录 | 无 | `ApiResponse<ProductVO[]>` |
| POST | `/api/favorites/{productId}` | 登录 | 无 | `ApiResponse<Void>` |
| DELETE | `/api/favorites/{productId}` | 登录 | 无 | `ApiResponse<Void>` |

说明：

- 收藏列表只返回仍在售的商品；已下架商品不会展示。
- 重复收藏是幂等操作，不会报错。
- 取消不存在的收藏也是幂等操作。
- 收藏商品不存在返回 `404/2001`，已下架返回 `409/2002`。
- 收藏列表没有分页，前端如需分页应在本地处理或让后端补充接口。

## 8. 订单（用户端）

### 8.1 接口清单

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/orders` | 登录 | `CreateOrderRequest` | `ApiResponse<OrderVO>` |
| GET | `/api/orders` | 登录 | `page`、`size`、`status` | `ApiResponse<PageResult<OrderVO>>` |
| GET | `/api/orders/{id}` | 登录 | 无 | `ApiResponse<OrderVO>` |
| POST | `/api/orders/{id}/cancel` | 登录 | `CancelOrderRequest` 可选 | `ApiResponse<OrderVO>` |
| POST | `/api/orders/{id}/after-sale` | 登录 | `AfterSaleRequest` | `ApiResponse<OrderVO>` |
| GET | `/api/orders/{id}/fulfillments` | 登录 | 无 | `ApiResponse<FulfillmentVO[]>` |

### 8.2 请求体

`CreateOrderRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `cartItemIds` | number[] | 否 | 要结算的购物车记录 ID；不传或空数组表示结算整个购物车 |
| `receiverName` | string | 是 | 最长 50 |
| `receiverPhone` | string | 是 | 中国大陆手机号 |
| `receiverAddress` | string | 是 | 最长 255 |
| `remark` | string | 否 | 最长 255 |

`CancelOrderRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `reason` | string | 否 | 最长 200；不传时使用默认原因 |

`AfterSaleRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `reason` | string | 是 | 最长 200 |

### 8.3 创建订单示例

```json
{
  "cartItemIds": [1, 2],
  "receiverName": "李同学",
  "receiverPhone": "13800138000",
  "receiverAddress": "上海市杨浦区示例路 1 号",
  "remark": "请在工作日送达"
}
```

说明：

- 后端按购物车中当前商品价格重新计算金额，忽略客户端传入的金额。
- 下单会原子扣减库存并写入库存变动记录，订单初始状态为 `PENDING_PAYMENT`。
- 成功后返回订单快照，包含 `items`；成功后对应购物车记录被删除。
- 如果指定 `cartItemIds`，所有记录都必须属于当前用户，否则返回 `404/3001`。
- 购物车为空返回 `400/3002`。
- 商品下架、库存不足分别返回 `409/2002`、`409/2003`。

### 8.4 订单状态流转

```text
PENDING_PAYMENT --支付成功--> PAID --店员接单--> FULFILLING
FULFILLING --PREPARING--> FULFILLING --DELIVERING--> FULFILLING --SIGNED--> COMPLETED
PENDING_PAYMENT --用户取消/店员取消--> CANCELLED
PAID --店员取消--> CANCELLED（退款并回补库存、减少销量）
COMPLETED --用户申请售后--> AFTER_SALE
AFTER_SALE --店员同意--> REFUNDED（退款并回补库存、减少销量）
AFTER_SALE --店员拒绝--> COMPLETED
```

### 8.5 关键行为

- 用户端订单列表/详情只允许访问自己的订单。
- 用户取消仅允许 `PENDING_PAYMENT`，会回补库存并把待支付支付单标记为 `FAILED`。
- 用户申请售后仅允许 `COMPLETED`，申请后订单变为 `AFTER_SALE`，此时尚未退款。
- `GET /api/orders/{id}/fulfillments` 只允许订单所属用户访问；未接单时返回空数组。
- 订单列表支持 `status` 精确筛选，使用枚举值。
- `OrderVO.buyerUsername`、`buyerNickname` 主要出现在店员端和创建订单响应中，普通用户列表/详情中通常省略。

## 9. 支付（模拟支付）

### 9.1 接口清单

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/payments/orders/{orderId}` | 登录 | 无 | `ApiResponse<PaymentVO>` |
| POST | `/api/payments/{paymentNo}/mock-callback` | 登录 | 无 | `ApiResponse<PaymentVO>` |
| GET | `/api/payments/orders/{orderId}` | 登录 | 无 | `ApiResponse<PaymentVO>` |

### 9.2 支付流程

1. 订单状态必须为 `PENDING_PAYMENT`。
2. 调用 `POST /api/payments/orders/{orderId}` 创建或复用待支付记录，得到 `paymentNo`。
3. 调用 `POST /api/payments/{paymentNo}/mock-callback` 模拟支付成功。
4. 回调成功后订单变为 `PAID`，支付记录变为 `SUCCESS`，商品销量增加。

说明：

- 同一订单存在 `PENDING` 支付记录时，发起支付会直接返回已有记录，不会重复创建。
- 已支付订单再次发起支付返回 `409/5003`。
- 其他订单状态发起支付返回 `409/4002`。
- 回调是幂等的：支付记录已经是 `SUCCESS` 时直接返回该记录。
- 支付记录必须属于当前用户，否则返回 `404/5001`。
- `GET /api/payments/orders/{orderId}` 返回最近一条支付记录；如果从未发起支付，接口返回 200 且不返回 `data`。
- `channel` 当前固定为 `MOCK`，没有真实支付渠道。

支付记录示例：

```json
{
  "id": 3,
  "paymentNo": "PAY202605030003",
  "orderId": 3,
  "orderNo": "FL202605030003",
  "amount": 238.00,
  "channel": "MOCK",
  "status": "PENDING",
  "statusLabel": "待支付",
  "createdAt": "2026-10-27T10:00:00"
}
```

## 10. 评价（用户端与公开）

### 10.1 接口清单

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/reviews` | 登录 | `ReviewCreateRequest` | `ApiResponse<ReviewVO>` |
| GET | `/api/reviews/products/{productId}` | 公开 | `page`、`size` | `ApiResponse<PageResult<ReviewVO>>` |
| GET | `/api/reviews/my` | 登录 | `page`、`size` | `ApiResponse<PageResult<ReviewVO>>` |

### 10.2 请求体

`ReviewCreateRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `orderItemId` | number | 是 | 已完成订单的订单明细 ID |
| `rating` | number | 是 | 1-5 的整数 |
| `content` | string | 否 | 最长 500 |

### 10.3 关键行为

- 只有当前用户自己的、状态为 `COMPLETED` 的订单可以评价。
- 同一订单明细只能评价一次，重复返回 `409/6001`。
- 评价创建后订单明细 `reviewed` 变为 `true`，商品评分会按可见评价重新计算。
- 商品评价列表只返回 `VISIBLE` 评价，按评价 ID 降序；该接口不返回 `productName`。
- “我的评价”和管理员评价列表会返回 `productName`。
- 隐藏评价不会出现在商品评价列表，也不会进入商品评分统计。
- `ReviewVO` 中 `content`、`reply`、`productName` 可能因为空值被省略。

评价提交示例：

```json
{
  "orderItemId": 2,
  "rating": 5,
  "content": "包装很用心，送达准时。"
}
```

## 11. 智能推荐

### 11.1 接口

`GET /api/recommendations` · 公开（可选登录） · `ApiResponse<RecommendationResponse>`

示例请求：`GET /api/recommendations?season=AUTUMN&festival=教师节&scene=home&limit=10`

查询参数：

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `limit` | number | `10` | 推荐数量，1-50 |
| `festival` | string | 自动识别 | 节日名称，最长 20；不传时按当前日期识别 |
| `season` | string | 当前月份季节 | `SPRING/SUMMER/AUTUMN/WINTER/ALL`；非法值会回退到当前月份季节，不报错 |
| `scene` | string | `home` | 推荐场景，最长 30；当前已接收但不参与推荐结果，前端可传但不要依赖其改变排序 |

说明：

- 未登录或无历史行为时 `coldStart=true`，按当前节日/季节和热度降级推荐。
- 已登录时使用近 30 天已支付/履约中/已完成/售后中订单，以及当前用户的全部收藏和可见评价生成个性化画像。
- 只推荐 `ON_SALE` 商品。
- 推荐结果会写入推荐日志；匿名请求也会记录，但 `userId` 为空。
- 当前没有单独的“推荐结果为空”错误，商品为空时仍返回 200，`items` 为 `[]`。
- `strategy` 当前固定为 `CONTENT_TFIDF_MULTI_FACTOR`。

响应示例：

```json
{
  "strategy": "CONTENT_TFIDF_MULTI_FACTOR",
  "coldStart": true,
  "season": "AUTUMN",
  "seasonLabel": "秋季",
  "festival": "教师节",
  "scene": "home",
  "generatedAt": "2026-10-28T10:00:00",
  "weights": {
    "contentWeight": 0.400,
    "popularityWeight": 0.200,
    "festivalWeight": 0.250,
    "ratingWeight": 0.150,
    "updatedBy": 1,
    "updatedAt": "2026-09-28T10:00:00"
  },
  "items": [
    {
      "productId": 1,
      "name": "红玫瑰花束·11枝",
      "imageUrl": "/images/products/rose-11.svg",
      "category": "玫瑰",
      "price": 199.00,
      "originalPrice": 239.00,
      "priceBand": "中端",
      "occasionTags": ["表白", "纪念日", "求婚"],
      "festivalTags": ["情人节", "七夕"],
      "seasonLabel": "四季",
      "salesCount": 320,
      "ratingAvg": 4.80,
      "ratingCount": 86,
      "score": 0.9123,
      "contentSimilarity": 0.8211,
      "popularityScore": 0.7300,
      "festivalSeasonScore": 0.9500,
      "ratingScore": 0.9600,
      "reason": "匹配当前节日与季节，且销量和评分表现较好",
      "matchedTags": ["情人节", "四季"]
    }
  ]
}
```

`items` 字段：

- `score`：综合得分。
- `contentSimilarity`：内容相似度。
- `popularityScore`：销量热度。
- `festivalSeasonScore`：节日/季节匹配分。
- `ratingScore`：评分分。
- `reason`：面向用户展示的推荐理由。
- `matchedTags`：命中的标签。

## 12. 店员端

### 12.1 库存接口

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/staff/products` | 店员 | `ProductQuery` | `ApiResponse<PageResult<ProductVO>>` |
| GET | `/api/staff/products/{id}` | 店员 | 无 | `ApiResponse<ProductVO>` |
| POST | `/api/staff/products/{id}/stock` | 店员 | `StockAdjustRequest` | `ApiResponse<InventoryRecord>` |
| GET | `/api/staff/inventory` | 店员 | 分页/筛选参数 | `ApiResponse<PageResult<InventoryRecord>>` |

店员商品查询复用 `ProductQuery`，与公开商品列表参数一致，但会同时返回已上架和下架商品；`status` 可用于精确筛选商品状态，`sort=stock_asc` 可按库存升序排列。商品详情同样不受上下架状态限制。

`StockAdjustRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `delta` | number | 是 | 有符号调整量；正数入库，负数出库，不能为 0 |
| `remark` | string | 否 | 最长 200 |

库存记录查询参数：

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | long | `1` | 页码 |
| `size` | long | `10` | 每页数量 |
| `productId` | number |  | 商品 ID |
| `keyword` | string |  | 模糊匹配商品名、花语、场景标签、节日标签 |
| `changeType` | string |  | `STOCK_IN/ORDER_DEDUCT/ORDER_CANCEL/MANUAL_ADJUST/AFTER_SALE_RESTORE` |
| `orderNo` | string |  | 关联订单号精确匹配 |
| `start` | datetime |  | 创建时间起 |
| `end` | datetime |  | 创建时间止 |

说明：

- 调整后库存不能小于 0，否则返回 `409/2003`。
- `delta=0` 返回 `400`。
- 商品不存在返回 `404/2001`。
- 每次调整都会生成 `MANUAL_ADJUST` 库存记录。
- 商品建档初始库存会生成 `STOCK_IN` 记录；下单、取消、售后退款也会生成对应记录。

### 12.2 订单履约接口

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/staff/orders` | 店员 | 分页/筛选参数 | `ApiResponse<PageResult<OrderVO>>` |
| GET | `/api/staff/orders/{id}` | 店员 | 无 | `ApiResponse<OrderVO>` |
| POST | `/api/staff/orders/{id}/accept` | 店员 | 无 | `ApiResponse<FulfillmentVO[]>` |
| POST | `/api/staff/orders/{id}/fulfillment` | 店员 | `FulfillmentRequest` | `ApiResponse<FulfillmentVO[]>` |
| POST | `/api/staff/orders/{id}/cancel` | 店员 | `CancelOrderRequest` 可选 | `ApiResponse<OrderVO>` |
| POST | `/api/staff/orders/{id}/after-sale` | 店员 | `AfterSaleHandleRequest` | `ApiResponse<OrderVO>` |
| GET | `/api/staff/orders/{id}/fulfillments` | 店员 | 无 | `ApiResponse<FulfillmentVO[]>` |

店员订单查询参数：

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | long | `1` | 页码 |
| `size` | long | `10` | 每页数量，最大 100 |
| `status` | string |  | 订单状态精确匹配 |
| `keyword` | string |  | 模糊匹配订单号、收货人、联系电话、买家昵称/用户名、订单商品名 |
| `start` | datetime |  | 下单时间起 |
| `end` | datetime |  | 下单时间止 |

`FulfillmentRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `node` | string | 是 | `ACCEPTED/PREPARING/DELIVERING/SIGNED`；实际推进时只能传下一节点 |
| `remark` | string | 否 | 最长 200 |

`AfterSaleHandleRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `approved` | boolean | 是 | `true` 同意退款，`false` 拒绝 |
| `remark` | string | 否 | 最长 200，处理备注 |

履约规则：

- 只有 `PAID` 订单可以接单，接单后状态变为 `FULFILLING`，并生成 `ACCEPTED` 记录。
- 推进顺序必须严格为 `PREPARING -> DELIVERING -> SIGNED`。
- `SIGNED` 是最后一个节点，推进后订单状态变为 `COMPLETED`。
- 不能跳过节点，也不能重复推进已完成节点；推进顺序错误返回 `409/5502`，订单状态不匹配或已签收后继续推进返回 `409/5501`。
- 店员取消仅支持 `PENDING_PAYMENT` 或 `PAID`：
  - 待支付：关闭待支付记录、回补库存；
  - 已支付：退款、回补库存、减少销量。
- 售后处理仅支持 `AFTER_SALE`：
  - 同意：订单变为 `REFUNDED`，支付记录变为 `REFUNDED`，回补库存并减少销量；
  - 拒绝：订单回到 `COMPLETED`。
- 售后处理备注会追加到订单的 `afterSaleReason` 中。

履约记录示例：

```json
{
  "id": 4,
  "orderId": 1,
  "orderNo": "FL202605010001",
  "node": "SIGNED",
  "nodeLabel": "签收",
  "operatorName": "staff",
  "remark": "客户已签收",
  "createdAt": "2026-10-25T16:00:00"
}
```

## 13. 管理员端

### 13.1 用户管理

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/users` | 管理员 | 分页/筛选参数 | `ApiResponse<PageResult<UserVO>>` |
| GET | `/api/admin/users/{id}` | 管理员 | 无 | `ApiResponse<UserVO>` |
| POST | `/api/admin/users` | 管理员 | `AdminUserCreateRequest` | `ApiResponse<UserVO>` |
| PUT | `/api/admin/users/{id}` | 管理员 | `AdminUserUpdateRequest` | `ApiResponse<UserVO>` |
| PUT | `/api/admin/users/{id}/password` | 管理员 | `ResetPasswordRequest` | `ApiResponse<Void>` |

查询参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page` | long | 默认 1 |
| `size` | long | 默认 10 |
| `keyword` | string | 模糊匹配用户名、昵称、手机号 |
| `role` | string | `CUSTOMER/STAFF/ADMIN` |
| `status` | string | `ENABLED/DISABLED` |

`AdminUserCreateRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `username` | string | 是 | 3-30 位，字母/数字/下划线，唯一 |
| `password` | string | 是 | 6-32 位 |
| `nickname` | string | 否 | 最长 30 |
| `phone` | string | 否 | 空字符串或手机号 |
| `email` | string | 否 | 邮箱 |
| `role` | string | 是 | `CUSTOMER/STAFF/ADMIN` |

`AdminUserUpdateRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `nickname` | string | 否 | 不传则不变 |
| `phone` | string | 否 | 空字符串可清空 |
| `email` | string | 否 | 空字符串可清空 |
| `role` | string | 否 | `CUSTOMER/STAFF/ADMIN` |
| `status` | string | 否 | `ENABLED/DISABLED` |

`ResetPasswordRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `newPassword` | string | 是 | 6-32 位 |

说明：

- 管理员可以创建消费者、店员或管理员账号。
- 不允许把当前登录账号设置为 `DISABLED`，否则返回 `400`。
- 没有删除用户接口。
- 重置密码不会自动吊销该用户已有令牌。

### 13.2 商品管理

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/products` | 管理员 | `ProductQuery` | `ApiResponse<PageResult<ProductVO>>` |
| GET | `/api/admin/products/{id}` | 管理员 | 无 | `ApiResponse<ProductVO>` |
| POST | `/api/admin/products` | 管理员 | `ProductSaveRequest` | `ApiResponse<ProductVO>` |
| PUT | `/api/admin/products/{id}` | 管理员 | `ProductSaveRequest` | `ApiResponse<ProductVO>` |
| PUT | `/api/admin/products/{id}/status` | 管理员 | `status` 查询参数 | `ApiResponse<ProductVO>` |
| DELETE | `/api/admin/products/{id}` | 管理员 | 无 | `ApiResponse<Void>` |

`ProductQuery` 与公开商品接口相同，但管理员可以传 `status` 精确筛选；不传时包含已上架和已下架商品。`size` 最大 100。

`ProductSaveRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `name` | string | 是 | 最长 100 |
| `category` | string | 是 | 最长 30，建议使用字典中的品类 |
| `flowerMeaning` | string | 否 | 最长 200 |
| `occasionTags` | string | 否 | 最长 200，逗号分隔 |
| `festivalTags` | string | 否 | 最长 200，逗号分隔 |
| `price` | number | 是 | 大于等于 0.01 |
| `originalPrice` | number | 否 | 大于等于 0.01 |
| `stock` | number | 是 | 大于等于 0 |
| `imageUrl` | string | 否 | 最长 500 |
| `description` | string | 否 | 最长 2000 |
| `seasonSuitability` | string | 是 | `SPRING/SUMMER/AUTUMN/WINTER/ALL` |
| `status` | string | 否 | `ON_SALE/OFF_SHELF`；创建时默认 `ON_SALE`，编辑时不传则保持原状态 |

说明：

- 创建商品时初始销量为 0、评分为 0；如果初始库存大于 0，会生成入库记录。
- 编辑商品时 `stock` 必填；后端按新库存与旧库存的差值自动调整，并记录库存变动。
- 商品上下架通过查询参数传入，例如：`PUT /api/admin/products/1/status?status=OFF_SHELF`。
- 删除商品是逻辑删除；删除后公开接口不可见。
- `imageUrl` 可保存上传接口返回的 URL，也可继续保存外部或相对地址。

### 13.3 评价管理

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/reviews` | 管理员 | `page`、`size`、`productId`、`status`、`keyword` | `ApiResponse<PageResult<ReviewVO>>` |
| PUT | `/api/admin/reviews/{id}/status` | 管理员 | `status` 查询参数 | `ApiResponse<ReviewVO>` |
| PUT | `/api/admin/reviews/{id}/reply` | 管理员 | `ReviewReplyRequest` | `ApiResponse<ReviewVO>` |

`ReviewReplyRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `reply` | string | 是 | 最长 500 |

说明：

- `status` 查询参数取 `VISIBLE` 或 `HIDDEN`。
- `keyword` 模糊匹配商品名、花语、场景标签、节日标签，以及评价用户昵称、用户名。
- 显示/隐藏评价会影响商品评分统计和公开评价列表。
- 回复评价会覆盖原回复内容（当前接口是设置而不是追加）。

### 13.4 操作日志

`GET /api/admin/operation-logs` · 管理员 · `ApiResponse<PageResult<OperationLog>>`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page` | long | 默认 1 |
| `size` | long | 默认 10 |
| `module` | string | 模块精确匹配，如“订单”“支付” |
| `username` | string | 用户名模糊匹配 |
| `start` | datetime | 创建时间起 |
| `end` | datetime | 创建时间止 |

`OperationLog` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 日志 ID |
| `userId` | number | 操作者 ID，可能为空 |
| `username` | string | 操作者用户名 |
| `module` | string | 模块 |
| `operation` | string | 操作名称 |
| `method` | string | Controller 方法 |
| `requestUri` | string | 请求路径 |
| `requestMethod` | string | HTTP 方法 |
| `requestParams` | string | 请求参数 JSON 字符串，可能省略 |
| `success` | number | `1` 成功，`0` 失败 |
| `errorMessage` | string | 失败信息，可能省略 |
| `ip` | string | 来源 IP |
| `durationMs` | number | 耗时毫秒 |
| `createdAt` | datetime | 创建时间 |

### 13.5 推荐配置与效果

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/recommendations/weights` | 管理员 | 无 | `ApiResponse<RecommendationWeightsVO>` |
| PUT | `/api/admin/recommendations/weights` | 管理员 | `RecommendationWeightRequest` | `ApiResponse<RecommendationWeightsVO>` |
| GET | `/api/admin/recommendations/logs` | 管理员 | 分页/筛选 | `ApiResponse<PageResult<RecommendationLogVO>>` |
| GET | `/api/admin/recommendations/evaluation` | 管理员 | 无 | `ApiResponse<RecommendationEvaluationVO>` |
| GET | `/api/admin/recommendations/stats` | 管理员 | 无 | `ApiResponse<RecommendationStatsVO>` |

`RecommendationWeightRequest`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `contentWeight` | number | 是 | 0-1 |
| `popularityWeight` | number | 是 | 0-1 |
| `festivalWeight` | number | 是 | 0-1 |
| `ratingWeight` | number | 是 | 0-1 |

四个权重会分别四舍五入到 3 位小数，四舍五入后的和必须严格等于 1；原始和与 1 的偏差也不能超过 `0.001`，否则返回 `400/7001`。默认权重：

```json
{
  "contentWeight": 0.400,
  "popularityWeight": 0.200,
  "festivalWeight": 0.250,
  "ratingWeight": 0.150
}
```

推荐日志查询参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page` | long | 默认 1 |
| `size` | long | 默认 10，最大 100 |
| `userId` | number | 可选，按用户筛选 |
| `keyword` | string | 模糊匹配用户昵称、用户名、场景、季节、节日；支持中文场景/季节标签 |
| `start` | datetime | 创建时间起 |
| `end` | datetime | 创建时间止 |

推荐日志中的 `weightsJson`、`detailJson` 是 JSON 字符串，前端如果需要结构化展示需要先 `JSON.parse`。`productIds` 是逗号分隔的字符串，例如 `"1,6,8,13"`。

推荐评估固定包含 5 类画像：

1. 新用户冷启动
2. 玫瑰高频买家
3. 节日礼品偏好用户
4. 价格敏感型用户
5. 夏季时令偏好用户

评估字段：

- `hitRate`：Top-10 是否至少命中一个相关商品，返回 `0` 或 `1`。
- `precisionAt10`：Top-10 中相关商品比例。
- `coverage`：该画像推荐商品去重后占全部在售商品比例。
- `overallCoverage`：五类画像推荐商品并集覆盖率。
- `relevantCount`：Top-10 中相关商品数量。
- `sampleReason`：第一条推荐理由。

推荐覆盖率统计为近 30 天窗口：

- `totalRequests`：推荐请求数，匿名请求也计入。
- `distinctUsers`：去重登录用户数，匿名请求（`userId` 为空）不计入。
- `distinctRecommendedProducts`：被推荐过的不同商品数。
- `onSaleProducts`：当前在售商品数。
- `coverage`：去重推荐商品数 / 在售商品数，保留 4 位小数。
- `topRecommendedProductIds`：推荐次数最多的 5 个商品 ID 字符串数组。

### 13.6 经营统计

| 方法 | 路径 | 权限 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/stats/overview` | 管理员 | 无 | `ApiResponse<OverviewStatsVO>` |
| GET | `/api/admin/stats/sales-trend` | 管理员 | `days` | `ApiResponse<SalesTrendVO[]>` |
| GET | `/api/admin/stats/category-sales` | 管理员 | 无 | `ApiResponse<CategorySalesVO[]>` |
| GET | `/api/admin/stats/order-status` | 管理员 | 无 | `ApiResponse<OrderStatusVO[]>` |
| GET | `/api/admin/stats/top-products` | 管理员 | 无 | `ApiResponse<TopProductVO[]>` |

- `sales-trend` 的 `days` 默认 30，会被限制在 1-90；返回按日期升序、无数据日期补 0 的连续序列。
- 销售类统计只计算状态为 `PAID`、`FULFILLING`、`COMPLETED`、`AFTER_SALE` 的订单，不包含待支付、取消、已退款订单。
- `overview.pendingFulfillment` 统计 `PAID` 订单；`lowStockProducts` 统计在售且库存 `<10` 的商品；`averageRating` 基于可见评价。
- `order-status` 返回全部 7 种订单状态，即使数量为 0。
- `top-products` 按销量降序，最多 10 条。

## 14. 前端对接流程

### 14.1 访客浏览

1. `GET /api/dict/options` 获取筛选/表单字典。
2. `GET /api/products` 查询商品，或 `GET /api/products/hot` 获取热销。
3. `GET /api/products/{id}` 查看详情。
4. `GET /api/recommendations` 获取推荐；不登录时 `coldStart=true`。
5. `GET /api/reviews/products/{productId}` 查看公开评价。

### 14.2 登录与个人中心

1. 注册：`POST /api/auth/register`。
2. 登录：`POST /api/auth/login`，保存 `data.token`。
3. 后续请求加 `Authorization: Bearer <token>`。
4. 进入个人中心前可调用 `GET /api/auth/me` 获取最新用户信息。
5. 退出时调用 `POST /api/auth/logout`，然后清理本地 token。

### 14.3 购物车到支付

1. `POST /api/cart/items` 加购。
2. `GET /api/cart` 查看购物车，检查 `available`。
3. `PUT /api/cart/items/{id}` 修改数量，`DELETE` 删除。
4. `POST /api/orders` 创建订单；不传 `cartItemIds` 表示全部结算。
5. `POST /api/payments/orders/{orderId}` 获取 `paymentNo`。
6. `POST /api/payments/{paymentNo}/mock-callback` 模拟支付成功。
7. 支付成功后刷新订单详情。

### 14.4 收货、评价与售后

1. 店员 `POST /api/staff/orders/{id}/accept` 接单。
2. 店员依次推送 `PREPARING`、`DELIVERING`、`SIGNED`；`SIGNED` 后订单完成。
3. 用户 `GET /api/orders/{id}/fulfillments` 查看履约轨迹。
4. 订单 `COMPLETED` 后，用户 `POST /api/reviews` 提交评价。
5. 订单 `COMPLETED` 后，用户可 `POST /api/orders/{id}/after-sale` 申请售后；此时订单变为 `AFTER_SALE`。
6. 店员 `POST /api/staff/orders/{id}/after-sale` 处理售后。

### 14.5 建议的角色菜单

| 角色 | 菜单 |
| --- | --- |
| 访客 | 首页、商品列表、商品详情、推荐、评价浏览、登录、注册 |
| `CUSTOMER` | 首页、商品、推荐、收藏、购物车、我的订单、支付、我的评价、售后 |
| `STAFF` | 订单履约、订单详情、库存调整、库存记录、售后处理 |
| `ADMIN` | 用户管理、商品管理、评价管理、操作日志、推荐权重/日志/评估/统计、经营统计 |

## 15. 数据结构（TypeScript 参考）

> 以下类型可直接用于前端接口定义。由于后端会省略 `null` 字段，可空字段均标记为可选。

### 15.1 通用类型与枚举

```ts
export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type UserStatus = 'ENABLED' | 'DISABLED';
export type ProductStatus = 'ON_SALE' | 'OFF_SHELF';
export type SeasonSuitability = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ALL';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FULFILLING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'AFTER_SALE'
  | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type FulfillmentNode = 'ACCEPTED' | 'PREPARING' | 'DELIVERING' | 'SIGNED';
export type ReviewStatus = 'VISIBLE' | 'HIDDEN';
export type InventoryChangeType =
  | 'STOCK_IN'
  | 'ORDER_DEDUCT'
  | 'ORDER_CANCEL'
  | 'MANUAL_ADJUST'
  | 'AFTER_SALE_RESTORE';
```

### 15.2 用户与认证

```ts
export interface UserVO {
  id: number;
  username: string;
  nickname?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  roleLabel: string;
  status: UserStatus;
  statusLabel: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: UserVO;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email?: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export type ImageCategory = 'avatar' | 'product' | 'background';

export interface FileUploadVO {
  url: string;
  objectName: string;
  originalName?: string;
  contentType: string;
  size: number;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface AdminUserCreateRequest {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email?: string;
  role: UserRole;
}

export interface AdminUserUpdateRequest {
  nickname?: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ResetPasswordRequest {
  newPassword: string;
}
```

### 15.3 商品、字典与购物车

```ts
export interface OptionItem {
  value: string;
  label: string;
}

export interface DictOptions {
  categories: string[];
  occasions: string[];
  festivals: string[];
  flowerMeanings: string[];
  priceBands: string[];
  seasons: OptionItem[];
  roles: OptionItem[];
  orderStatuses: OptionItem[];
  paymentStatuses: OptionItem[];
  reviewStatuses: OptionItem[];
  fulfillmentNodes: OptionItem[];
  inventoryChangeTypes: OptionItem[];
}

export interface ProductVO {
  id: number;
  name: string;
  category: string;
  flowerMeaning?: string;
  occasionTags?: string;
  festivalTags?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  seasonSuitability: SeasonSuitability;
  seasonLabel: string;
  priceBand: string;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  status: ProductStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductQuery {
  page?: number;
  size?: number;
  keyword?: string;
  category?: string;
  occasion?: string;
  festival?: string;
  season?: SeasonSuitability;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'sales_desc' | 'price_asc' | 'price_desc' | 'newest' | 'rating_desc' | 'stock_asc';
}

export interface ProductSaveRequest {
  name: string;
  category: string;
  flowerMeaning?: string;
  occasionTags?: string;
  festivalTags?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  seasonSuitability: SeasonSuitability;
  status?: ProductStatus;
}

export interface CartItemVO {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
  status: ProductStatus;
  statusLabel: string;
  available: boolean;
}

export interface CartAddRequest {
  productId: number;
  quantity: number;
}

export interface CartUpdateRequest {
  quantity: number;
}
```

### 15.4 订单、支付与履约

```ts
export interface OrderItemVO {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  category: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  reviewed: boolean;
}

export interface OrderVO {
  id: number;
  orderNo: string;
  userId: number;
  buyerUsername?: string;
  buyerNickname?: string;
  totalAmount: number;
  payAmount: number;
  status: OrderStatus;
  statusLabel: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark?: string;
  cancelReason?: string;
  afterSaleReason?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
  items: OrderItemVO[];
}

export interface CreateOrderRequest {
  cartItemIds?: number[];
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark?: string;
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface AfterSaleRequest {
  reason: string;
}

export interface AfterSaleHandleRequest {
  approved: boolean;
  remark?: string;
}

export interface PaymentVO {
  id: number;
  paymentNo: string;
  orderId: number;
  orderNo: string;
  amount: number;
  channel: string;
  status: PaymentStatus;
  statusLabel: string;
  paidAt?: string;
  createdAt: string;
}

export interface FulfillmentVO {
  id: number;
  orderId: number;
  orderNo: string;
  node: FulfillmentNode;
  nodeLabel: string;
  operatorName: string;
  remark?: string;
  createdAt: string;
}

export interface FulfillmentRequest {
  node: FulfillmentNode;
  remark?: string;
}
```

### 15.5 评价、库存与日志

```ts
export interface ReviewCreateRequest {
  orderItemId: number;
  rating: number;
  content?: string;
}

export interface ReviewReplyRequest {
  reply: string;
}

export interface ReviewVO {
  id: number;
  orderId: number;
  orderItemId: number;
  productId: number;
  productName?: string;
  userId: number;
  nickname?: string;
  rating: number;
  content?: string;
  reply?: string;
  status: ReviewStatus;
  statusLabel: string;
  createdAt: string;
}

export interface StockAdjustRequest {
  delta: number;
  remark?: string;
}

export interface InventoryRecord {
  id: number;
  productId: number;
  productName: string;
  changeType: InventoryChangeType;
  changeQuantity: number;
  stockBefore: number;
  stockAfter: number;
  orderNo?: string;
  operatorId?: number;
  operatorName: string;
  remark?: string;
  createdAt: string;
}

export interface OperationLog {
  id: number;
  userId?: number;
  username: string;
  module: string;
  operation: string;
  method: string;
  requestUri: string;
  requestMethod: string;
  requestParams?: string;
  success: number;
  errorMessage?: string;
  ip: string;
  durationMs: number;
  createdAt: string;
}
```

### 15.6 推荐

```ts
export interface RecommendationQueryParams {
  limit?: number;
  festival?: string;
  season?: SeasonSuitability;
  scene?: string;
}

export interface RecommendationWeightsVO {
  contentWeight: number;
  popularityWeight: number;
  festivalWeight: number;
  ratingWeight: number;
  updatedBy?: number;
  updatedAt?: string;
}

export interface RecommendationWeightRequest {
  contentWeight: number;
  popularityWeight: number;
  festivalWeight: number;
  ratingWeight: number;
}

export interface RecommendationItemVO {
  productId: number;
  name: string;
  imageUrl?: string;
  category: string;
  price: number;
  originalPrice?: number;
  priceBand: string;
  occasionTags: string[];
  festivalTags: string[];
  seasonLabel?: string;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  score: number;
  contentSimilarity: number;
  popularityScore: number;
  festivalSeasonScore: number;
  ratingScore: number;
  reason: string;
  matchedTags: string[];
}

export interface RecommendationResponse {
  strategy: string;
  coldStart: boolean;
  season: SeasonSuitability;
  seasonLabel: string;
  festival?: string;
  scene: string;
  generatedAt: string;
  weights: RecommendationWeightsVO;
  items: RecommendationItemVO[];
}

export interface RecommendationLogVO {
  id: number;
  userId?: number;
  userNickname?: string;
  scene: string;
  sceneLabel: string;
  festival?: string;
  season: SeasonSuitability;
  seasonLabel: string;
  coldStart: boolean;
  productIds: string;
  weightsJson?: string;
  detailJson?: string;
  createdAt: string;
}

export interface PersonaResult {
  name: string;
  description: string;
  coldStart: boolean;
  itemCount: number;
  relevantCount: number;
  hitRate: number;
  precisionAt10: number;
  coverage: number;
  sampleReason?: string;
}

export interface RecommendationEvaluationVO {
  generatedAt: string;
  totalProducts: number;
  overallCoverage: number;
  personas: PersonaResult[];
}

export interface RecommendationStatsVO {
  totalRequests: number;
  distinctUsers: number;
  distinctRecommendedProducts: number;
  onSaleProducts: number;
  coverage: number;
  topRecommendedProductIds: string[];
}
```

### 15.7 经营统计

```ts
export interface OverviewStatsVO {
  totalSales: number;
  todaySales: number;
  totalOrders: number;
  todayOrders: number;
  pendingFulfillment: number;
  lowStockProducts: number;
  onSaleProducts: number;
  customerCount: number;
  totalReviews: number;
  averageRating: number;
}

export interface SalesTrendVO {
  date: string;
  amount: number;
  orderCount: number;
}

export interface CategorySalesVO {
  category: string;
  amount: number;
  quantity: number;
}

export interface OrderStatusVO {
  status: OrderStatus;
  statusLabel: string;
  count: number;
}

export interface TopProductVO {
  productId: number;
  productName: string;
  quantity: number;
  amount: number;
}
```

## 16. 已知边界与前端注意事项

- 图片上传依赖 MinIO；未配置时上传接口返回 `503/8001`。商品历史相对地址仍可使用占位图或独立静态资源服务兜底。
- 没有地址簿、优惠券、积分、真实物流、真实支付；地址随订单提交，支付只有模拟回调。
- 没有订单预览接口：前端可从购物车列表计算预计金额，但最终金额以下单响应为准。
- `RecommendationQuery.scene` 目前不会改变推荐排序；地点维度尚未建模。
- 推荐接口允许匿名访问；需要个性化时必须携带有效 JWT。
- 商品标签在 `ProductVO`/`ProductSaveRequest` 中是逗号分隔字符串；在 `RecommendationItemVO` 中是数组，二者不要混用。
- 公开商品接口只返回在售商品；管理端商品接口才可看到下架商品。
- `POST /api/auth/register` 不返回 token，不等于完成登录。
- 订单支付成功后才会增加销量；取消/退款会回补库存并减少销量。
- 只允许已完成订单评价和申请售后。
- 售后申请后是 `AFTER_SALE`，只有店员同意后才变为 `REFUNDED`。
- `GET /api/payments/orders/{orderId}` 在没有支付记录时返回 200 且无 `data`，前端应处理空结果。
- 订单列表、详情、支付、售后等接口均按当前登录用户隔离，不能用其他用户 ID 直接访问。
- 本文档未列出 Springdoc 自动文档中的全部实现细节；调试时也可访问 `/doc.html`、`/swagger-ui.html` 或 `/v3/api-docs`。



# 花店管理系统前端开发提示词

## 项目概述

基于已有的后端 API（详见接口文档），开发一套完整的花店管理系统前端。系统包含三个视角：**访客/消费者端**、**店员端**、**管理员端**。

**核心视觉目标**：参考 Make Me Pulse 2019（2019.makemepulse.com）的交互式插画场景设计——整个网站不是由「导航栏 + 列表 + 卡片」组成，而是由 **一个个可交互的全屏插画场景** 组成。花园场景中的每一朵花、每一个物品、每一个角色都是 **真实可点击的功能入口**，悬浮时有生动的动画反馈，点击后场景变形展开进入对应功能。用户感觉自己在 **探索一座活的魔法花园**，而不是在操作一个网站。

------

## 技术栈要求

- **框架**：Vue 3 + Composition API + `<script setup>`
- **构建工具**：Vite
- **路由**：Vue Router 4
- **状态管理**：Pinia
- **HTTP 请求**：Axios（封装统一拦截器）
- **UI 组件库**：Element Plus（仅管理端表单/表格，消费者端完全自定义）
- **CSS**：SCSS + CSS Variables + CSS 3D Transforms
- **动画引擎**：GSAP 3（核心：ScrollTrigger + Flip + MorphSVG 插件）
- **交互**：`@vueuse/core`（useMouse、useScroll、useElementSize、useIntersectionObserver）
- **SVG 动画**：内联 SVG + GSAP 驱动 SVG 属性动画（路径变形、描边动画、颜色过渡）
- **图表**：ECharts 5（管理端统计）
- **类型**：TypeScript 全量类型定义
- **响应式**：桌面端优先，适配平板

------

## 设计哲学 —— 「可交互的魔法花园」

### 参考网站核心特征（2019.makemepulse.com）

| 特征     | Make Me Pulse 2019                           | 花店应用方式                               |
| -------- | -------------------------------------------- | ------------------------------------------ |
| 整体结构 | 全屏场景逐屏滚动，每屏是一个完整插画世界     | 每个主要功能是一个花园场景，滚动或点击切换 |
| 交互物品 | 场景中的人物、物体可悬浮高亮、点击触发动画   | 花园中的花朵、花篮、工具、角色都是功能按钮 |
| 视觉风格 | 2.5D 扁平插画，多层叠加，色彩鲜明            | 2.5D 花园插画，前景花朵/中景内容/远景天空  |
| 视差     | 滚动时各层以不同速度移动                     | 鼠标移动 + 滚动双重视差                    |
| 微交互   | 鼠标经过任何元素都有反馈（弹跳、发光、旋转） | 花朵摇曳、蝴蝶飞走、露珠滑落、花瓣飘散     |
| 过渡     | 场景间无缝 morph 过渡                        | 点击花朵→花朵放大展开成页面内容            |
| 粒子     | 场景中有浮动光点、星星                       | 花粉、萤火虫、飘落花瓣                     |
| 叙事     | 通过滚动讲故事                               | 通过探索花园了解花店                       |

### 核心创新：场景内物品即按钮（Interactive Scene Objects）

**这是整个项目最重要的创意。**

传统网站：导航栏 → 点击链接 → 跳转页面
我们的花园：**场景中的物品本身就是按钮**，点击物品直接进入对应功能

#### 首页花园场景中的可交互物品：

text



```
                    ☁️        ☁️
          🦋                    🦋
    ┌─────────────────────────────────────┐
    │                                     │
    │   🌹花束展示架    🌻向日葵田         │
    │   [点击→商品列表]  [点击→热销推荐]    │
    │                                     │
    │        🏪 花店小屋                   │
    │        [点击→展开主菜单]              │
    │                                     │
    │   🧺花篮        💌信封    🧑‍🌾花艺师  │
    │   [点击→购物车]  [点击→推荐] [点击→我的]│
    │                                     │
    │   📋订单板       💳收银台             │
    │   [点击→我的订单]  [点击→支付]        │
    │                                     │
    │  🌿草地  🌸花瓣  🐝蜜蜂  🌷郁金香    │
    │  (装饰性，悬浮有微动画)               │
    └─────────────────────────────────────┘
```

#### 交互行为设计：

**悬浮（Hover）时**：

- 物品 **轻微放大**（`scale(1.08)`）+ **上浮**（`translateY(-6px)`）
- 物品周围出现 **柔和光晕**（`drop-shadow` 或径向渐变）
- 物品旁边 **弹出标签气泡**，显示功能名称（如「浏览花束」）
- 关联的装饰元素响应：花朵旁的蝴蝶飞起、花篮里的花瓣飘出
- 鼠标光标变为 **花朵形状**

**点击（Click）时**：

- 物品 **脉冲放大**（`scale(1.2) → scale(1)`）

- 从物品中心 **爆开粒子**（花瓣/光点）

- 物品 

  morph 展开

   成对应的内容面板或跳转页面

  - 例如点击花束展示架 → 展示架放大铺满屏幕 → 变形为商品列表页
  - 例如点击花篮 → 花篮飞到屏幕中央 → 展开为购物车面板

**空闲（Idle）时**：

- 所有物品有 

  持续的微动画

  ：

  - 花朵轻轻摇曳（`rotate(-2deg) → rotate(2deg)` 循环）
  - 蝴蝶沿贝塞尔曲线飞行
  - 蜜蜂绕花朵盘旋
  - 云朵缓慢飘移
  - 露珠在叶片上滑动
  - 向日葵缓慢转向鼠标方向（像真正的向日葵追光）

------

## 视觉设计系统

### 色彩体系 —— 「童话花园」

SCSS



```
// 主色调 —— 温暖、饱和、童话感（参考 makemepulse 的鲜明配色）
$primary: #E86B7A;          // 玫瑰红（鲜艳、活力）
$primary-light: #FFB3C1;    // 樱花粉
$primary-dark: #C44D5E;     // 深玫红
$secondary: #5BA88C;        // 翡翠绿（叶片、茎）
$secondary-light: #A8D8B9;  // 薄荷绿
$accent-gold: #F5B942;      // 向日葵金
$accent-purple: #9B72CF;    // 鸢尾紫
$accent-blue: #6BB5E0;      // 晴空蓝

// 场景色板（每个场景/物品有自己的主色）
$scene-morning: #FFE8D6;    // 晨光暖橙
$scene-garden: #E8F5E0;     // 花园嫩绿
$scene-shop: #FFF0E0;       // 花店暖黄
$scene-night: #2D2040;      // 夜晚深紫（管理端）

// 物品色板
$item-rose: #E86B7A;
$item-sunflower: #F5C147;
$item-lavender: #B8A4D4;
$item-basket: #D4A574;
$item-envelope: #FFB3C1;
$item-board: #8EB8D4;
$item-register: #A8D8B9;

// 背景
$bg-sky-top: #87CEEB;       // 天空蓝（场景顶部）
$bg-sky-bottom: #FFE8D6;    // 地平线暖色
$bg-ground: #7CB342;        // 草地绿
$bg-canvas: #FAF5EF;        // 画布底色（非场景页面）
$bg-glass: rgba(255, 255, 255, 0.7);

// 文字
$text-primary: #2D2028;
$text-secondary: #5A4550;
$text-light: #FFFFFF;
$text-on-dark: #FAF5EF;
```

### 插画风格规范

**2.5D 扁平插画风格**（参考 makemepulse）：

1. **无描边**：所有形状用纯色填充，不用 stroke（除非是装饰线条）
2. **分层叠加**：前景、中景、远景明确分层，用大小和颜色深浅区分
3. **柔和阴影**：物品底部有椭圆形半透明阴影（模拟地面投影）
4. **圆润造型**：所有形状圆角化，没有尖锐棱角
5. **渐变色块**：大面积色块使用微妙渐变（如天空从上到下渐变）
6. **装饰细节**：场景中散布小装饰（小花、草叶、石子、蝴蝶、瓢虫）

### SVG 插画组件架构

每个场景是一个大型 SVG 组件，内部物品分组并添加交互：

vue



```
<template>
  <svg viewBox="0 0 1920 1080" class="garden-scene">
    <!-- 远景层 -->
    <g class="layer-sky" data-depth="0.1">
      <rect fill="url(#skyGradient)" width="1920" height="600"/>
      <g class="cloud cloud-1"><!-- 云朵 --></g>
      <g class="cloud cloud-2"><!-- 云朵 --></g>
    </g>
    
    <!-- 中景层 -->
    <g class="layer-hills" data-depth="0.3">
      <path d="..." fill="#A8D8B9"/> <!-- 远山 -->
    </g>
    
    <!-- 地面层 -->
    <g class="layer-ground" data-depth="0.5">
      <path d="..." fill="#7CB342"/> <!-- 草地 -->
    </g>
    
    <!-- 可交互物品层 -->
    <g class="layer-interactive" data-depth="0.7">
      <!-- 花束展示架 -->
      <g class="interactive-item" 
         data-action="products"
         @mouseenter="onItemHover('products', true)"
         @mouseleave="onItemHover('products', false)"
         @click="onItemClick('products')">
        <g class="item-shadow"><ellipse .../></g>
        <g class="item-body">
          <!-- 展示架 SVG 形状 -->
        </g>
        <g class="item-label" opacity="0">
          <!-- 悬浮标签 -->
          <text>浏览花束</text>
        </g>
        <g class="item-glow" opacity="0">
          <!-- 光晕 -->
        </g>
      </g>
      
      <!-- 花篮 -->
      <g class="interactive-item" data-action="cart" ...>
        <!-- 花篮 SVG -->
      </g>
      
      <!-- 更多物品... -->
    </g>
    
    <!-- 前景装饰层 -->
    <g class="layer-foreground" data-depth="1.0">
      <g class="deco-flower deco-1"><!-- 前景大花 --></g>
      <g class="deco-butterfly"><!-- 蝴蝶 --></g>
    </g>
    
    <!-- 粒子层 -->
    <g class="layer-particles">
      <!-- 花粉/萤火虫/花瓣 -->
    </g>
  </svg>
</template>
```

### 空间与深度

SCSS



```
// 视差深度系数（data-depth 属性）
// 0.1 = 最远（天空），移动最慢
// 1.0 = 最近（前景），移动最快

// 鼠标视差
.layer-sky        { transform: translate(calc(var(--mx) * -5px), calc(var(--my) * -3px)); }
.layer-hills      { transform: translate(calc(var(--mx) * -15px), calc(var(--my) * -8px)); }
.layer-ground     { transform: translate(calc(var(--mx) * -25px), calc(var(--my) * -12px)); }
.layer-interactive{ transform: translate(calc(var(--mx) * -35px), calc(var(--my) * -18px)); }
.layer-foreground { transform: translate(calc(var(--mx) * -50px), calc(var(--my) * -25px)); }
```

------

## 页面与场景清单

### 一、消费者端场景

#### 场景 1：花园入口 (`/`) —— 主场景

**这是一个全屏的 2.5D 花园插画，所有功能入口都是场景中的物品。**

**场景构成**：

- **天空**：渐变蓝天 + 飘动白云 + 太阳（太阳跟随鼠标方向微微移动）
- **远景**：起伏的绿色山丘 + 远处的花田色块
- **中景**：花店小屋（中央主体建筑）+ 花园围栏
- **地面**：绿色草地 + 小径 + 散落的花瓣
- **前景**：大型花朵（左右两侧，部分遮挡画面边缘，营造景深）

**可交互物品**（6-8 个）：

| 物品         | 位置               | 功能     | 悬浮动画                               | 点击动画                    |
| ------------ | ------------------ | -------- | -------------------------------------- | --------------------------- |
| 🌹 花束展示架 | 左侧               | 商品列表 | 花朵逐朵绽放 + 标签「浏览花束」        | 展示架放大→变形为商品列表   |
| 🌻 向日葵田   | 右后方             | 热销推荐 | 向日葵转向鼠标 + 标签「热门推荐」      | 向日葵放大→展开推荐轮播     |
| 🧺 花篮       | 左前方             | 购物车   | 花篮摇晃 + 花瓣飘出 + 角标显示数量     | 花篮飞到中央→展开购物车面板 |
| 💌 信封       | 右侧桌上           | 智能推荐 | 信封打开 + 信纸弹出 + 标签「为你推荐」 | 信纸飞出→展开推荐内容       |
| 🧑‍🌾 花艺师    | 中央小屋前         | 个人中心 | 花艺师挥手 + 标签「我的花园」          | 镜头推进→进入个人中心       |
| 📋 订单板     | 小屋墙上           | 我的订单 | 板上的纸张翻动 + 标签「我的订单」      | 纸张飞出→展开订单列表       |
| 💳 收银台     | 小屋内（透过窗户） | 支付     | 窗户亮起 + 标签「结账」                | 镜头推入窗户→进入支付       |
| 🌷 花圃       | 右前方             | 收藏     | 花朵发光 + 心形粒子 + 标签「我的收藏」 | 花朵放大→展开收藏列表       |

**装饰性元素**（不可点击但有动画）：

- 🦋 蝴蝶：沿贝塞尔曲线在场景中飞行，鼠标靠近时飞走
- 🐝 蜜蜂：绕花朵盘旋，发出嗡嗡声（可选）
- 🐞 瓢虫：在草叶上缓慢爬行
- 💧 露珠：在叶片上闪烁
- 🌸 花瓣：从树上飘落
- ☁️ 云朵：缓慢飘移
- 🌈 彩虹：特定条件下出现（如鼠标在天空画圈）

**滚动行为**：

- 向下滚动时，镜头 **缓慢推进**（scale 从 1 到 1.1），仿佛走进花园
- 继续滚动，场景 **平滑过渡** 到第二个场景（商品花园）

#### 场景 2：商品花园 (`/products`) —— 花田场景

**从主场景的花束展示架点击进入，或滚动进入。**

**场景构成**：

- 一片开阔的花田，不同区域种着不同品类的花
- 每个品类是一个 **花圃区域**，花圃中的花朵就是商品

**可交互物品**：

- 品类花圃

  （从字典 

  ```
  categories
  ```

   渲染）：

  - 玫瑰花圃（红色区域）→ 点击筛选玫瑰
  - 百合花圃（白色区域）→ 点击筛选百合
  - 向日葵花圃（黄色区域）→ 点击筛选向日葵
  - 等等...

- 筛选工具

  （场景中的物品）：

  - 花园栅栏上的标牌 → 价格筛选
  - 天气风向标 → 季节筛选
  - 日历牌 → 节日筛选
  - 放大镜（挂在树枝上）→ 搜索

- 商品花朵

  ：

  - 花圃中每朵花代表一个商品
  - 悬浮时花朵放大 + 显示名称和价格气泡
  - 点击花朵 → 花朵飞到屏幕中央 → 展开为商品详情面板
  - 花朵大小反映销量（热销的花更大）
  - 花朵颜色反映品类

**布局**：

- 不是传统列表，而是 **俯瞰花田的 2.5D 视角**
- 花圃按品类分区排列
- 滚动时镜头在花田上方平移
- 支持无限滚动（新花圃从远处出现）

#### 场景 3：商品详情 (`/products/:id`) —— 花束特写

**从商品花朵点击后，花朵放大展开的沉浸式面板。**

- 背景：模糊的花田场景
- 中央：大型花束插画（SVG，根据品类变化）
- 花束周围环绕着信息卡片（毛玻璃）：
  - 名称、花语（手写体）
  - 价格（金色大字）
  - 标签（叶片形状）
  - 库存、评分
- 底部操作栏：加入购物车（花瓣形按钮）、立即购买、收藏
- 评价区：从花束底部生长出的藤蔓，每片叶子是一条评价
- 返回：花束缩小飞回花田原位

#### 场景 4：购物车 (`/cart`) —— 花篮场景

**从主场景的花篮点击进入。**

- 中央是一个 **大型花篮 SVG**
- 购物车中的商品是花篮里的 **花朵**
- 每朵花可以拖拽调整数量（花朵变大/变小）
- 删除商品：花朵从花篮中飞出消散
- 花篮底部显示合计金额
- 「去结算」按钮是花篮上的丝带

#### 场景 5：订单 (`/orders`) —— 花园公告板

**从主场景的订单板点击进入。**

- 场景是一个花园中的 **木质公告板**
- 每张订单是钉在公告板上的一张 **便签纸**
- 便签颜色对应订单状态（花瓣色板）
- 悬浮便签时纸张微微翘起
- 点击便签 → 纸张飞到前方展开为订单详情
- 订单详情中的进度条是 **花茎生长** 动画

#### 场景 6：个人中心 (`/profile`) —— 花艺师工作台

**从主场景的花艺师点击进入。**

- 场景是花艺师的工作台
- 桌上的物品是功能入口：
  - 镜子 → 编辑资料
  - 日记本 → 我的评价
  - 相框 → 我的收藏
  - 钥匙 → 修改密码
  - 门 → 退出登录

#### 场景 7：支付 (`/payment/:orderId`) —— 收银场景

- 花店收银台场景
- 收银机显示金额
- 点击收银机按钮完成支付
- 支付成功：收银机弹出花朵 + 全屏撒花

#### 场景 8：推荐 (`/recommendations`) —— 魔法信封

- 从主场景的信封进入
- 信封打开，信纸飞出
- 信纸上展示推荐商品（卡片式）
- 推荐理由以手写体呈现

#### 场景 9：收藏 (`/favorites`) —— 秘密花园

- 一个被围栏围起的小花园
- 收藏的商品是花园中特别照料的花朵
- 每朵花有心形光环

### 二、店员端场景

#### 场景 10：店员工作台 (`/staff/*`)

- 场景是花店的 **后厨工作台**
- 工作台上的物品：
  - 订单打印机 → 订单管理
  - 货架 → 库存管理
  - 工具箱 → 履约操作
- 保留花园背景但降低动画密度
- 功能面板以毛玻璃浮层形式出现在场景上方

### 三、管理员端场景

#### 场景 11：管理员花园 (`/admin/*`)

- 场景是 **俯瞰整个花园的鸟瞰视角**
- 花园中的不同区域对应管理功能：
  - 花园大门 → 用户管理
  - 花田 → 商品管理
  - 公告板 → 评价管理
  - 气象站 → 推荐配置
  - 账本小屋 → 经营统计
  - 监控塔 → 操作日志
- 数据面板以浮层形式覆盖在场景上
- 统计图表使用花瓣色板配色

------

## 组件设计要求

### 场景系统组件（`src/components/scene/`）

- `GardenScene`：全屏场景容器（管理视差、层级、过渡）

- `SceneLayer`：场景图层组件（接收 `depth` prop，自动计算视差偏移）

- ```
  InteractiveItem
  ```

  ：

  核心组件

   —— 可交互物品包装器

  - Props：`action`（功能标识）、`label`（悬浮标签文字）、`glowColor`（光晕颜色）
  - 内置悬浮动画（放大 + 上浮 + 光晕 + 标签显示）
  - 内置点击动画（脉冲 + 粒子爆开）
  - 内置空闲动画（轻微摇摆，可自定义）
  - 事件：`@activate`（点击触发）

- `SceneTransition`：场景间过渡动画（物品放大展开 / 镜头推进）

- `ParallaxController`：视差控制器（鼠标 + 滚动双重视差）

- `IdleAnimationManager`：空闲动画管理器（协调所有物品的微动画，避免同步）

- `ParticleLayer`：粒子层（花瓣、花粉、萤火虫）

- `SceneCamera`：场景摄像机（控制缩放和平移）

### 花朵 SVG 组件库（`src/components/flowers/`）

9 个 2.5D 风格花朵 SVG 组件（扁平、无描边、渐变填充、多层花瓣）：

`FlowerRose`、`FlowerPeony`、`FlowerSakura`、`FlowerSunflower`、`FlowerLavender`、`FlowerLily`、`FlowerTulip`、`FlowerDaisy`、`FlowerHydrangea`

每个组件支持：

- `size`：尺寸
- `color`：主色
- `bloom`：绽放进度 0-1（GSAP 驱动花瓣展开）
- `sway`：是否启用摇曳动画
- `interactive`：是否启用悬浮/点击交互

### 场景物品 SVG 组件（`src/components/scene-items/`）

- `ItemFlowerStand`：花束展示架（含多朵花）
- `ItemSunflowerField`：向日葵田
- `ItemBasket`：花篮（可显示角标数量）
- `ItemEnvelope`：信封（可打开/关闭）
- `ItemFlorist`：花艺师角色（可挥手）
- `ItemOrderBoard`：订单公告板
- `ItemRegister`：收银台
- `ItemFlowerBed`：花圃
- `ItemGardenHouse`：花店小屋
- `ItemFence`：花园围栏
- `ItemSignpost`：路标牌
- `ItemWateringCan`：浇水壶
- `ItemWheelbarrow`：手推车

### 装饰 SVG 组件（`src/components/decorations/`）

- `DecoButterfly`：蝴蝶（贝塞尔曲线飞行）
- `DecoBee`：蜜蜂（绕圈飞行）
- `DecoLadybug`：瓢虫（爬行）
- `DecoCloud`：云朵（飘移）
- `DecoDewdrop`：露珠（闪烁）
- `DecoPetal`：花瓣（飘落）
- `DecoFirefly`：萤火虫（夜间场景）

### 通用 UI 组件（`src/components/ui/`）

- `GlassPanel`：毛玻璃浮层面板（用于在场景上展示内容）
- `PetalButton`：花瓣形按钮
- `LeafTag`：叶片形标签
- `FlowerRating`：花朵星级
- `StemProgress`：花茎进度条
- `BubbleLabel`：气泡标签（物品悬浮时显示）
- `BloomOverlay`：绽放过渡遮罩

------

## 路由与场景过渡

TypeScript



```
const routes = [
  // 花园场景（消费者端）
  { path: '/', component: GardenHome },
  { path: '/products', component: GardenProducts },
  { path: '/products/:id', component: GardenProductDetail },
  { path: '/cart', component: GardenCart },
  { path: '/checkout', component: GardenCheckout },
  { path: '/payment/:orderId', component: GardenPayment },
  { path: '/orders', component: GardenOrders },
  { path: '/orders/:id', component: GardenOrderDetail },
  { path: '/favorites', component: GardenFavorites },
  { path: '/reviews/my', component: GardenReviews },
  { path: '/profile', component: GardenProfile },
  { path: '/recommendations', component: GardenRecommendations },
  
  // 登录注册（花园门扉场景）
  { path: '/login', component: GardenLogin },
  { path: '/register', component: GardenRegister },
  
  // 店员端（后厨场景）
  { path: '/staff/orders', component: StaffOrders },
  { path: '/staff/orders/:id', component: StaffOrderDetail },
  { path: '/staff/inventory', component: StaffInventory },
  
  // 管理员端（鸟瞰场景）
  { path: '/admin/dashboard', component: AdminDashboard },
  { path: '/admin/users', component: AdminUsers },
  { path: '/admin/products', component: AdminProducts },
  { path: '/admin/reviews', component: AdminReviews },
  { path: '/admin/recommendations', component: AdminRecommendations },
  { path: '/admin/stats', component: AdminStats },
  { path: '/admin/logs', component: AdminLogs },
];
```

**场景过渡动画**（GSAP）：

TypeScript



```
// 从主场景进入商品列表（点击花束展示架）
function transitionToProducts() {
  const tl = gsap.timeline();
  
  // 1. 展示架脉冲放大
  tl.to('.item-flower-stand', { scale: 1.2, duration: 0.2, ease: 'power2.out' });
  
  // 2. 从展示架中心爆开花瓣粒子
  tl.call(() => emitParticles('.item-flower-stand', 'petals', 20));
  
  // 3. 展示架放大铺满屏幕
  tl.to('.item-flower-stand', { 
    scale: 8, opacity: 0, duration: 0.6, ease: 'power2.inOut' 
  });
  
  // 4. 同时其他物品淡出散开
  tl.to('.interactive-item:not(.item-flower-stand)', {
    scale: 0.5, opacity: 0, y: 50, duration: 0.4, stagger: 0.05
  }, '<');
  
  // 5. 场景背景模糊
  tl.to('.garden-scene', { filter: 'blur(20px)', duration: 0.4 }, '<');
  
  // 6. 路由跳转后，新场景从模糊变清晰
  tl.to('.garden-products-scene', { 
    filter: 'blur(0px)', opacity: 1, duration: 0.6 
  });
}
```

------

## Axios 封装

- 请求拦截器：`Authorization: Bearer <token>`
- 响应拦截器：
  - `code === 200`：返回 `data.data`
  - `code !== 200`：场景内弹出花朵风格错误气泡
  - `401`：清除 token，场景过渡到登录
  - `403`：权限提示

API 模块：`api/auth.ts`、`api/products.ts`、`api/cart.ts`、`api/orders.ts`、`api/payments.ts`、`api/reviews.ts`、`api/favorites.ts`、`api/recommendations.ts`、`api/staff.ts`、`api/admin.ts`、`api/dict.ts`、`api/stats.ts`

------

## Pinia Store

- `stores/auth.ts`：token、user、isLoggedIn、角色判断
- `stores/cart.ts`：items、loading、totalCount、totalAmount
- `stores/dict.ts`：options（只加载一次）
- `stores/favorites.ts`：favoriteProductIds、products
- `stores/scene.ts`：当前场景、场景过渡状态、交互物品状态、动画级别
- `stores/garden.ts`：全局花园状态（季节、时间、天气——影响场景外观）

------

## 关键工具函数

- `getProductImage(imageUrl?, category?)`：CSS 渐变 + SVG 花朵占位
- `parseTags(tags?)`：解析逗号分隔标签
- `formatPrice(price)` / `getDiscount(price, originalPrice?)`
- `formatDate(dateStr)` / `formatRelativeTime(dateStr)`
- `getStatusConfig(status)`：状态颜色+图标映射
- `generateBezierPath(start, end, curvature)`：生成贝塞尔曲线（蝴蝶飞行路径）
- `randomInRange(min, max)`：随机数（物品位置/旋转）

------

## 动画规范（GSAP 驱动）

### 物品交互动画

TypeScript



```
// 悬浮进入
function onItemHover(item: string, entering: boolean) {
  const el = `.interactive-item[data-action="${item}"]`;
  gsap.to(`${el} .item-body`, {
    scale: entering ? 1.08 : 1,
    y: entering ? -6 : 0,
    duration: 0.3,
    ease: 'back.out(2)',
  });
  gsap.to(`${el} .item-glow`, {
    opacity: entering ? 0.6 : 0,
    duration: 0.3,
  });
  gsap.to(`${el} .item-label`, {
    opacity: entering ? 1 : 0,
    y: entering ? -10 : 0,
    duration: 0.25,
    delay: entering ? 0.1 : 0,
  });
}

// 点击脉冲
function onItemClick(item: string) {
  const el = `.interactive-item[data-action="${item}"]`;
  gsap.timeline()
    .to(`${el} .item-body`, { scale: 1.2, duration: 0.15, ease: 'power2.out' })
    .to(`${el} .item-body`, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' })
    .call(() => emitParticles(el, 'petals', 15));
}
```

### 空闲微动画

TypeScript



```
// 花朵摇曳（每个花朵随机延迟和幅度）
gsap.to('.deco-flower', {
  rotation: '+=3',
  duration: () => gsap.utils.random(2, 4),
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
  stagger: { each: 0.3, from: 'random' },
});

// 蝴蝶飞行（沿 SVG 路径）
gsap.to('.butterfly', {
  motionPath: { path: '#butterflyPath', align: '#butterflyPath' },
  duration: 12,
  repeat: -1,
  ease: 'none',
});

// 向日葵追光（跟随鼠标）
gsap.to('.sunflower-head', {
  rotation: () => {
    const angle = Math.atan2(mouseY - sunflowerY, mouseX - sunflowerX) * 180 / Math.PI;
    return Math.max(-15, Math.min(15, angle));
  },
  duration: 1,
  ease: 'power2.out',
});
```

### 场景过渡

TypeScript



```
// 镜头推进（滚动驱动）
gsap.to('.scene-camera', {
  scale: 1.15,
  scrollTrigger: {
    trigger: '.garden-scene',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
  },
});

// 场景 morph 过渡
gsap.to('.scene-background', {
  morphSVG: '#nextSceneBackground',
  duration: 1,
  ease: 'power2.inOut',
});
```

------

## 响应式与性能

SCSS



```
$breakpoints: (
  'xl': 1440px,   // 完整场景 + 所有装饰
  'lg': 1024px,   // 简化装饰，减少粒子
  'md': 768px,    // 场景缩放适配，关闭部分动画
  'sm': 576px,    // 简化为卡片式布局（保留场景背景）
);
```

**性能策略**：

- SVG 使用 `will-change: transform` 的图层提升
- 粒子数量根据设备性能动态调整（`stores/scene.ts` 中 `effectLevel`）
- 视口外的物品暂停动画（IntersectionObserver）
- 复杂 SVG 使用 `<use>` 复用
- 移动端关闭鼠标视差，保留滚动视差

------

## 输出要求

请按以下顺序生成完整前端项目代码：

1. **项目配置**：`package.json`（含 gsap、@vueuse/core）、`vite.config.ts`、`tsconfig.json`
2. **全局样式**：`src/styles/` SCSS 变量、重置、场景基础样式、动画关键帧、Element Plus 覆盖
3. **类型定义**：`src/types/` 完整 TypeScript 接口
4. **工具函数**：`src/utils/` 图片占位、格式化、贝塞尔路径、状态映射
5. **API 层**：`src/api/` Axios 封装 + 所有 API 模块
6. **Store 层**：`src/stores/` 所有 Pinia stores（含 scene.ts、garden.ts）
7. **场景系统组件**：`src/components/scene/` 场景容器、图层、可交互物品、过渡、视差
8. **花朵 SVG 组件**：`src/components/flowers/` 9 个 2.5D 花朵
9. **场景物品 SVG 组件**：`src/components/scene-items/` 展示架、花篮、信封、花艺师等
10. **装饰 SVG 组件**：`src/components/decorations/` 蝴蝶、蜜蜂、云朵、花瓣等
11. **通用 UI 组件**：`src/components/ui/` 毛玻璃面板、花瓣按钮、叶片标签等
12. **路由配置**：`src/router/index.ts`
13. **消费者端场景页面**：`src/views/garden/` 主花园、商品花田、详情、购物车、订单、个人中心等
14. **店员端场景页面**：`src/views/staff/` 后厨工作台
15. **管理员端场景页面**：`src/views/admin/` 鸟瞰花园
16. **入口文件**：`App.vue`（含全局场景容器和粒子层）、`main.ts`

**核心要求**：

- 每个文件完整可运行，不用 `// ...省略`
- 所有 API 调用与后端文档完全一致
- **必须实现场景内物品即按钮的交互模式**——这是最核心的创意
- **必须参考 makemepulse 2019 的交互式插画场景风格**
- 所有插画元素用内联 SVG 实现（2.5D 扁平风格，无描边，渐变填充）
- 物品悬浮/点击/空闲三种状态的动画必须完整
- 场景间过渡必须流畅（GSAP 驱动）
- 用户的第一感受应该是「这是一个可以探索的魔法花园」，而不是「这是一个网站」

