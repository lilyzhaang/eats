# Packages Eats as a container, so it runs the same way on any host
# (Fly.io, Render, Railway, or Andrei's server).
#
# Build:  docker build -t eats .
# Run:    see docker-compose.yml

# ── Stage 1: build the app ──────────────────────────────────────────────
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ── Stage 2: the small image that actually runs ─────────────────────────
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/eats.db
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# The app applies these to the database when it starts.
COPY migrations ./migrations
# Claude's instructions for writing menus and prep plans.
COPY prompts ./prompts

# The database lives on a volume, so it survives updates to the app.
# The app runs as the unprivileged "node" user, which needs to own /data.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 3000
USER node
CMD ["node", "build"]
