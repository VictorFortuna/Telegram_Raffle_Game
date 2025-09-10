const crypto = require('crypto');

// Middleware to validate Telegram WebApp initData
const validateTelegramInitData = (req, res, next) => {
  try {
    const initData = req.headers['x-telegram-init-data'] || req.body.initData;
    
    if (!initData) {
      return res.status(401).json({ 
        error: 'Missing Telegram init data',
        code: 'MISSING_INIT_DATA' 
      });
    }

    // Parse initData
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return res.status(401).json({ 
        error: 'Missing hash in init data',
        code: 'MISSING_HASH' 
      });
    }

    urlParams.delete('hash');
    
    // Create data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Generate secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Verify hash
    if (calculatedHash !== hash) {
      return res.status(401).json({ 
        error: 'Invalid Telegram init data hash',
        code: 'INVALID_HASH' 
      });
    }
    
    // Check auth_date (should be within last 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;
    
    if (timeDiff > 86400) { // 24 hours
      return res.status(401).json({ 
        error: 'Init data is too old',
        code: 'EXPIRED_INIT_DATA' 
      });
    }
    
    // Parse user data
    const userString = urlParams.get('user');
    if (!userString) {
      return res.status(401).json({ 
        error: 'Missing user data',
        code: 'MISSING_USER_DATA' 
      });
    }
    
    try {
      const user = JSON.parse(userString);
      req.telegramUser = user;
      req.initDataRaw = initData;
      req.authDate = authDate;
      
      // Validate required user fields
      if (!user.id || !user.first_name) {
        return res.status(401).json({ 
          error: 'Invalid user data structure',
          code: 'INVALID_USER_DATA' 
        });
      }
      
      next();
    } catch (parseError) {
      return res.status(401).json({ 
        error: 'Failed to parse user data',
        code: 'USER_PARSE_ERROR' 
      });
    }
    
  } catch (error) {
    console.error('Telegram auth validation error:', error);
    return res.status(401).json({ 
      error: 'Failed to validate Telegram init data',
      code: 'VALIDATION_ERROR' 
    });
  }
};

// Optional middleware for endpoints that can work with or without auth
const optionalTelegramAuth = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData;
  
  if (!initData) {
    req.telegramUser = null;
    return next();
  }
  
  validateTelegramInitData(req, res, next);
};

module.exports = {
  validateTelegramInitData,
  optionalTelegramAuth
};