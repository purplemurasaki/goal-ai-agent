FROM node:22-bookworm-slim

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Monorepo: install from root lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile --filter web...

COPY apps/web apps/web

WORKDIR /workspace/apps/web

ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["pnpm", "dev:docker"]
