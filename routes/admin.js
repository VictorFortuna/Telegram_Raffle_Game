const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { query } = require('../database/connection');
const { generateAdminToken, verifyAdminToken } = require('../middleware/jwtAuth');
const Raffle = require('../models/Raffle');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// POST /api/admin/login
// Admin authentication
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password required',
        code: 'MISSING_CREDENTIALS' 
      });
    }
    
    // Get admin user
    const result = await query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = true',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    const admin = result.rows[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    // Update last login
    await query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );
    
    // Generate JWT token
    const token = generateAdminToken(admin);
    
    // Log admin login
    const auditId = uuidv4();
    await query(`
      INSERT INTO audit_logs (id, admin_user, action, details, ip_address, user_agent)
      VALUES ($1, $2, 'admin_login', $3, $4, $5)
    `, [
      auditId,
      admin.username,
      JSON.stringify({ success: true }),
      req.ip,
      req.get('User-Agent')
    ]);
    
    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        last_login: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'LOGIN_ERROR' 
    });
  }
});

// Apply admin authentication to all routes below
router.use(verifyAdminToken);

// GET /api/admin/dashboard
// Get admin dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const [raffleStats, userCounts] = await Promise.all([
      Raffle.getStats(),
      Promise.all([
        User.getActiveUsersCount(),
        User.getTotalUsersCount()
      ])
    ]);
    
    const [activeUsers, totalUsers] = userCounts;
    
    // Get recent transactions
    const recentTransactions = await query(`
      SELECT st.*, u.username, u.first_name
      FROM star_transactions st
      LEFT JOIN users u ON st.user_telegram_id = u.telegram_id
      ORDER BY st.created_at DESC
      LIMIT 10
    `);
    
    // Get today's stats
    const todayStats = await query(`
      SELECT 
        COUNT(CASE WHEN r.status = 'completed' AND r.completed_at > CURRENT_DATE THEN 1 END) as completed_today,
        COALESCE(SUM(CASE WHEN r.status = 'completed' AND r.completed_at > CURRENT_DATE THEN r.total_pot ELSE 0 END), 0) as volume_today,
        COALESCE(SUM(CASE WHEN r.status = 'completed' AND r.completed_at > CURRENT_DATE THEN r.organizer_amount ELSE 0 END), 0) as fees_today
      FROM raffles r
    `);
    
    res.json({
      success: true,
      dashboard: {
        raffle_stats: {
          total_raffles: parseInt(raffleStats.total_raffles),
          completed_raffles: parseInt(raffleStats.completed_raffles),
          cancelled_raffles: parseInt(raffleStats.cancelled_raffles),
          active_raffles: parseInt(raffleStats.active_raffles),
          total_volume: parseInt(raffleStats.total_volume),
          total_fees: parseInt(raffleStats.total_fees),
          avg_participants: parseFloat(raffleStats.avg_participants)
        },
        user_stats: {
          active_users: activeUsers,
          total_users: totalUsers
        },
        today_stats: {
          completed_raffles: parseInt(todayStats.rows[0].completed_today),
          volume: parseInt(todayStats.rows[0].volume_today),
          fees: parseInt(todayStats.rows[0].fees_today)
        },
        recent_transactions: recentTransactions.rows.map(tx => ({
          id: tx.id,
          user: tx.username || tx.first_name || `User ${tx.user_telegram_id}`,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          created_at: tx.created_at
        }))
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard',
      code: 'DASHBOARD_ERROR' 
    });
  }
});

