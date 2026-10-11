FROM node:18 AS build

WORKDIR /app

# Copy package manifests first for caching
COPY package*.json ./

# Install dependencies inside container
RUN npm install

# Copy source code and build production assets
COPY . .
RUN npm run build

# Expose Vite preview port
EXPOSE 5173

# Start preview server bound to all network interfaces
CMD ["npm", "run", "preview", "--", "--host"]
