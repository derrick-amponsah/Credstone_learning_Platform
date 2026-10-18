FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/server.js"]
