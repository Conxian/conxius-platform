FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/admin-dashboard/package.json ./services/admin-dashboard/package.json
RUN pnpm --version && pnpm install --frozen-lockfile --filter admin-dashboard...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/admin-dashboard/node_modules ./services/admin-dashboard/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/admin-dashboard ./services/admin-dashboard
RUN pnpm --filter admin-dashboard build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/services/admin-dashboard/public ./services/admin-dashboard/public
COPY --from=builder /app/services/admin-dashboard/.next/standalone ./
COPY --from=builder /app/services/admin-dashboard/.next/static ./services/admin-dashboard/.next/static

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

WORKDIR /app/services/admin-dashboard
CMD ["node", "server.js"]
