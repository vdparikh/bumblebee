# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine

# Copy the build output from the builder stage to Nginx's html directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config (optional, if you need custom config)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3000 (or 80 if Nginx is configured for it)
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]