# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
# Baked into the client bundle at build time. "/api" = same origin behind the reverse proxy.
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
# Shown on the Terms and Privacy pages (build-time). Leave empty to show the "template" banner.
ARG VITE_OPERATOR_NAME=
ARG VITE_CONTACT_EMAIL=
ENV VITE_OPERATOR_NAME=$VITE_OPERATOR_NAME VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/build ./build
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build"]
