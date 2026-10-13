FROM node:24.20.0-alpine3.24@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY packages/database packages/database
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @jdr-hub/api build
RUN pnpm --filter @jdr-hub/api deploy --prod --legacy /runtime
RUN cp -R apps/api/dist /runtime/dist
RUN mkdir -p /runtime/node_modules/@jdr-hub/database && cp -R packages/database/migrations /runtime/node_modules/@jdr-hub/database/migrations

FROM node:24.20.0-alpine3.24@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS runtime
ENV NODE_ENV=production
ENV PORT=8787

RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app
COPY --from=build --chown=node:node /runtime ./

USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
