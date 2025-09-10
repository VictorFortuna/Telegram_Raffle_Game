require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Import routes
const authRoutes = require('./routes/auth');
const raffleRoutes = require('./routes/raffle');
const adminRoutes = require('./routes/admin');

// Import services
const telegramService = require('./services/telegram');
const raffleService = require('./services/raffle');

// Import middleware
const telegramAuth = require('./middleware/telegramAuth');
const jwtAuth = require('./middleware/jwtAuth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const betLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 bet requests per minute
  message: 'Too many bet attempts, please slow down.'
});

app.use(limiter);
app.use('/api/raffle/bet', betLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://t.me', 'https://web.telegram.org'] 
    : ['http://localhost:3000', 'https://t.me'],
  credentials: true
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Telegram initData validation middleware
const validateTelegramInitData = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'];
  
  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    if (calculatedHash !== hash) {
      return res.status(401).json({ error: 'Invalid Telegram init data' });
    }
    
    const user = JSON.parse(urlParams.get('user') || '{}');
    req.telegramUser = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Failed to validate Telegram init data' });
  }
};

// API routes
app.use('/api/auth', validateTelegramInitData, authRoutes);
app.use('/api/raffle', validateTelegramInitData, raffleRoutes);
app.use('/api/admin', adminRoutes);

// Telegram webhook endpoint
app.post('/api/webhook/telegram', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const update = JSON.parse(req.body);
    await telegramService.handleWebhook(update);
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Main game route
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// Admin panel route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-raffle', async (data) => {
    try {
      const { initData } = data;
      // Validate initData and get user info
      // Join user to raffle room for real-time updates
      socket.join('raffle-updates');
      
      // Send current raffle status
      const currentRaffle = await raffleService.getCurrentRaffle();
      socket.emit('raffle-status', currentRaffle);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join raffle' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Global Socket.IO instance for services
global.io = io;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

server.listen(PORT, () => {
  console.log(`Telegram Raffle Stars server running on port ${PORT}`);
  console.log(`Game available at: http://localhost:${PORT}/game`);
  console.log(`Admin panel at: http://localhost:${PORT}/admin`);
});

module.exports = { app, server, io };