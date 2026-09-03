FROM node:24.8.0-alpine3.22 AS dependencies

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
COPY apps/api apps/api
RUN pnpm --filter @jdr-hub/api build
RUN pnpm --filter @jdr-hub/api deploy --prod --legacy /runtime
RUN cp -R apps/api/dist /runtime/dist

FROM node:24.8.0-alpine3.22 AS runtime
ENV NODE_ENV=production
ENV PORT=8787

WORKDIR /app
COPY --from=build --chown=node:node /runtime ./

USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
