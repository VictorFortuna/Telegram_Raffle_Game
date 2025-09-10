require('dotenv').config();

const config = {
  // Application settings
  app: {
    name: 'Telegram Raffle Stars',
    version: process.env.npm_package_version || '1.0.0',
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idle: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000
    }
  },

  // Telegram configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Admin configuration
  admin: {
    passwordHash: process.env.ADMIN_PASSWORD_HASH
  },

  // Rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    betWindowMs: parseInt(process.env.BET_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    betMax: parseInt(process.env.BET_RATE_LIMIT_MAX_REQUESTS) || 10
  },

  // CORS configuration
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : 
             (process.env.NODE_ENV === 'production' 
               ? ['https://t.me', 'https://web.telegram.org'] 
               : ['http://localhost:3000', 'https://t.me'])
  },

  // Socket.IO configuration
  socketIo: {
    origins: process.env.SOCKET_IO_ORIGINS ? process.env.SOCKET_IO_ORIGINS.split(',') : 
             (process.env.NODE_ENV === 'production' 
               ? ['https://t.me', 'https://web.telegram.org'] 
               : ['http://localhost:3000', 'https://t.me']),
    maxConnections: parseInt(process.env.MAX_SOCKET_CONNECTIONS) || 1000,
    pingInterval: parseInt(process.env.SOCKET_HEARTBEAT_INTERVAL) || 25000,
    pingTimeout: parseInt(process.env.SOCKET_HEARTBEAT_TIMEOUT) || 20000
  },

  // Game configuration
  game: {
    defaultParticipantsLimit: parseInt(process.env.DEFAULT_PARTICIPANTS_LIMIT) || 10,
    defaultBetAmount: parseInt(process.env.DEFAULT_BET_AMOUNT) || 1,
    defaultWinnerPercentage: parseInt(process.env.DEFAULT_WINNER_PERCENTAGE) || 70,
    maxRaffleDurationHours: parseInt(process.env.MAX_RAFFLE_DURATION_HOURS) || 24,
    minParticipantsToStart: parseInt(process.env.MIN_PARTICIPANTS_TO_START) || 2
  },

  // Security settings
  security: {
    forceHttps: process.env.FORCE_HTTPS === 'true',
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000,
    secureCookies: process.env.SECURE_COOKIES === 'true',
    sessionSecret: process.env.SESSION_SECRET,
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000
  },

  // Monitoring configuration
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    dbHealthCheckTimeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT) || 5000
  },

  // Backup configuration
  backup: {
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    autoBackupEnabled: process.env.AUTO_BACKUP_ENABLED === 'true',
    scheduleCron: process.env.BACKUP_SCHEDULE_CRON || '0 2 * * *'
  },

  // Railway specific
  railway: {
    environment: process.env.RAILWAY_ENVIRONMENT,
    serviceName: process.env.RAILWAY_SERVICE_NAME
  }
};

// Validation
const requiredEnvVars = [
  'DATABASE_URL',
  'TELEGRAM_BOT_TOKEN', 
  'JWT_SECRET',
  'ADMIN_PASSWORD_HASH'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = config;