# Coin Backend (NestJS)

A clean, modular backend for an Instagram-like platform, built with [NestJS](https://nestjs.com/), Prisma, and PostgreSQL.

---

## 📁 Project Structure

```
coin_backend/
  src/
    common/
      dto/                # Shared DTOs (e.g., ApiResponse)
      interceptors/       # Global interceptors (e.g., response formatting)
      s3.util.ts          # S3 upload utility
    post/
      dto/                # Post feature DTOs
      post.controller.ts  # Post API endpoints
      post.service.ts     # Post business logic
      post.module.ts      # Post module
    user/
      user.controller.ts  # User API endpoints
      user.service.ts     # User business logic
      user.module.ts      # User module
    auth/
      jwt.strategy.ts     # JWT authentication strategy
      jwt-auth.guard.ts   # JWT guard for route protection
      ...
    prisma/
      prisma.service.ts   # Prisma client provider
      prisma.module.ts    # Prisma module
    main.ts               # App bootstrap
    app.module.ts         # Root module
    ...
  prisma/
    schema.prisma         # Prisma schema
    migrations/           # DB migrations
  test/                   # E2E tests
  package.json
  tsconfig.json
  ...
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in `coin_backend/` with:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_bucket_name
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=your_verified_email
```

### 3. Run Migrations & Generate Prisma Client

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start the Server

```bash
npm run start:dev
```

---

## 🛡️ Features

- **User Registration & Auth** (email, Google, Twitter, wallet)
- **JWT Authentication** (with guards)
- **Profile Management** (with S3 image upload)
- **Post CRUD** (text, images, soft delete)
- **Global Response Formatting**
- **DTO Validation** (class-validator)
- **Clean, modular structure**

---

## 🧑‍💻 API Endpoints

- `/auth/*` — Authentication
- `/user/*` — User management
- `/post/*` — Post creation, listing, deletion

All endpoints return a standard response:

```json
{
  "statusCode": 200,
  "success": true,
  "data": { ... }
}
```

---

## 📝 Conventions

- **Edit only `.ts` files in `src/`**
- **Compiled files are in `dist/`**
- **DTOs are in `dto/` folders**
- **Shared code is in `common/`**

---

## 🧹 Cleaning Up

To remove stray `.js`/`.d.ts` files from `src/` (if any):

```powershell
Get-ChildItem -Path ./coin_backend/src -Include *.js,*.d.ts -Recurse | Remove-Item
```

---

## 📚 More

- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Class Validator](https://github.com/typestack/class-validator)

---

## 🏗️ Extending

- Add new features in their own folders (with `dto/` for validation)
- Use the shared S3 utility for any image upload
- Protect routes with `JwtAuthGuard` as needed

---

## License

MIT
