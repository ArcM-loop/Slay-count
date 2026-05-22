# 1. Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Build Backend & Serve
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

# Copy backend dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy backend source code
COPY backend/ ./

# Copy built frontend from previous stage into backend's dist folder
COPY --from=frontend-builder /app/dist ./dist

# Port for Cloud Run
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
