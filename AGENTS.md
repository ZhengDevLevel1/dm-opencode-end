# Flower Shop Management System (花店管理系统)

## Project overview

- This is a graduation-project flower shop/e-commerce system with a Spring Boot backend (`backend/`) and a React frontend (`frontend/`). Recommendation is the core research feature.
- Frontend scope: customer storefront, product search/filtering, cart/checkout, orders/reviews, staff fulfillment/inventory, admin dashboards, recommendation operations, theming, and a command palette.
- Main business scope: authentication and RBAC, user profiles, product catalog/search, cart, favorites, inventory, orders, mock payment, fulfillment, reviews, after-sales/refunds, operation logs, statistics/dictionaries, and recommendation.
- Roles:
  - `CUSTOMER`: browse products, receive recommendations, manage cart/favorites, place orders, pay, review, and request after-sales.
  - `STAFF`: manage inventory, process orders/fulfillment, and approve or reject after-sales.
  - `ADMIN`: manage users/products, recommendation weights and logs, reviews, operation logs, and system statistics.
- API style: RESTful JSON under `/api`, JWT Bearer authentication, unified `ApiResponse` and `PageResult`, and centralized exception handling.
- API documentation: Springdoc/OpenAPI with Knife4j, normally available at `/doc.html` or `/swagger-ui.html`.

## Tech stack and architecture

- Backend: Java 17, Spring Boot 3.2.3, Maven, Spring MVC, Spring Security, Validation, AOP, MyBatis-Plus 3.5.5, MySQL 8, Redis, JJWT 0.12.5, Knife4j 4.4.0, Lombok, and H2 for automated tests.
- Frontend: React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, React Router 7, TanStack Query 5, Zustand 5, React Hook Form + Zod, Framer Motion, Recharts, and lucide-react. The `@/` alias resolves to `frontend/src/`.
- Modular monolith organized by feature: controllers call services, services use MyBatis-Plus mappers, and each module owns its entities/DTOs.
- Top-level backend packages:
  - `common`: unified API response, pagination, enums, exceptions, utilities.
  - `config`: application properties, security, MyBatis-Plus, OpenAPI, and web configuration.
  - `security`: JWT generation/parsing, authentication filter, token store, and security handlers.
  - `support`: cache service and cache keys.
  - `module`: business modules grouped by feature.
- Business modules:

| Module | Responsibility |
| --- | --- |
| `auth` | Login/logout, JWT issuance, current user |
| `user` | Profile, password change, admin user management |
| `product` | Public catalog/search/filter/detail, admin CRUD and status |
| `inventory` | Manual stock adjustment and stock movement records |
| `cart` | Add/update/remove cart items and quantity validation |
| `favorite` | Favorite/unfavorite products and favorite list |
| `order` | Order creation, cancellation, after-sales, customer/staff queries |
| `payment` | Mock payment creation, idempotent callback, refund status |
| `fulfillment` | Accept order and advance fulfillment nodes to completion |
| `review` | Product reviews, duplicate-review guard, admin reply/moderation |
| `recommendation` | TF-IDF content recommendation, behavior profile, context, weights, logs, persona evaluation |
| `stats` | Sales/order/product/review overview and charts |
| `dict` | Categories, order/payment/fulfillment status options |
| `log` | AOP-based operation log recording and admin query |

## Repository layout

- `backend/`: the Spring Boot application; run Maven commands from this directory.
- `backend/db/`: MySQL `schema.sql` and demo `data.sql`.
- `backend/src/main/java/com/flower/mall/`: production code (`common`, `config`, `security`, `support`, `module`).
- `backend/src/main/resources/`: `application.yml` and logging configuration.
- `backend/src/test/java/` and `backend/src/test/resources/`: H2-backed integration/unit tests and test data.
- `frontend/`: the React/Vite application; run npm commands from this directory.
- `frontend/src/app/`: router, shell, auth/role guards, providers, and navigation config.
- `frontend/src/components/ui/`: shared UI primitives, including `custom-select.tsx` (accessible custom listbox with portal-positioned panel) and `date-picker.tsx` (custom calendar popover).
- `frontend/src/components/domain/`: product, order, review, status, and recommendation business components.
- `frontend/src/pages/`: route pages; `admin/`, `staff/`, and `auth/` hold role-specific screens.
- `frontend/src/lib/`: API client, typed services, query keys, formatting, storage, and permissions.
- `frontend/src/styles/globals.css`: Tailwind v4 theme tokens, palettes, accents, density, and motion settings.
- `frontend/src/types/api.ts`: backend API request/response types.
- `docs/` and `.scratch/`: agent/domain documentation and local issue/spec files.
- `docs/backend-api.md`: complete frontend-oriented REST API reference with request/response schemas.
- `.agents/` and `.opencode/`: local agent skills and configuration.

## Frontend conventions

- Routing and role guards live in `frontend/src/app/router.tsx`; protected pages use `RequireAuth` and `RequireRole`.
- API access goes through `frontend/src/lib/api-client.ts` and `frontend/src/lib/services.ts`; server state uses TanStack Query hooks from `frontend/src/hooks/queries.ts`.
- Styling uses Tailwind v4 semantic tokens from `frontend/src/styles/globals.css` (`bg-card`, `border-border`, `text-muted-foreground`, etc.) instead of raw palette values where possible.
- Filter/sort dropdowns on the product list, smart recommendation, staff inventory, and admin products/users/reviews pages use `frontend/src/components/ui/custom-select.tsx` (`CustomSelect`). It is a fully custom listbox with click-outside close, arrow-key/Enter/Escape navigation, selected check mark, and a spring open animation. Its panel is rendered through a portal with fixed positioning so it is not clipped inside dialogs.
- Admin product/user dialogs use `CustomSelect` with `react-hook-form` via `Controller`; do not use native `register` with it.
- Date filters on staff orders, staff inventory, admin operation logs, and the admin recommendation log use `frontend/src/components/ui/date-picker.tsx` (`DatePicker`), a custom calendar popover with Monday-first grid, month navigation, today/selected states, clear/today actions, keyboard navigation, and outside-click/Escape close.

