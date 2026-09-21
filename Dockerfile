FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 WS_PORT=3001
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/dist/processes ./dist/processes
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/drizzle.config.ts ./drizzle.config.ts
USER node
EXPOSE 3000 3001
CMD ["node", ".output/server/index.mjs"]
