FROM mcr.microsoft.com/playwright:v1.40.0-jammy
WORKDIR /app
COPY . .
RUN cd apps/web && npm ci
RUN chmod +x apps/web/node_modules/.bin/prisma || true
RUN cd apps/web && npx prisma generate
RUN cd apps/web && npm run build
EXPOSE 3000
CMD ["npm", "run", "start", "--prefix", "apps/web"]