// GET /api/admin/raffles
// Get all raffles with admin details
router.get('/raffles', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || 'all';
    
    let whereClause = '';
    const params = [limit, offset];
    
    if (status !== 'all') {
      whereClause = 'WHERE r.status = $3';
      params.push(status);
    }
    
    const result = await query(`
      SELECT r.*, u.username as winner_username, u.first_name as winner_first_name
      FROM raffles r
      LEFT JOIN users u ON r.winner_id = u.telegram_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);
    
    res.json({
      success: true,
      raffles: result.rows,
      pagination: {
        limit,
        offset,
        has_more: result.rows.length === limit
      }
    });
    
  } catch (error) {
    console.error('Get admin raffles error:', error);
    res.status(500).json({ 
      error: 'Failed to get raffles',
      code: 'GET_RAFFLES_ERROR' 
    });
  }
});

// POST /api/admin/raffles/:id/cancel
// Cancel a raffle
router.post('/raffles/:id/cancel', async (req, res) => {
  try {
    const raffleId = req.params.id;
    const { reason } = req.body;
    
    const refunds = await Raffle.cancel(raffleId, reason);
    
    // Log admin action
    const auditId = uuidv4();
    await query(`
      INSERT INTO audit_logs (id, admin_user, action, target_type, target_id, details, ip_address, user_agent)
      VALUES ($1, $2, 'cancel_raffle', 'raffle', $3, $4, $5, $6)
    `, [
      auditId,
      req.admin.username,
      raffleId,
      JSON.stringify({ reason, refunds_processed: refunds.length }),
      req.ip,
      req.get('User-Agent')
    ]);
    
    // Emit real-time update
    if (global.io) {
      global.io.to('raffle-updates').emit('raffle-cancelled', {
        raffle_id: raffleId,
        reason,
        refunds_count: refunds.length
      });
    }
    
    res.json({
      success: true,
      message: 'Raffle cancelled successfully',
      refunds_processed: refunds.length
    });
    
  } catch (error) {
    console.error('Cancel raffle error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel raffle',
      code: 'CANCEL_RAFFLE_ERROR' 
    });
  }
});

// GET /api/admin/settings
// Get raffle settings
router.get('/settings', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM raffle_settings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    res.json({
      success: true,
      settings: result.rows[0] || null
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      error: 'Failed to get settings',
      code: 'GET_SETTINGS_ERROR' 
    });
  }
});

// POST /api/admin/settings
// Update raffle settings
router.post('/settings', async (req, res) => {
  try {
    const { participants_limit, bet_amount, winner_percentage, organizer_percentage } = req.body;
    
    // Validate inputs
    if (participants_limit < 2 || participants_limit > 1000) {
      return res.status(400).json({ 
        error: 'Participants limit must be between 2 and 1000',
        code: 'INVALID_PARTICIPANTS_LIMIT' 
      });
    }
    
    if (bet_amount < 1 || bet_amount > 100) {
      return res.status(400).json({ 
        error: 'Bet amount must be between 1 and 100 stars',
        code: 'INVALID_BET_AMOUNT' 
      });
    }
    
    if (winner_percentage + organizer_percentage !== 100) {
      return res.status(400).json({ 
        error: 'Percentages must sum to 100',
        code: 'INVALID_PERCENTAGES' 
      });
    }
    
    // Deactivate current settings
    await query('UPDATE raffle_settings SET is_active = false');
    
    // Create new settings
    const result = await query(`
      INSERT INTO raffle_settings (participants_limit, bet_amount, winner_percentage, organizer_percentage)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [participants_limit, bet_amount, winner_percentage, organizer_percentage]);
    
    // Log admin action
    const auditId = uuidv4();
    await query(`
      INSERT INTO audit_logs (id, admin_user, action, target_type, details, ip_address, user_agent)
      VALUES ($1, $2, 'update_settings', 'settings', $3, $4, $5)
    `, [
      auditId,
      req.admin.username,
      JSON.stringify({ participants_limit, bet_amount, winner_percentage, organizer_percentage }),
      req.ip,
      req.get('User-Agent')
    ]);
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      error: 'Failed to update settings',
      code: 'UPDATE_SETTINGS_ERROR' 
    });
  }
});

// GET /api/admin/users
// Get users list
router.get('/users', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    
    let whereClause = '';
    const params = [limit, offset];
    
    if (search) {
      whereClause = 'WHERE u.username ILIKE $3 OR u.first_name ILIKE $3';
      params.push(`%${search}%`);
    }
    
    const result = await query(`
      SELECT 
        u.*,
        COUNT(b.id) as total_bids,
        COUNT(r.winner_id) as wins,
        COALESCE(SUM(CASE WHEN st.type = 'win' THEN st.amount ELSE 0 END), 0) as total_winnings,
        COALESCE(SUM(CASE WHEN st.type = 'bet' THEN ABS(st.amount) ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN bids b ON u.telegram_id = b.user_telegram_id AND b.status = 'confirmed'
      LEFT JOIN raffles r ON u.telegram_id = r.winner_id AND r.status = 'completed'
      LEFT JOIN star_transactions st ON u.telegram_id = st.user_telegram_id AND st.status = 'confirmed'
      ${whereClause}
      GROUP BY u.telegram_id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);
    
    res.json({
      success: true,
      users: result.rows,
      pagination: {
        limit,
        offset,
        has_more: result.rows.length === limit
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to get users',
      code: 'GET_USERS_ERROR' 
    });
  }
});

// GET /api/admin/audit-logs
// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const action = req.query.action || 'all';
    
    let whereClause = '';
    const params = [limit, offset];
    
    if (action !== 'all') {
      whereClause = 'WHERE action = $3';
      params.push(action);
    }
    
    const result = await query(`
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, params);
    
    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        limit,
        offset,
        has_more: result.rows.length === limit
      }
    });
    
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      error: 'Failed to get audit logs',
      code: 'GET_AUDIT_LOGS_ERROR' 
    });
  }
});

// GET /api/admin/transactions
// Get star transactions
router.get('/transactions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type || 'all';
    const status = req.query.status || 'all';
    
    let whereClause = '';
    const params = [limit, offset];
    let paramIndex = 3;
    
    const conditions = [];
    
    if (type !== 'all') {
      conditions.push(`st.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`st.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const result = await query(`
      SELECT st.*, u.username, u.first_name, r.id as raffle_display_id
      FROM star_transactions st
      LEFT JOIN users u ON st.user_telegram_id = u.telegram_id
      LEFT JOIN raffles r ON st.raffle_id = r.id
      ${whereClause}
      ORDER BY st.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);
    
    res.json({
      success: true,
      transactions: result.rows,
      pagination: {
        limit,
        offset,
        has_more: result.rows.length === limit
      }
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to get transactions',
      code: 'GET_TRANSACTIONS_ERROR' 
    });
  }
});

module.exports = router;