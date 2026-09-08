# Stage 1: Build the React app
FROM node:22-alpine as build
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile
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
COPY --from=build /app/pnpm-workspace.yaml* ./

# Install only production dependencies
RUN pnpm install --prod

EXPOSE 80
CMD ["tsx", "server.ts"]
