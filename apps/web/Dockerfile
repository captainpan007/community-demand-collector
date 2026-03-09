FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app
COPY . .

# Install web dependencies (includes @demand-collector/core via file: link)
RUN cd apps/web && npm ci

# Prisma
RUN chmod +x apps/web/node_modules/.bin/prisma || true
RUN cd apps/web && npx prisma generate

# Build Next.js (reads .env.production for NEXT_PUBLIC_ vars)
RUN cd apps/web && npx next build

EXPOSE 3000
CMD ["npm", "run", "start", "--prefix", "apps/web"]
