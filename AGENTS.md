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

- Backend: Java 17, Spring Boot 3.2.3, Maven, Spring MVC, Spring Security, Validation, AOP, Spring Mail (QQ SMTP), MyBatis-Plus 3.5.5, MySQL 8, Redis, MinIO, JJWT 0.12.5, Knife4j 4.4.0, Lombok, and H2 for automated tests.
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
| `auth` | Login/logout, JWT issuance, current user, email verification codes for login/registration/password change/email change |
| `user` | Profile, password change, admin user management |
| `product` | Public catalog/search/filter/detail, admin CRUD and status |
| `inventory` | Manual stock adjustment and stock movement records |
| `cart` | Add/update/remove cart items and quantity validation |
| `favorite` | Favorite/unfavorite products and favorite list |
| `order` | Order creation, cancellation, after-sales, customer/staff queries |
| `payment` | Mock payment creation, idempotent callback, refund status |
| `fulfillment` | Accept order and advance fulfillment nodes to completion |
| `review` | Product reviews, duplicate-review guard, admin reply/moderation |
| `recommendation` | TF-IDF content recommendation, behavior profile, scene-aware weights and diversity, seed-similar product recommendations, catalog ranking, context, logs, persona evaluation |
| `stats` | Sales/order/product/review overview and charts |
| `dict` | Categories, order/payment/fulfillment status options |
| `log` | AOP-based operation log recording and admin query |
| `file` | MinIO image upload for avatars, product images, and appearance backgrounds |
| `appearance` | Global login/register background (none/gradient/image) + mask/blur/card opacity (public read, admin write) |

## Repository layout

