# AI 服务本地部署

## 1. 启动 Nacos 与 Qdrant

在项目根目录执行：

```powershell
docker compose -f docker-compose.ai.yml up -d
docker compose -f docker-compose.ai.yml ps
```

访问（仅限本机）：

- Nacos 控制台：http://localhost:8848/nacos （本地关闭鉴权，默认无账号密码）
- Qdrant 控制台：http://localhost:6333/dashboard

`docker-compose.ai.yml` 只把 Nacos/Qdrant 端口绑定到 `127.0.0.1`，不要改成 `0.0.0.0` 暴露到局域网或公网。

停止：

```powershell
docker compose -f docker-compose.ai.yml down
```

保留数据卷，如需清空：

```powershell
docker compose -f docker-compose.ai.yml down -v
```

如果 Docker 不在 PATH 中，请先启动 Docker Desktop，或在 Docker Desktop 的终端中执行上述命令。

## 2. 创建只读 MySQL 账号

```sql
CREATE USER 'flower_ai_ro'@'%' IDENTIFIED BY '替换为强密码';
GRANT SELECT ON flower_shop.* TO 'flower_ai_ro'@'%';
FLUSH PRIVILEGES;
```

`ai-service` 只执行 SELECT，不写业务库。AI 调用日志由主后端写入 `ai_call_log`。

## 3. 配置环境变量

复制 `.env.ai.example` 的内容，按需在 PowerShell 中设置：

```powershell
$env:NACOS_ADDR="127.0.0.1:8848"
$env:NACOS_ENABLED="true"
$env:AI_SERVICE_BIND_ADDRESS="127.0.0.1"
$env:AI_INTERNAL_TOKEN="flower-ai-internal-dev-token"
$env:QDRANT_URL="http://127.0.0.1:6333"
$env:SILICONFLOW_API_KEY="你的硅基流动 Key"
$env:DEEPSEEK_API_KEY="你的 DeepSeek Key"
$env:AI_DB_URL="jdbc:mysql://localhost:3306/flower_shop?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true"
$env:AI_DB_USERNAME="flower_ai_ro"
$env:AI_DB_PASSWORD="你的只读账号密码"
```

`AI_INTERNAL_TOKEN` 示例值仅用于本机开发；服务离开 loopback 前必须替换为强随机值。

主后端同样需要：

```powershell
$env:APP_AI_ENABLED="true"
$env:AI_BASE_URL="http://127.0.0.1:8081"
$env:AI_INTERNAL_TOKEN="flower-ai-internal-dev-token"
```

不要把这些值写入受 Git 跟踪的配置文件。`.env`、`.env.local`、`.env.*.local` 已被 `.gitignore` 忽略。

## 4. 启动服务

先启动主后端：

```powershell
cd backend
mvn spring-boot:run
```

再启动 AI 服务：

```powershell
cd ai-service
mvn spring-boot:run
```

AI 服务默认只绑定 `127.0.0.1:8081`，注册到 Nacos 的服务名为 `flower-ai-service`；不要把它直接暴露到公网。主后端优先通过 Nacos 发现 AI 服务；Nacos 不可用时回退到 `AI_BASE_URL`。

## 5. 验证

```powershell
curl http://localhost:8080/api/ai/status
curl -H "X-AI-Internal-Token: flower-ai-internal-dev-token" http://localhost:8081/internal/ai/health
```

管理员登录后：

- `GET /api/admin/ai/health`
- `POST /api/admin/ai/reindex`
- `GET /api/admin/ai/metrics`

## 6. 常见问题

- Nacos 启动慢：等待健康检查通过后再启动 AI 服务。
- Qdrant 连接失败：确认 `6333` 端口和 `QDRANT_URL`。
- embedding/rerank 失败：检查 SiliconFlow Key、模型名和账户余额。
- AI 服务启动时索引失败：先确认 MySQL 可读、Qdrant 正常，再调用 `POST /api/admin/ai/reindex`。
- 不想启用 AI：设置 `APP_AI_ENABLED=false`，聊天和商家助手会走降级逻辑。
