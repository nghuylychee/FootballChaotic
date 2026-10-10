# Máy chủ riêng cho trận online. Build từ thư mục gốc repo (cần config/, src/, index.html dùng chung với game):
#   docker build -f server/Dockerfile -t sfc-server .
#   docker run -p 8080:8080 sfc-server
FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY index.html ./
COPY config/ config/
COPY src/ src/
COPY server/*.js server/
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://localhost:${PORT}/healthz" >/dev/null || exit 1
CMD ["node", "server/index.js"]
