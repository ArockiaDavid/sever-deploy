<<<<<<< HEAD
# Software-center-latest
March month software center repository
=======
# Software Center

A web application for managing software installations and configurations.

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── services/       # Business logic
│   ├── package.json
│   └── server.js          # Entry point
└── frontend/
    ├── public/            # Static files
    ├── src/
    │   ├── components/    # React components
    │   ├── pages/         # Page components
    │   ├── context/       # React context
    │   └── hooks/         # Custom hooks
    └── package.json
```

## Local Development Setup

1. Backend Setup:
   ```bash
   cd backend
   npm install
   # Create .env file with required environment variables
   npm run dev
   ```

2. Frontend Setup:
   ```bash
   cd frontend
   npm install
   npm start
   ```

The backend server will run on port 3007 and the frontend development server will run on port 3004.

## Deployment Instructions

### Backend Deployment

1. Install PM2 globally on your server:
   ```bash
   npm install -g pm2
   ```

2. Set up environment variables on your server:
   ```bash
   # Create production .env file
   MONGODB_URI=your_production_mongodb_uri
   JWT_SECRET=your_production_jwt_secret
   NODE_ENV=production
   PORT=3007
   ```

3. Deploy the backend:
   ```bash
   cd backend
   npm install
   npm run deploy
   ```

4. Monitor the application:
   ```bash
   pm2 status
   pm2 logs
   ```

### Frontend Deployment

1. Build the production bundle:
   ```bash
   cd frontend
   # Update REACT_APP_API_URL in package.json to your production API URL
   npm run build:prod
   ```

2. Deploy the static files to your web server (e.g., Nginx, Apache):
   ```bash
   # Example for Nginx
   cp -r build/* /var/www/html/
   ```

### Nginx Configuration Example

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Configuration (Recommended)

1. Install Certbot:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. Obtain SSL certificates:
   ```bash
   sudo certbot --nginx -d your-domain.com -d api.your-domain.com
   ```

## Environment Variables

Backend (.env):
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=production
PORT=3007
```

Frontend (build time):
```
REACT_APP_API_URL=https://api.your-domain.com
```

## Maintenance

- Monitor logs: `pm2 logs`
- Restart backend: `pm2 restart software-center-backend`
- View status: `pm2 status`
- Update SSL certificates: `sudo certbot renew`
>>>>>>> 4328536 (First Commit on repo)
