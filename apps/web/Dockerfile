FROM node:20-slim

# Install dependencies needed by Playwright and Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install web dependencies (includes @demand-collector/core via file: link)
RUN cd apps/web && npm ci

# Prisma
RUN cd apps/web && npx prisma generate

# Build Next.js (reads .env.production for NEXT_PUBLIC_ vars)
RUN cd apps/web && npx next build

EXPOSE 3000
CMD ["npm", "run", "start", "--prefix", "apps/web"]
