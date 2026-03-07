FROM mcr.microsoft.com/playwright:v1.40.0-jammy
WORKDIR /app
COPY . .
RUN npm install
RUN cd apps/web && npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "run", "start", "--prefix", "apps/web"]
