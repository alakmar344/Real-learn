FROM node:20-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --only=production

COPY src ./src

EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000

CMD ["node", "src/server.js"]
