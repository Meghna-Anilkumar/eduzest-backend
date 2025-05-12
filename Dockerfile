FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package.json ./

# Install production dependencies
RUN npm install

# Copy application code
COPY . .

# Build TypeScript code
RUN npm run build

EXPOSE 5000

# Command to run the application
CMD ["node", "dist/server.js"]