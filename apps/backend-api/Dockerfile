FROM node:24-alpine

WORKDIR /app

# Install hexo globally for rebuild functionality
RUN npm install -g hexo-cli

# Copy backend API
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY prisma/ ./prisma/
COPY public/ ./public/
COPY scripts/ ./scripts/

RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
