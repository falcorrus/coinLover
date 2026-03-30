# Stage 1: Build the React app
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the app with Node.js
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server.ts ./
COPY --from=build /app/package*.json ./
COPY --from=build /app/google-credentials.json ./

# Install only production dependencies
RUN npm install --omit=dev

# We use tsx to run our server.ts directly or we can compile it
RUN npm install -g tsx

EXPOSE 80
CMD ["tsx", "server.ts"]