- `backend/`: the Spring Boot application; run Maven commands from this directory.
- `backend/db/`: `flower_shop.sql` one-shot init (full schema + demo data), plus incremental migration SQL files for existing databases.
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
- API access goes through `frontend/src/lib/api-client.ts` and `frontend/src/lib/services.ts`; server state uses TanStack Query hooks from `frontend/src/hooks/queries.ts`, and mutations invalidate related keys through `frontend/src/lib/query-invalidation.ts`.
- Lazy route modules are registered in `frontend/src/app/route-loaders.ts` and preloaded on nav hover/focus; the auth store hydrates a cached user immediately and revalidates `/api/auth/me` in the background so authenticated refreshes do not flash the login page.
- Styling uses Tailwind v4 semantic tokens from `frontend/src/styles/globals.css` (`bg-card`, `border-border`, `text-muted-foreground`, etc.) instead of raw palette values where possible.
- Filter/sort dropdowns on the product list, smart recommendation, staff inventory, and admin products/users/reviews pages use `frontend/src/components/ui/custom-select.tsx` (`CustomSelect`). It is a fully custom listbox with click-outside close, arrow-key/Enter/Escape navigation, selected check mark, and a spring open animation. Its panel is rendered through a portal with fixed positioning so it is not clipped inside dialogs.
- Admin product/user dialogs use `CustomSelect` with `react-hook-form` via `Controller`; do not use native `register` with it.
- Address dialogs use cascading, searchable province/city/district `CustomSelect`s backed by `frontend/src/lib/china-regions.ts`, which normalizes `frontend/src/lib/china-regions-data.ts` (31 mainland provinces generated from [modood/Administrative-divisions-of-China](https://github.com/modood/Administrative-divisions-of-China), WTFPL). City and district selects stay disabled until their parent is chosen, and changing a parent clears its descendants. Municipalities (北京市/天津市/上海市/重庆市) use the municipality name as the city and merge their `市辖区`/`县` districts under it; legacy `市辖区`/`县` city values normalize to the municipality. `CustomSelect` exposes optional `searchable`/`searchPlaceholder`: the panel gets an auto-focused search input, filters option labels as you type, shows all options when empty, resets the query on open, and supports ArrowUp/ArrowDown/Enter/Escape from the search field; other selects remain non-searchable.
- Date filters on staff orders, staff inventory, admin operation logs, and the admin recommendation log use `frontend/src/components/ui/date-picker.tsx` (`DatePicker`), a custom calendar popover with Monday-first grid, month navigation, today/selected states, clear/today actions, keyboard navigation, and outside-click/Escape close.
- Image uploads use `frontend/src/components/domain/image-upload.tsx` (`ImageUpload`), which posts multipart files through `fileService.uploadImage`, preloads the returned MinIO URL, and falls back to the provided placeholder when the URL is empty or broken. Pass `preview={false}` when a dedicated preview panel is shown above the uploader (both background sections do this).
- Address book pages use `frontend/src/components/domain/address-dialog.tsx`, `amap-location-picker.tsx`, and `delivery-map.tsx`; map loading lives in `frontend/src/lib/amap.ts` and requires `VITE_AMAP_KEY` plus `VITE_AMAP_SECURITY_CODE` in `frontend/.env` (ignored by Git). The picker degrades to manual province/city/district/detail entry when geocoding fails; checkout selects from `useAddressesQuery` and sends `addressId` plus a snapshot, while staff order detail renders `DeliveryMap` from order coordinates. The checkout address area filters by label/receiver/phone/full address and caps the card list with an internal scrollbar; product-detail `立即购买` adds the item and navigates straight to `/checkout?items=<cartItemId>` instead of the cart.
- The map picker has a default-off `自动跳转地标` switch. When enabled, a map pick reverse-geocodes the point and forward-geocodes the derived detail to snap the marker to the nearest landmark; when disabled, the marker stays at the clicked point. The preference is account-level via `GET/PUT /api/auth/preferences/map` (stored in `user_theme_preference.map_snap_to_landmark`), so all address dialogs and browsers share the same setting for that account while other accounts stay isolated; `frontend/src/lib/map-preferences.ts` keeps a per-user localStorage first-paint cache, but the server value wins. `normalizeRegionParts` in `china-regions.ts` fills missing districts from AMap township/street data (e.g., 东莞市/中山市) and maps province-direct county-level cities under the dataset's `省直辖县级行政区划` group.
- AMap uses the JS API key only (not a Web-service/REST key). Load `AMap.Geocoder` through the `plugin=AMap.Geocoder` script parameter; when a key was created after 2021-12-02, `VITE_AMAP_SECURITY_CODE` must match it or map tiles/geocoding fail with `INVALID_USER_KEY`.
- Theme appearance (including `componentOpacity`, which fades card/popover surfaces via `--ui-surface-opacity`, `fontFamily`, which switches the `--font-sans` / `--font-display` system stacks via `data-font`, and `fontSize`, which scales the root `html` size via `--font-scale`) is stored in `localStorage`; the login/register background, its mask opacity, blur, login card opacity, surface palette, accent color, font family, and font size are server-side and configurable only by admins on the settings page's `登录页外观风格` tab (debounced auto-save after slider drags). `AuthLayout` renders the image full-screen for both auth pages and wraps them in `AuthThemeScope`, which scopes the admin-selected palette/accent/font via `data-palette`/`data-accent`/`data-font` without touching the visitor's local theme; `html.auth-route` plus `--auth-font-scale` applies the auth-only font size. Font presets (`default`/`serif`/`rounded`/`kai`) use local system font stacks and live in `globals.css`; legacy six-font values (`sans`/`round`/`hand`/`decol`/`pixel`) normalize to `default`/`rounded`/`kai`/`serif`/`default`.

## Core domain flows

- Authentication: JWT contains user id, username, role, and `jti`. `TokenStore` keeps session validity in Redis when enabled, with an in-memory fallback when Redis is disabled or unavailable.
- Account identity: `sys_user.email` is trimmed/lowercased and enforced unique by `uk_user_email`; registration, admin create/update, profile updates, and email-code scenes return `409/1009` on duplicates. JWT authentication uses `UserDetailsServiceImpl`'s 30-second per-user cache, evicted on password, role, status, email, nickname, or avatar changes.
- Shopping: customers browse/search products, receive recommendations, then add items to cart or favorites. Cart quantity per product is capped at 99 and cannot exceed current stock.
- Address book: customers keep up to 10 addresses (first becomes default; exactly one default per user; deleting the default promotes the most recently updated remaining address). Creating an order with `addressId` validates ownership and snapshots receiver name/phone/full address/GCJ-02 coordinates, overriding client values.
- Order and payment: creating an order deducts stock atomically and writes inventory movements. Mock payment callback moves the order from `PENDING_PAYMENT` to `PAID` and increases sales counts.
- Fulfillment: staff accept a paid order, then advance `ACCEPTED -> PREPARING -> DELIVERING -> SIGNED`; signing completes the order. Illegal node jumps are rejected.
- After-sales/refund: only completed orders can request after-sales. Approval refunds the paid record, restores stock, and decreases sales; rejection returns the order to `COMPLETED`.
- Recommendation: combines TF-IDF/cosine content similarity with purchase/favorite/review behavior, category distribution, favorite tags, festival/season context, popularity, and rating. Scenes (`home`, `catalog`, `recommendations`, `product`, `garden`) control effective weights, behavior confidence, category diversity, and reason labels; `product` requires `productId` and excludes the seed while blending seed 0.75 / behavior 0.25. Cold-start users fall back to festival/season and popularity signals. Admin can adjust per-scene weights and a global fallback weight, and run five-persona Top-10 evaluation. `GET /api/products?sort=recommend` reuses the catalog scene for default public product sorting (disabled for keyword searches; admin/staff lists keep explicit sorts). Recommendation catalog snapshots and user behavior profiles are cached in-process for 30 seconds by default (`app.recommendation.product-cache-seconds` / `behavior-cache-seconds`); catalog invalidates on product, inventory, order, payment, and review changes, while behavior profiles invalidate on favorites, orders, payment, and reviews.
- Consistency: stock changes use conditional SQL updates; order/payment/cancellation/refund paths invalidate product-detail and hot-product caches after stock or sales changes. When a write runs inside a transaction, cache evictions are deferred until commit so rollbacks never expose a cache miss for unchanged data.
- Image upload: authenticated users post JPG/PNG/WEBP/GIF files (max 5MB) with category `avatar/product/background`; `FileStorageService` stores objects in MinIO and returns a public URL. Avatar URL persists in `sys_user.avatar_url`, product images in `product.image_url`, and background images stay in theme localStorage.

## Data, configuration, and local run

- Main database: MySQL 8 database `flower_shop`. Import `backend/db/flower_shop.sql` for a complete fresh install; the application does not auto-initialize the main database (`spring.sql.init.mode=never`).
- Default MySQL connection: `localhost:3306/flower_shop`, username `root`, password `1234`; override with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.
- Default server port is `8080`; override with `SERVER_PORT`.
- Redis defaults to `localhost:6379`; disable or avoid depending on it with `APP_REDIS_ENABLED=false` during local development.
- Product-detail and hot-product caches are controlled by `app.cache.*`; recommendation candidate limit is controlled by `app.recommendation.candidate-limit`, and the public `sort=recommend` catalog scan cap by `app.recommendation.catalog-scan-limit` (default 500). Recommendation catalog and behavior caches default to 30 seconds via `app.recommendation.product-cache-seconds` / `behavior-cache-seconds`. Tag options and authenticated-user details use process-local caches invalidated by writes (user cache TTL 30 seconds).
- MinIO uploads are controlled by `app.minio.*`; set `MINIO_ENABLED=true` and configure `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, and optionally `MINIO_PUBLIC_URL`. The backend auto-creates the bucket by default (`MINIO_AUTO_CREATE_BUCKET=true`) and applies a public-read policy (`MINIO_PUBLIC_READ=true`); the bucket must still be publicly reachable or fronted by a public CDN URL.
- Email verification codes use Spring Mail over QQ SMTP (`smtp.qq.com`); set `MAIL_USERNAME` and `MAIL_PASSWORD` (authorization code), and override `MAIL_HOST`/`MAIL_PORT` if needed. Codes are held in memory for 5 minutes with a 60-second resend interval and 5 failed attempts per code; expired entries are also purged every 10 minutes by a scheduled task. `POST /api/auth/email-code` supports `scene=LOGIN|REGISTER|CHANGE_PASSWORD|CHANGE_EMAIL`; password changes accept either the old password or a `CHANGE_PASSWORD` code, and changing the email requires a `CHANGE_EMAIL` code sent to the new address. SMTP credentials are intentionally not committed; rotate the QQ SMTP authorization code manually and supply `MAIL_PASSWORD` through the environment.
- Set `JWT_SECRET` (at least 32 bytes) for stable sessions; when omitted the backend generates a temporary key at startup, so existing tokens are invalidated on restart.
- Existing MySQL installations need the incremental SQL files under `backend/db/`; the current font preset/size change adds `user_theme_preference.font_family` / `font_size` and `appearance_setting.auth_font_family` / `auth_font_size` via `backend/db/migration_20261115_add_font_family.sql` followed by `backend/db/migration_20261115_font_presets_and_size.sql` (skip the first if it was already applied). Address book and order coordinates use `backend/db/migration_20261116_add_address_book.sql`. The account-level map picker preference uses `backend/db/migration_20261118_add_map_snap_preference.sql`. Fresh installs get all current columns from `flower_shop.sql`.
- Run from `backend/` with `mvn spring-boot:run`, or run the packaged jar `backend/target/flower-shop-backend-1.0.0.jar`.
- Run from `frontend/` with Node.js 20+: `npm install`, copy `.env.example` to `.env`, then `npm run dev`. Vite serves `http://localhost:5173` and proxies `/api` to `http://localhost:8080`.
- Frontend environment: `VITE_API_BASE_URL` defaults to `/api`; `VITE_IMAGE_BASE_URL` is optional for product images; `VITE_AMAP_KEY` and its matching `VITE_AMAP_SECURITY_CODE` are required for AMap rendering/geocoding and must be supplied through ignored `frontend/.env` (no key is committed).
- Tests use H2 with MySQL compatibility mode, `app.redis.enabled=false`, and `app.minio.enabled=false`; test schema/data live under `backend/src/test/resources`.
- Demo accounts:
  - `admin / admin123`
  - `staff / staff123`
  - `customer / customer123`
  - `alice / alice123`
  - `bob / customer123`
  - `disabled / customer123` (disabled account)
- Demo data highlights: product `15` is off-shelf, product `16` has low stock, orders `1`–`5` cover completed/pending/cancelled/paid states, and review/favorite/weight/scene-weight/log samples are seeded.

## Key API areas

- Public: `POST /api/auth/login`, `POST /api/auth/login/email`, `POST /api/auth/email-code`, `POST /api/auth/register`, `GET /api/products/**`, `GET /api/recommendations`, `GET /api/reviews/products/**`, `GET /api/dict/**`, `GET /api/appearance/auth-background`.
- Customer: `GET/PUT /api/auth/me`, `PUT /api/auth/password`, `POST /api/auth/logout`, `POST /api/files/images`, `/api/addresses/**`, `/api/cart/**`, `/api/favorites/**`, `/api/orders/**`, `/api/payments/**`, `POST /api/reviews`, `GET /api/reviews/my`.
- Staff: `/api/staff/orders/**`, `/api/staff/products/{id}/stock`, `GET /api/staff/inventory`.
- Admin: `/api/admin/users/**`, `/api/admin/products/**`, `/api/admin/recommendations/**` (including `GET/PUT /api/admin/recommendations/scene-weights`), `/api/admin/reviews/**`, `/api/admin/stats/**`, `GET /api/admin/operation-logs`, `PUT /api/admin/appearance/auth-background`.
- Full frontend-oriented API reference: `docs/backend-api.md`.

## Agent skills

### Issue tracker

Issues and specs live as local Markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Current verification state

- Backend P0+P1 work is complete: recommendation behavior features, five personas, Top-10 metrics, `ALL` season matching, cache invalidation, invalid-season `400`, cart quantity cap, and rounded weight validation.
- Image upload work is complete: MinIO storage service, `/api/files/images`, `sys_user.avatar_url`, and frontend avatar/product/background pickers with broken-URL fallbacks. A local MinIO smoke test passed for all three upload categories, public URL fetch, and avatar update/clear through `PUT /api/auth/me`.
- Email verification code work is complete: Spring Mail/QQ SMTP configuration, `POST /api/auth/email-code`, `POST /api/auth/login/email`, registration email-code validation, 5-minute TTL, 60-second resend interval, and matching login/register UI components. Account security also supports changing the password with a `CHANGE_PASSWORD` code sent to the bound email, and the profile page requires a `CHANGE_EMAIL` code sent to the new address before changing the email.
- Tag management work is complete: `CATEGORY` tags are the single source for product categories, admins can manage category tags, and the tag page configures home category/scene visibility and order (`homeCategories` / `homeOccasions`).
- Scene-aware recommendation work is complete: `RecommendationScene`/`RecommendationMode`, per-scene weight table and admin API, scene-specific confidence/diversity/reasons, product-detail seed-similar recommendations, default public catalog `sort=recommend`, and frontend scene/admin/product/home integration.
- Font preset and size work is complete: personal `fontFamily` and admin-managed auth `fontFamily` use four system-font presets (`default`/`serif`/`rounded`/`kai`) via `data-font`, with 12–20px font-size sliders and reset buttons in both appearance sections, scoped login-page font size via `html.auth-route`, and `backend/db/migration_20261116_restore_four_font_families.sql` for existing six-font databases.
- Security/cache hardening is complete: email uniqueness, 30-second JWT user cache with write eviction, recommendation catalog/behavior caches, tag option cache, scheduled token/code/cache cleanup, and transaction-deferred cache eviction.
- Address book work is implemented: `user_address` schema, seeded demo addresses, address CRUD/default APIs, order address/coordinate snapshots, customer address page, checkout address selection, AMap picker, and staff delivery map. `AddressBookIntegrationTest` covers ownership, default lifecycle, 10-address limit, order snapshots, staff coordinate reads, and cross-user rejection.
- `docs/backend-api.md` is complete; its endpoint table was checked against the source: 92 source endpoints and 92 documented endpoints match with no extras or omissions.
- `backend/db/flower_shop.sql` was re-imported after the address-book changes into a scratch MySQL 8 database successfully: 20 tables, 6 users, 16 products, 5 orders with delivery coordinates, 3 seeded addresses, and all four `font_family`/`font_size` columns with `default`/`14` defaults; the scratch database was dropped afterward.
- `mvn -B -ntp clean test` passes 70/70 tests (including address book, appearance background palette/accent/font/size, auth email-code, tag home-display, email uniqueness, user access cache, cache eviction after commit, recommendation engine/ranking, scene weights with refreshed timestamps, product seed recommendations, sold-out auto-off-shelf, and map preference default/save/isolation/validation/theme-preservation integration tests).
- Run `mvn -B -ntp -DskipTests package` to build `backend\target\flower-shop-backend-1.0.0.jar`.
- Frontend `npm run typecheck`, `npm run lint`, and `npm run build` pass. Lint reports 6 `react-refresh/only-export-components` warnings (no errors).
- A 26-route Edge headless smoke passed on 2026-11-16 against the MySQL-backed backend and Vite dev server: home, products, product detail, recommendations, login, register, customer cart/checkout/orders/order detail/reviews/favorites/profile/settings, staff orders/order detail/inventory, and admin dashboard/products/tags/metrics/users/reviews/recommendations/logs/board. It also verified command palette Ctrl+K open/Escape close and authenticated refresh staying on `/orders`; no JS console errors or API 5xx responses (a dead MinIO demo background image URL was ignored as an environment asset failure). After the scene-recommendation work, a focused Edge smoke passed for default catalog recommend sort, product-detail seed-similar cards, the recommendations page, and the admin scene-weight tab (4 scenes, 16 sliders, save initially disabled, editing enables save, save persists, no console errors or API 5xx). The earlier smoke caught and fixed duplicate occasion/festival tag keys on staff inventory. After the four-font rollback, a direct API smoke passed for `rounded`/`kai` preservation in auth and personal settings and legacy `sans` returning `400`, with demo rows restored. A focused Edge check passed for all four previews, all four switches updating root `data-font` and computed body font, the 12–20px font-size slider, scoped login-page `data-font="rounded"` rendering, no Google Fonts links or font faces, and no console errors or API 5xx.
- Address page smoke passed for route rendering, dialog open, AMap script + map container load, map click coordinate capture, address create with Chinese text, and cleanup via API. A full address-flow Edge smoke passed 8/8 for the address route/seeded cards, checkout address selector/default/submit button, staff delivery-map heading/container/coordinates, and cart cleanup with no console or page errors; the loader sets high fetch priority to avoid headless CDN stalls and times out after 15 seconds, degrading to manual entry. With a local ignored `frontend/.env` supplying a JS API key plus its matching `securityJsCode`, the staff map rendered tiles and `AMap.Geocoder` returned `status:"complete"`; no key is committed.
- Address region dropdowns passed an Edge smoke on 2026-11-17: the edit dialog displayed `上海市/上海市/徐汇区`, a new address had disabled city/district until their parents were chosen, `浙江省 → 杭州市 → 西湖区` saved with the correct province/city/district and was cleaned up via API, and data checks passed for 上海市 (16 districts) and 重庆市 (38 merged districts) with no console/page errors. Useful behavior includes automatic city normalization for municipalities and preserving legacy values not present in the dataset as extra options. A follow-up searchable-select smoke passed: the panel search input auto-focused, `浙` filtered the province list to 浙江省, clearing restored all 32 entries, `上海` filtered the city list, Enter selected the highlighted option, `徐` filtered to 徐汇区, the dialog stayed open throughout, the non-searchable product category select still opened/closed without a search input, and there were no console/page errors.
- Map picker snap/district smoke passed on 2026-11-18 against the MySQL-backed backend and Vite dev server with a local ignored AMap JS key: the switch started off and the marker stayed at the clicked point (hint `已选点`), enabling it produced `已自动跳转至最近地标` and moved the marker, disabling it restored click behavior, and a 东莞市 pick filled district `南城街道` (36 district/town options, `normalizeRegionParts` check passed). A 仙桃市 pick (province-direct county; AMap returns an empty city) filled city `省直辖县级行政区划` and district `仙桃市`, and helper checks passed for 济源市/五指山市. The snap preference persisted across create/reopen/edit dialogs.
- Map preference is now account-level via `GET/PUT /api/auth/preferences/map` (default `false`, stored in `user_theme_preference.map_snap_to_landmark`), so it survives browser/device changes; localStorage `flower.map.snapToLandmark.<userId>` is only a first-paint cache and the server value wins. A focused Edge smoke passed 9/9: customer started off, toggling on reached the server, clearing localStorage and reloading restored the switch from the server, alice started off and toggled independently without changing customer, and customer was restored on re-login; no console/page errors. The local `flower_shop` migration was applied and the backend restarted from Maven on port 8080 for the check.
- Product-detail buy-now and checkout address-search smoke passed on 2026-11-18: `立即购买` went directly to `/checkout?items=<cartItemId>`, the address list showed `7/7` inside a 252px scroll viewport (491px content), search filtered `5/7` by receiver name, Enter did not submit the order form, clearing restored all addresses, and there were no console/page errors. The probe cleaned up its temporary addresses and cart item.

## Remaining uncovered items

- Location dimension is not modeled. Scene-aware recommendation is implemented; `scene=product` requires `productId`, and public `sort=recommend` catalogs are capped by `app.recommendation.catalog-scan-limit`.
- AMap rendering/geocoding requires a configured JS API key plus its matching security code in ignored `frontend/.env`; no key is committed. Map tiles, marker picking, reverse geocoding, and address save were verified with local configuration; without it the UI degrades to manual entry. AMap coordinate selection uses GCJ-02 but no server-side geofencing or delivery-radius validation exists.
- MinIO upload has been manually smoke-tested against local MySQL and MinIO; automated tests still use H2 with Redis and MinIO disabled. Redis-backed caching/session behavior and multi-instance cache invalidation remain uncovered, and the recommendation/tag/user caches are process-local.
- Email-code integration tests mock `JavaMailSender`; real QQ SMTP delivery and authorization-code rotation still need a manual check with valid network access.
- The frontend has no automated test suite; verification is currently `npm run typecheck`, `npm run lint`, `npm run build`, and the manual Edge headless smoke.
- Changes are not committed to Git.
