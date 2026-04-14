# ── Build stage ────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Runtime stage ───────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy dependencies
COPY --from=build /app/node_modules ./node_modules

# Copy application files
COPY server.js ./
COPY ai/ ./ai/
COPY plugins/ ./plugins/
COPY public/ ./public/
COPY package.json ./

# Create non-root user
RUN addgroup -S nightmare && adduser -S nightmare -G nightmare
RUN chown -R nightmare:nightmare /app

USER nightmare

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
