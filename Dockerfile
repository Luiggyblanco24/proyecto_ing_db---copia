FROM node:22.19.0-bookworm-slim AS frontend-build

WORKDIR /app

COPY ["Sutens lading page/package.json", "Sutens lading page/package-lock.json", "./Sutens lading page/"]
RUN npm ci --prefix "Sutens lading page"

COPY . .
RUN npm --prefix "Sutens lading page" run build

FROM node:22.19.0-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY --from=frontend-build --chown=node:node ["/app/Sutens lading page/dist", "/app/Sutens lading page/dist"]

USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
