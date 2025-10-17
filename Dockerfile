# ---------- Stage 1: Build frontend ----------
FROM node:18 AS frontend-build
WORKDIR /app/frontend

# Copy only frontend package files first for caching
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of frontend files and build
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Build backend ----------
FROM node:18 AS backend-build
WORKDIR /app

# Copy backend package files first for caching
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy backend source
COPY backend/ ./backend
COPY config/ ./config

# Copy built frontend from previous stage into backend's public folder
# (Assuming backend serves static files from backend/public)
COPY --from=frontend-build /app/frontend/build ./backend/public

# ---------- Stage 3: Final lightweight runtime ----------
FROM node:18-slim
WORKDIR /app

# Copy built backend
COPY --from=backend-build /app/backend ./backend
COPY --from=backend-build /app/config ./config

WORKDIR /app/backend

# Expose the Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Start backend server
CMD ["npm", "start"]
