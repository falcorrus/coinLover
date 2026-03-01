# Stage 1: Build the React app
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Default Nginx config is fine for a SPA if we don't have complex routing,
# but we might need a custom one for React Router later.
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
