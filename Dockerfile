# Packages Eats as a container, so it runs the same way on any host
# (Fly.io, Render, Railway, or Andrei's server).
#
# Build:  docker build -t eats .
# Run:    see docker-compose.yml

# ── Stage 1: build the app ──────────────────────────────────────────────
FROM node:24-slim AS build
LABEL app=eats
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ── Stage 2: the small image that actually runs ─────────────────────────
FROM node:24-slim
# Lets deploys clean up old Eats images without touching anything else on the server.
LABEL app=eats
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
# Maintenance commands, e.g. the database backup.
COPY scripts ./scripts

# The database lives on a volume, so it survives updates to the app.
# The app runs as user id 10001, which needs to own /data. Not the image's
# "node" user: that is id 1000, the same as the first login on most Linux
# servers (omarchy included), whose files the app must not be able to touch.
RUN mkdir -p /data && chown 10001:10001 /data
VOLUME /data
EXPOSE 3000
USER 10001:10001
CMD ["node", "build"]
