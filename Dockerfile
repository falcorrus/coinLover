# Stage 1: Build the React app
FROM node:22-alpine as build
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache python3 make g++ && \
    pnpm config set enable-pre-post-scripts true && \
    pnpm install --frozen-lockfile --dangerously-allow-all-builds && \
    apk del python3 make g++
COPY . .
RUN pnpm run build

# Stage 2: Serve the app with Node.js
FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm tsx
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server.ts ./
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./

# Install only production dependencies (with build tools for native modules like better-sqlite3)
RUN apk add --no-cache python3 make g++ && \
    pnpm config set enable-pre-post-scripts true && \
    pnpm install --prod --dangerously-allow-all-builds && \
    apk del python3 make g++

EXPOSE 80
CMD ["tsx", "server.ts"]
