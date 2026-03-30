FROM node:20-slim

WORKDIR /app

# Copy worker package files
COPY worker/package.json worker/package-lock.json* ./worker/

# Copy shared source (worker imports from src/lib/)
COPY package.json package-lock.json* ./
COPY src/ ./src/
COPY worker/ ./worker/

# Install root dependencies (for shared src/lib imports)
RUN npm install --production=false

# Install worker dependencies
WORKDIR /app/worker
RUN npm install

WORKDIR /app

# Start the worker
CMD ["npx", "tsx", "worker/src/index.ts"]
