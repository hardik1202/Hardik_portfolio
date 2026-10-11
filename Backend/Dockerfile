FROM node:18

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install backend dependencies inside container
RUN npm install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
