FROM node:20-alpine AS build

WORKDIR /app

# Copy package manifests first for caching
COPY package*.json ./

# Install dependencies inside container
RUN npm ci

# Copy source code and build production assets
COPY . .
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Expose Vite preview port
EXPOSE 5173

# Start preview server bound to all network interfaces
CMD ["npm", "run", "preview", "--", "--host"]
