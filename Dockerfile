FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG CACHE_BUST=1
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/serve.json ./dist/serve.json
EXPOSE 3000
CMD ["serve", "dist", "-l", "tcp://0.0.0.0:3000"]
