#!/bin/bash

# Ternak Ayam Deployment Guide

## Prerequisites
- Node.js 18+
- npm or yarn

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables:
```bash
cp .env.example .env.local
```

3. Run migrations:
```bash
npx prisma migrate dev
```

4. Start dev server:
```bash
npm run dev
```

## Production Build

1. Build the application:
```bash
npm run build
```

2. The built files are in `dist/` directory

3. Start production server:
```bash
npm start
```

## Deployment Options

### Option 1: Vercel/Netlify
Not recommended for this Astro Node adapter - requires Node runtime.

### Option 2: Self-Hosted (Ubuntu/Linux)

1. SSH into your server
2. Clone the repository
3. Install Node.js and npm
4. Setup:
```bash
npm install
npx prisma migrate deploy
npm run build
```

5. Use PM2 to keep the app running:
```bash
npm install -g pm2
pm2 start "npm start" --name "ternak-ayam"
pm2 save
pm2 startup
```

6. Setup reverse proxy (nginx):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Docker Deployment

Create a Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ternak-ayam .
docker run -p 3000:3000 ternak-ayam
```

## Database

- SQLite is used for development/small deployments
- For production, consider migrating to PostgreSQL
- Update `prisma/schema.prisma` provider to `"postgresql"`
- Update DATABASE_URL in .env

## Current Status
✅ All dependencies installed
✅ Database migrations complete
✅ Build successful
✅ Ready for deployment
