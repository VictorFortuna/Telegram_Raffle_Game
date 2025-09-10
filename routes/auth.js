const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/jwtAuth');

// POST /api/auth/login
// Authenticate user with Telegram initData and return JWT token
router.post('/login', async (req, res) => {
  try {
    // At this point, req.telegramUser is already validated by middleware
    const telegramUser = req.telegramUser;
    
    if (!telegramUser) {
      return res.status(401).json({ 
        error: 'No Telegram user data found',
        code: 'NO_USER_DATA' 
      });
    }
    
    // Create or update user in database
    const user = await User.upsert({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      language_code: telegramUser.language_code
    });
    
    // Generate JWT token
    const token = generateToken(telegramUser);
    
    // Get user statistics
    const stats = await User.getStats(telegramUser.id);
    
    res.json({
      success: true,
      token,
      user: {
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        language_code: user.language_code,
        created_at: user.created_at,
        last_active: user.last_active
      },
      stats: stats || {
        total_bids: 0,
        wins: 0,
        total_winnings: 0,
        total_spent: 0
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'LOGIN_ERROR' 
    });
  }
});

// GET /api/auth/me
// Get current user information
router.get('/me', async (req, res) => {
  try {
    const telegramUser = req.telegramUser;
    
    if (!telegramUser) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED' 
      });
    }
    
    // Update last active timestamp
    await User.updateLastActive(telegramUser.id);
    
    // Get current user data
    const user = await User.findByTelegramId(telegramUser.id);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      });
    }
    
    // Get user statistics
    const stats = await User.getStats(telegramUser.id);
    
    res.json({
      success: true,
      user: {
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        language_code: user.language_code,
        created_at: user.created_at,
        last_active: user.last_active
      },
      stats: stats || {
        total_bids: 0,
        wins: 0,
        total_winnings: 0,
        total_spent: 0
      }
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      code: 'GET_USER_ERROR' 
    });
  }
});

// POST /api/auth/refresh
// Refresh JWT token
router.post('/refresh', async (req, res) => {
  try {
    const telegramUser = req.telegramUser;
    
    if (!telegramUser) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED' 
      });
    }
    
    // Generate new token
    const token = generateToken(telegramUser);
    
    res.json({
      success: true,
      token
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR' 
    });
  }
});

// GET /api/auth/stats
// Get global platform statistics
router.get('/stats', async (req, res) => {
  try {
    const [activeUsers, totalUsers] = await Promise.all([
      User.getActiveUsersCount(),
      User.getTotalUsersCount()
    ]);
    
    res.json({
      success: true,
      stats: {
        active_users: activeUsers,
        total_users: totalUsers,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      code: 'GET_STATS_ERROR' 
    });
  }
});

// POST /api/auth/logout
// Logout user (mainly for cleanup)
router.post('/logout', async (req, res) => {
  try {
    const telegramUser = req.telegramUser;
    
    if (telegramUser) {
      // Update last active timestamp
      await User.updateLastActive(telegramUser.id);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR' 
    });
  }
});

module.exports = router;