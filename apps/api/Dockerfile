# Runs the API via tsx (same as local dev), not a tsc-compiled build.
# Prisma 7's new ESM-native generated client doesn't survive being
# pre-compiled by plain tsc + run with plain node (confirmed via direct
# testing, not a Docker-specific issue) — tsx's transpile-on-run model
# sidesteps that entirely, matching the one execution path proven
# reliable throughout local development.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
RUN npm --prefix apps/api ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY apps/api ./apps/api

RUN npx prisma generate

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && apps/api/node_modules/.bin/tsx apps/api/src/index.ts"]
