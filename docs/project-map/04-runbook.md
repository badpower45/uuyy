# 04) Runbook

## Prerequisites
- Node.js حديث
- `pnpm`
- PostgreSQL + `DATABASE_URL`

## Install
```bash
pnpm install
```

## Typecheck (root)
```bash
pnpm run typecheck
```

## API Server (dev)
```bash
pnpm --filter @workspace/api-server run dev
```

## Mobile App (dev)
```bash
pnpm --filter @workspace/mobile run dev
```

## DB Push (Drizzle)
```bash
pnpm --filter @workspace/db run push
```

## Seed demo data
```bash
pnpm --filter @workspace/scripts run seed
```

## Regenerate API client/schemas
```bash
pnpm --filter @workspace/api-spec run codegen
```

## Build all
```bash
pnpm run build
```

## Debug Checklist (quick)
1. API شغالة وعلى نفس الـ base URL المتوقع.
2. `DATABASE_URL` متظبط قبل أي DB command.
3. بعد تعديل API contract: codegen ثم typecheck.
4. راجع `AppContext` لو فيه سلوك غريب في order flow.
