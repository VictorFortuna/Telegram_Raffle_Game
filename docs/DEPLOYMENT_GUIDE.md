# Telegram Raffle Stars - Deployment Guide

## Overview

This guide covers the complete deployment process for the Telegram Raffle Stars application on Railway platform with PostgreSQL database integration.

## Prerequisites

- Railway account (railway.app)
- GitHub repository with the application code
- Telegram Bot Token from @BotFather
- Domain name (optional but recommended)

## 1. Railway Setup

### 1.1 Create New Railway Project

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init
```

### 1.2 Configure GitHub Integration

1. Go to Railway Dashboard
2. Connect your GitHub repository
3. Select the main branch for auto-deployment
4. Configure build settings:
   - Build Command: `npm ci`
   - Start Command: `npm start`

## 2. Database Setup

### 2.1 Add PostgreSQL Service

```bash
# Add PostgreSQL to your Railway project
railway add postgresql

# Or via dashboard: Add Service -> PostgreSQL
```

### 2.2 Database Configuration

The PostgreSQL service will automatically provide:
- `DATABASE_URL` environment variable
- Connection pooling
- Automated backups (Railway Pro)

## 3. Environment Variables

### 3.1 Required Variables

Configure these in Railway Dashboard under Variables:

```env
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (automatically provided by Railway)
DATABASE_URL=postgresql://...

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app/api/webhook/telegram

# Security
JWT_SECRET=your_secure_jwt_secret_here
ADMIN_PASSWORD_HASH=$2a$12$FVDv8Cb2AyjXULcUgLDB3ufz8K.Q51/aWL0XmqyMdtpOrwsJV8Ci2

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BET_RATE_LIMIT_WINDOW_MS=60000
BET_RATE_LIMIT_MAX_REQUESTS=10

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn_here
ADMIN_TELEGRAM_ID=your_telegram_id_for_alerts
ALERT_WEBHOOK_URL=your_monitoring_webhook_url
```

### 3.2 Generate Secure Values

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Admin Password Hash (for 'admin' / 'fortunaforever0910')
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('fortunaforever0910', 12))"
```

## 4. Domain and SSL Configuration

### 4.1 Custom Domain (Recommended)

1. In Railway Dashboard: Settings -> Domains
2. Add your custom domain
3. Configure DNS records as shown
4. SSL certificates are automatically managed

### 4.2 Update Environment Variables

```env
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/webhook/telegram
CORS_ORIGINS=https://t.me,https://web.telegram.org
```

## 5. Telegram Bot Configuration

### 5.1 Set Webhook

```bash
# Use the setup script
node scripts/setup-domain.js webhook

# Or manually via curl
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-domain.com/api/webhook/telegram"}'
```

### 5.2 Configure Bot with @BotFather

```bash
# Generate setup instructions
node scripts/setup-domain.js instructions
```

Follow the generated instructions for complete @BotFather setup.

## 6. Database Migrations

### 6.1 Initial Setup

```bash
# Run migrations (automatically done on first deploy)
npm run migrate

# Or manually
railway run npm run migrate
```

### 6.2 Verify Database

```bash
# Connect to database
railway connect postgresql

# Check tables
\dt

# Verify schema
\d users
\d raffles
\d bids
```

## 7. Monitoring Setup

### 7.1 Health Check Endpoint

The application provides health checks at:
- `GET /health` - Basic health status
- Health checks run automatically every 30 seconds

### 7.2 Log Monitoring

```bash
# View logs
railway logs

# Monitor in real-time
railway logs --follow

# Check log files (if using file logging)
railway run ls -la logs/
```

### 7.3 Alert Configuration

Set up alerts by configuring these environment variables:

```env
# Telegram Alerts
ADMIN_TELEGRAM_ID=123456789

# Webhook Alerts
ALERT_WEBHOOK_URL=https://your-monitoring-service.com/webhook

# Email Alerts (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL_TO=admin@yourdomain.com
```

## 8. Backup and Recovery

### 8.1 Automated Backups

```bash
# Create backup
node database/backup.js create

# List backups
node database/backup.js list

# Schedule automatic backups (cron)
# Add to Railway deployment or use external cron service
0 2 * * * cd /app && node database/backup.js create
```

### 8.2 Manual Backup/Restore

```bash
# Manual backup
railway run node database/backup.js create

# Restore from backup
railway run node database/backup.js restore /path/to/backup.sql

# Database health check
railway run node database/backup.js health
```

## 9. Security Checklist

### 9.1 Pre-Deployment

- [ ] All environment variables are set
- [ ] JWT secret is secure and unique
- [ ] Admin password is changed from default
- [ ] Rate limiting is configured
- [ ] CORS origins are restricted
- [ ] SSL/HTTPS is enabled

### 9.2 Post-Deployment

- [ ] Webhook SSL certificate is valid
- [ ] Health checks are responding
- [ ] Telegram bot is responding to commands
- [ ] Game interface loads correctly
- [ ] Admin panel is accessible
- [ ] Database connections are working
- [ ] Logs are being generated
- [ ] Alerts are configured and tested

## 10. Performance Optimization

### 10.1 Railway Configuration

```json
{
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 10.2 Database Optimization

```env
# Connection Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

### 10.3 WebSocket Configuration

```env
# Socket.IO Settings
MAX_SOCKET_CONNECTIONS=1000
SOCKET_HEARTBEAT_INTERVAL=25000
SOCKET_HEARTBEAT_TIMEOUT=20000
```

## 11. Troubleshooting

### 11.1 Common Issues

**Deployment Fails:**
```bash
# Check build logs
railway logs --deployment

# Verify environment variables
railway variables

# Test locally
npm install
npm run migrate
npm start
```

**Database Connection Issues:**
```bash
# Test database connectivity
railway run node -e "require('./database/connection').testConnection()"

# Check DATABASE_URL format
echo $DATABASE_URL
```

**Webhook Issues:**
```bash
# Check webhook status
node scripts/setup-domain.js info

# Test SSL certificate
node scripts/setup-domain.js test

# Reset webhook
node scripts/setup-domain.js delete
node scripts/setup-domain.js webhook
```

### 11.2 Debug Commands

```bash
# Health check
railway run node monitoring/healthcheck.js check

# Performance metrics
railway run node monitoring/healthcheck.js metrics

# Test alerts
railway run node monitoring/alerts.js test

# Check logs
railway run node -e "console.log(require('./utils/logger').getLogStats())"
```

## 12. Maintenance

### 12.1 Regular Tasks

**Daily:**
- Monitor application health
- Check error logs
- Verify webhook status

**Weekly:**
- Review performance metrics
- Check backup status
- Update dependencies if needed

**Monthly:**
- Rotate access keys
- Review security logs
- Update documentation

### 12.2 Maintenance Commands

```bash
# Update dependencies
npm update
railway deploy

# Clean old logs
railway run node -e "require('./utils/logger').cleanOldLogs(30)"

# Clean old backups
railway run node database/backup.js clean 30

# Performance check
railway run node monitoring/healthcheck.js metrics
```

## 13. Scaling Considerations

### 13.1 Horizontal Scaling

For high traffic, consider:
- Multiple Railway replicas
- Redis adapter for Socket.IO clustering
- Load balancer configuration
- Database read replicas

### 13.2 Vertical Scaling

Monitor and adjust:
- Memory allocation
- CPU resources
- Database connection pool size
- WebSocket connection limits

## Support

For deployment issues:
1. Check this documentation
2. Review application logs
3. Test individual components
4. Contact the development team

## Version History

- v1.0.0 - Initial production deployment
- v1.0.1 - Added monitoring and alerting
- v1.0.2 - Enhanced security and logging