## Core domain flows

- Authentication: JWT contains user id, username, role, and `jti`. `TokenStore` keeps session validity in Redis when enabled, with an in-memory fallback when Redis is disabled or unavailable.
- Shopping: customers browse/search products, receive recommendations, then add items to cart or favorites. Cart quantity per product is capped at 99 and cannot exceed current stock.
- Order and payment: creating an order deducts stock atomically and writes inventory movements. Mock payment callback moves the order from `PENDING_PAYMENT` to `PAID` and increases sales counts.
- Fulfillment: staff accept a paid order, then advance `ACCEPTED -> PREPARING -> DELIVERING -> SIGNED`; signing completes the order. Illegal node jumps are rejected.
- After-sales/refund: only completed orders can request after-sales. Approval refunds the paid record, restores stock, and decreases sales; rejection returns the order to `COMPLETED`.
- Recommendation: combines TF-IDF/cosine content similarity with purchase/favorite/review behavior, category distribution, favorite tags, festival/season context, popularity, and rating. Cold-start users fall back to festival/season and popularity signals. Admin can adjust four weights and run five-persona Top-10 evaluation.
- Consistency: stock changes use conditional SQL updates; order/payment/cancellation/refund paths invalidate product-detail and hot-product caches after stock or sales changes.

## Data, configuration, and local run

- Main database: MySQL 8 database `flower_shop`. Import `backend/db/schema.sql` then `backend/db/data.sql`; the application does not auto-initialize the main database (`spring.sql.init.mode=never`).
- Default MySQL connection: `localhost:3306/flower_shop`, username `root`, password `123456`; override with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.
- Default server port is `8080`; override with `SERVER_PORT`.
- Redis defaults to `localhost:6379`; disable or avoid depending on it with `APP_REDIS_ENABLED=false` during local development.
- Product-detail and hot-product caches are controlled by `app.cache.*`; recommendation candidate limit is controlled by `app.recommendation.candidate-limit`.
- Run from `backend/` with `mvn spring-boot:run`, or run the packaged jar `backend/target/flower-shop-backend-1.0.0.jar`.
- Run from `frontend/` with Node.js 20+: `npm install`, copy `.env.example` to `.env`, then `npm run dev`. Vite serves `http://localhost:5173` and proxies `/api` to `http://localhost:8080`.
- Frontend environment: `VITE_API_BASE_URL` defaults to `/api`; `VITE_IMAGE_BASE_URL` is optional for product images.
- Tests use H2 with MySQL compatibility mode and `app.redis.enabled=false`; test schema/data live under `backend/src/test/resources`.
- Demo accounts:
  - `admin / admin123`
  - `staff / staff123`
  - `customer / customer123`
  - `alice / alice123`
  - `bob / customer123`
  - `disabled / customer123` (disabled account)
- Demo data highlights: product `15` is off-shelf, product `16` has low stock, orders `1`–`5` cover completed/pending/cancelled/paid states, and review/favorite/weight/log samples are seeded.

## Key API areas

- Public: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/products/**`, `GET /api/recommendations`, `GET /api/reviews/products/**`, `GET /api/dict/**`.
- Customer: `GET/PUT /api/auth/me`, `PUT /api/auth/password`, `POST /api/auth/logout`, `/api/cart/**`, `/api/favorites/**`, `/api/orders/**`, `/api/payments/**`, `POST /api/reviews`, `GET /api/reviews/my`.
- Staff: `/api/staff/orders/**`, `/api/staff/products/{id}/stock`, `GET /api/staff/inventory`.
- Admin: `/api/admin/users/**`, `/api/admin/products/**`, `/api/admin/recommendations/**`, `/api/admin/reviews/**`, `/api/admin/stats/**`, `GET /api/admin/operation-logs`.
- Full frontend-oriented API reference: `docs/backend-api.md`.

## Agent skills

### Issue tracker

Issues and specs live as local Markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Current verification state

- Backend P0+P1 work is complete: recommendation behavior features, five personas, Top-10 metrics, `ALL` season matching, cache invalidation, invalid-season `400`, cart quantity cap, and rounded weight validation.
- `docs/backend-api.md` is complete; its endpoint table was checked against the source: 65 source endpoints and 65 documented endpoints match with no extras or omissions.
- `mvn -s "C:\Users\28408\AppData\Local\Temp\opencode\settings-central.xml" -B -ntp clean test` passes 25/25 tests.
- Run `mvn -s "C:\Users\28408\AppData\Local\Temp\opencode\settings-central.xml" -B -ntp -DskipTests package` to build `backend\target\flower-shop-backend-1.0.0.jar`.
- Frontend `npm run typecheck`, `npm run lint`, and `npm run build` pass. Lint reports 5 pre-existing `react-refresh/only-export-components` warnings (no errors).

## Remaining uncovered items

- Location dimension is not modeled. `RecommendationQuery.scene` is accepted but does not affect recommendation results.
- No smoke test has been run against a real MySQL 8 + Redis instance; automated tests use H2 with Redis disabled.
- The frontend has no automated test suite; verification is currently `npm run typecheck`, `npm run lint`, and `npm run build`.
- Changes are not committed to Git.
