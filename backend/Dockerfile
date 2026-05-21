# Use official Node.js LTS image as base (slim version for small size & security)
FROM node:20-slim

# Set non-interactive mode and clean environment
ENV NODE_ENV=production

# Set working directory inside container
WORKDIR /app

# Copy package descriptors first to leverage Docker build cache layers
COPY package*.json ./

# Install ONLY production dependencies to keep the image slim
RUN npm ci --only=production && npm cache clean --force

# Copy all application source code
COPY . .

# Cloud Run automatically sets the PORT environment variable to 8080
ENV PORT=8080
EXPOSE 8080

# Command to launch the Express application
CMD ["npm", "start"]
