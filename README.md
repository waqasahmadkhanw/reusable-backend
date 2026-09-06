# MERN Reusable Backend Template

Production-oriented Node.js + Express + MongoDB backend template for building **LMS, E-commerce, SaaS, CRM, ERP, Hospital, Donation, Booking, Portfolio and other MERN applications**.

The business/domain modules have intentionally been removed. The remaining code is reusable infrastructure.

## Included reusable modules

- Authentication: register, login, logout, refresh token, password change/reset
- Dynamic roles and permissions
- Admin user management
- Profile + avatar management
- Cloudinary media management
- Email service + reusable email templates
- Google ID-token verification service
- Notifications
- Announcements
- Calendar/events
- Audit logs
- Application settings
- Generic orders
- Generic coupons
- Generic payments
  - Stripe
  - EasyPaisa
  - JazzCash
  - Free/manual payment state
- Stripe webhook
- EasyPaisa confirmation endpoint
- JazzCash return endpoint
- Refund support for Stripe and EasyPaisa
- Security middleware: Helmet, CORS, HPP, rate limiting
- Centralized API error/response/async-handler utilities
- Generic pagination/filter helper
- Environment-based configuration

## Intentionally removed

The old backend was an LMS application. The following domain-specific modules were removed from this template:

- Courses
- Lessons
- Quizzes and quiz attempts
- Assignments and submissions
- Enrollments
- Certificates/PDF generation
- Course categories
- Course discussions
- Course reviews
- Instructor earnings
- Instructor payouts
- LMS dashboards/analytics
- LMS-specific admin/instructor/student logic

This keeps the template domain-neutral.

## CI & security checks

GitHub Actions runs tests, JavaScript syntax checks, dependency vulnerability auditing, and pull-request dependency review. Dependabot is configured for npm packages and GitHub Actions. See `PHASE_13_CI_SECURITY.md` for the security baseline and lockfile reproducibility note.

## Recommended architecture

```text
Request
  ↓
Route
  ↓
Middleware (auth / role / permission / validation)
  ↓
Controller
  ↓
Service (external API or reusable business operation)
  ↓
Model / MongoDB
  ↓
ApiResponse
```

Business modules can be added without changing the reusable infrastructure.

Example:

```text
src/
├── controllers/        # HTTP request/response logic
├── models/             # MongoDB schemas
├── routes/             # API endpoints
├── middlewares/        # auth, upload, validation
├── validators/         # reusable request rules
├── service/            # third-party integrations + reusable services
├── webhooks/           # payment callbacks
├── config/             # third-party configuration
├── constants/          # permissions
├── templates/          # email templates
├── utils/              # API/error/cloud helpers
└── db/                 # MongoDB connection
```

## Adding a new business module

For example, for a CRM:

```text
models/customer.model.js
controllers/customer.controller.js
routes/customer.routes.js
validators/customer.validator.js
```

For an E-commerce application:

```text
models/product.model.js
controllers/product.controller.js
routes/product.routes.js
```

The payment layer already works with generic `Order` items:

```js
{
  itemId,
  itemType,
  name,
  price,
  quantity
}
```

### Important payment/pricing rule

The reusable order service is designed to receive **server-validated item prices**.

Do not trust product prices sent directly by the browser.

Your domain module should:

1. Receive product/item IDs from the client.
2. Load the real records from MongoDB.
3. Calculate the authoritative prices on the server.
4. Call `createOrderFromItems(...)`.
5. Let `/api/payments/*` create the gateway checkout from the saved order.

Example:

```js
import { createOrderFromItems } from "../service/order.service.js";

const items = products.map((product) => ({
  itemId: product._id,
  itemType: "Product",
  name: product.name,
  price: product.price,
  quantity: requestedQuantity,
}));

const order = await createOrderFromItems({
  customerId: req.user._id,
  items,
  currency: "USD",
});
```

## Payment flow

```text
Business Module
      ↓
Server validates items + prices
      ↓
Order created
      ↓
POST /api/payments/stripe/checkout
      OR
POST /api/payments/easypaisa/checkout
      OR
POST /api/payments/jazzcash/checkout
      ↓
Payment Gateway
      ↓
Webhook / Return / Confirmation
      ↓
Payment = completed
      ↓
Order = paid/completed
```

Stripe webhook registration is deliberately before `express.json()` because Stripe signature verification requires the raw request body.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Create the first admin:

```bash
npm run seed:admin
```

Synchronize MongoDB indexes:

```bash
npm run db:sync-indexes
```

## Environment

Copy `.env.example` to `.env` and configure:

- MongoDB
- JWT secrets
- CORS origins
- SMTP
- Cloudinary
- Google OAuth
- Stripe
- EasyPaisa
- JazzCash

Never commit `.env`.

## API documentation

The OpenAPI 3.1 contract is available at:

```text
/api/docs
/api/docs/openapi.json
```

Import the JSON contract into Swagger UI, Postman, Insomnia, or another OpenAPI-compatible client.

## API base

```text
/api/user
/api/profile
/api/users
/api/roles
/api/settings
/api/media
/api/notifications
/api/announcements
/api/events
/api/audit-logs
/api/orders
/api/coupons
/api/payments
/health
```

## Payment endpoints

```text
POST /api/payments/stripe/checkout
POST /api/payments/easypaisa/checkout
POST /api/payments/easypaisa/webhook
POST /api/payments/jazzcash/checkout
ALL  /api/payments/jazzcash/return

GET  /api/payments/me
GET  /api/payments
GET  /api/payments/:id
POST /api/payments/:id/refund

POST /api/webhooks/stripe
```

## Notes

- `admin` is retained as the built-in superuser role.
- Other roles are dynamic strings; examples can be `user`, `manager`, `agent`, `doctor`, `seller`, `customer`, etc.
- Permissions are centralized in `src/constants/permissions.js`.
- Add domain-specific permissions when your application grows.
- The payment gateway credentials and callback URLs are environment driven.

## API contract validation
The OpenAPI 3.1 contract is continuously checked against registered Express routes. Run `npm run api:contract:check` locally, or `npm run quality` for the complete quality/security gate.

## V3 hardening
Payment attempts are idempotency/race hardened, coupon usage is tracked per customer, RBAC is dynamic, media privacy is enforced, and production environment validation is enabled.

## Error Handling

API failures use a consistent envelope with `statusCode`, `success`, `data: null`, `message`, and optional `errors`/`requestId`. Unexpected production errors are intentionally generic while request IDs remain available for correlation.
