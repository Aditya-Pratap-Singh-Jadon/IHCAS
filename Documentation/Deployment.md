# IHCAS Deployment & Operations Guide

This document outlines the production architecture and deployment procedure for the IHCAS application.

## 1. Production Architecture
The IHCAS stack consists of three tiers:
1. **Frontend:** React SPA built with Vite. Deployed as static files served via Nginx or a CDN (e.g., AWS CloudFront / S3, or Vercel/Netlify).
2. **Backend API:** Node.js/Express application. Runs on a secure internal server or container orchestration platform (e.g., AWS ECS, EC2, or Railway/Render).
3. **Database:** MySQL 8+ with InnoDB. Hosted in a private subnet (e.g., AWS RDS). **Never expose the database directly to the public internet.**

### AWS Reference Architecture
- **VPC:** Private and Public Subnets.
- **RDS (MySQL):** Private subnet, restricted to accept inbound connections *only* from the Backend EC2/ECS Security Group on port 3306.
- **Backend (Node.js):** Private subnet (if using an Application Load Balancer in the public subnet) or Public subnet with strict security groups allowing only HTTP/HTTPS traffic.
- **Frontend (React):** S3 bucket served through CloudFront (CDN) with HTTPS.

## 2. Environment Configuration

### Backend (`backend/.env`)
Required variables for production:
```env
NODE_ENV=production
PORT=5000

# Database (Use least-privilege credentials, NOT root)
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=3306
DB_USER=ihcas_app_user
DB_PASSWORD=your_secure_password
DB_NAME=ihcas_prod

# Authentication Security
JWT_SECRET=generate_a_strong_random_256bit_string
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://ihcas.vit.ac.in

# Google OAuth
GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_CALLBACK_URL=https://api.ihcas.vit.ac.in/api/auth/google/callback

# Email / Notifications (OTP Delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=no-reply@vit.ac.in
SMTP_PASS=your_app_password
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://api.ihcas.vit.ac.in/api
```

## 3. Database Hardening and Provisioning

1. **Create Least-Privilege User:**
Do not run the application as `root`. Create a dedicated user:
```sql
CREATE DATABASE ihcas_prod;
CREATE USER 'ihcas_app_user'@'%' IDENTIFIED BY 'StrongPassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON ihcas_prod.* TO 'ihcas_app_user'@'%';
FLUSH PRIVILEGES;
```
Note: The app does not need `DROP` or `ALTER` privileges in production. Migrations should be handled by an administrator or a CI/CD pipeline using a higher-privileged deployment user.

2. **Schema & Seed Data:**
Run `schema.sql`. Do not apply `seed.sql` in production, as it contains mock development data. Create production wardens and admins using direct SQL inserts or the Admin Dashboard API.

3. **Backup and Restore:**
Configure automated daily RDS snapshots. 
Manual logical backup:
```bash
mysqldump -u root -p ihcas_prod > ihcas_prod_backup.sql
```
Restore:
```bash
mysql -u root -p ihcas_prod < ihcas_prod_backup.sql
```

## 4. Build and Startup Commands

**Frontend Build:**
```bash
cd frontend
npm ci
npm run build
# Deploy the contents of the `dist/` directory to your web server/CDN.
```

**Backend Startup:**
```bash
cd backend
npm ci
# Use a process manager like PM2 in production
npm install -g pm2
pm2 start src/server.js --name "ihcas-api"
```

## 5. Security & TLS Configurations
- **HTTPS:** Both Frontend and Backend **must** be served over HTTPS. `Secure` cookies will be rejected by browsers if served over HTTP.
- **Cookies:** When `NODE_ENV=production`, the backend will set JWT cookies with `Secure: true`. Ensure your API domain is accessed via HTTPS.
- **Rate Limiting & Headers:** The backend utilizes `helmet` for security headers and `express-rate-limit` to prevent brute-forcing endpoints.
- **Google OAuth:** Ensure the production `GOOGLE_CALLBACK_URL` is whitelisted in the Google Cloud Console.

## 6. Verification and Rollback
- **Health Checks:** Monitor `GET /api/health` to verify database connectivity.
- **Verification:** Login with an authorized `@vit.ac.in` admin account, create a hostel, generate a counselling session, and verify the transaction reflects on the Admin dashboard.
- **Rollback:** In case of a failed frontend deployment, revert the `dist/` folder to the previous version. In case of a failed database migration, restore the RDS snapshot taken immediately prior to the deployment window.
