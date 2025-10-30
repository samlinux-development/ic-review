FROM node:22.18.0-alpine AS base

ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

# Runtime image: keep only node_modules and package.json
FROM node:22.18.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/package.json /app/package.json

# The source code will be bind-mounted by docker-compose
EXPOSE 3001
CMD ["node", "server/index.js"]


