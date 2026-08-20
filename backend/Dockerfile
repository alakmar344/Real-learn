FROM oven/bun:1-alpine AS base
WORKDIR /app
COPY package.json ./
RUN bun install --production

FROM oven/bun:1-alpine AS runner
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
EXPOSE 10000
ENV NODE_ENV=production
CMD ["bun", "src/server.js"]
