# Stage 1: Build the React app
FROM node:22-alpine as build
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile && \
    apk del python3 make g++
COPY . .
RUN pnpm run build

# Stage 2: Serve the app with Node.js
FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm@9 tsx
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server.ts ./
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./

# Install only production dependencies (with build tools for native modules like better-sqlite3)
RUN apk add --no-cache python3 make g++ && \
    pnpm install --prod && \
    apk del python3 make g++

EXPOSE 80
CMD ["tsx", "server.ts"]
