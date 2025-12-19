# Dockerfile for Railway deployment
# This is at the root to work with monorepo structure

# Use Node.js 18 slim image (smaller, faster, no Chrome dependencies)
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files from backend directory
COPY apps/backend/package*.json ./

# Install dependencies using npm install (more forgiving than npm ci)
# This ensures correct versions are installed even if lock file is outdated
RUN npm install

# Copy source code from backend directory
COPY apps/backend/ ./

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size (after build)
RUN npm prune --production

# Don't install Chrome during build - it will be installed at runtime if needed
# This prevents build failures and reduces build time

# Expose port (Railway sets PORT automatically)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]

