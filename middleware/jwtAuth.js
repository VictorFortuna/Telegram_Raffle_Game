const jwt = require('jsonwebtoken');

// Generate JWT token for authenticated users
const generateToken = (user, expiresIn = '24h') => {
  const payload = {
    telegram_id: user.telegram_id || user.id,
    username: user.username,
    first_name: user.first_name,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Missing authorization header',
        code: 'MISSING_AUTH_HEADER' 
      });
    }
    
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Missing token',
        code: 'MISSING_TOKEN' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }
    
    console.error('JWT verification error:', error);
    return res.status(401).json({ 
      error: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_ERROR' 
    });
  }
};

// Optional JWT verification (continues without auth if no token)
const optionalJWTAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    req.user = null;
    return next();
  }
  
  verifyToken(req, res, next);
};

// Admin JWT verification
const verifyAdminToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Missing authorization header',
        code: 'MISSING_AUTH_HEADER' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Missing token',
        code: 'MISSING_TOKEN' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an admin token
    if (!decoded.role || decoded.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS' 
      });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }
    
    console.error('Admin JWT verification error:', error);
    return res.status(401).json({ 
      error: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_ERROR' 
    });
  }
};

// Generate admin token
const generateAdminToken = (adminUser, expiresIn = '8h') => {
  const payload = {
    id: adminUser.id,
    username: adminUser.username,
    email: adminUser.email,
    role: adminUser.role,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Refresh token if it's close to expiry
const refreshToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token expires within next hour
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;
    
    if (timeUntilExpiry < 3600) { // Less than 1 hour
      const newToken = decoded.role === 'admin' 
        ? generateAdminToken(decoded) 
        : generateToken(decoded);
      
      res.setHeader('X-New-Token', newToken);
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid, continue without refresh
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  optionalJWTAuth,
  verifyAdminToken,
  generateAdminToken,
  refreshToken
};