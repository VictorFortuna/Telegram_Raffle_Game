const express = require('express');
const router = express.Router();
const Raffle = require('../models/Raffle');
const User = require('../models/User');
const { query } = require('../database/connection');

// GET /api/raffle/current
// Get current active raffle information
router.get('/current', async (req, res) => {
  try {
    const currentRaffle = await Raffle.getCurrent();
    
    if (!currentRaffle) {
      // Create new raffle if none exists
      const settings = await query('SELECT * FROM raffle_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
      const setting = settings.rows[0];
      
      if (!setting) {
        return res.status(500).json({ 
          error: 'No raffle settings found',
          code: 'NO_SETTINGS' 
        });
      }
      
      const newRaffle = await Raffle.create(setting.participants_limit, setting.bet_amount);
      
      return res.json({
        success: true,
        raffle: {
          id: newRaffle.id,
          required_participants: newRaffle.required_participants,
          bet_amount: newRaffle.bet_amount,
          current_participants: newRaffle.current_participants,
          total_pot: newRaffle.total_pot,
          status: newRaffle.status,
          created_at: newRaffle.created_at,
          progress_percentage: 0
        }
      });
    }
    
    const progressPercentage = Math.min(
      (currentRaffle.current_participants / currentRaffle.required_participants) * 100,
      100
    );
    
    res.json({
      success: true,
      raffle: {
        id: currentRaffle.id,
        required_participants: currentRaffle.required_participants,
        bet_amount: currentRaffle.bet_amount,
        current_participants: currentRaffle.current_participants,
        total_pot: currentRaffle.total_pot,
        status: currentRaffle.status,
        created_at: currentRaffle.created_at,
        progress_percentage: progressPercentage
      }
    });
    
  } catch (error) {
    console.error('Get current raffle error:', error);
    res.status(500).json({ 
      error: 'Failed to get current raffle',
      code: 'GET_RAFFLE_ERROR' 
    });
  }
});

// POST /api/raffle/bet
// Place a bet in the current raffle
router.post('/bet', async (req, res) => {
  try {
    const telegramUser = req.telegramUser;
    
    if (!telegramUser) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }
    
    // Get current raffle
    let currentRaffle = await Raffle.getCurrent();
    
    if (!currentRaffle) {
      // Create new raffle if none exists
      const settings = await query('SELECT * FROM raffle_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
      const setting = settings.rows[0];
      
      if (!setting) {
        return res.status(500).json({ 
          error: 'No raffle settings found',
          code: 'NO_SETTINGS' 
        });
      }
      
      currentRaffle = await Raffle.create(setting.participants_limit, setting.bet_amount);
    }
    
    if (currentRaffle.status !== 'active') {
      return res.status(400).json({ 
        error: 'Raffle is not active',
        code: 'RAFFLE_NOT_ACTIVE' 
      });
    }
    
    // Check if user already participated
    const existingBid = await query(
      'SELECT id FROM bids WHERE raffle_id = $1 AND user_telegram_id = $2',
      [currentRaffle.id, telegramUser.id]
    );
    
    if (existingBid.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You have already placed a bet in this raffle',
        code: 'ALREADY_PARTICIPATED' 
      });
    }
    
    // Check if raffle is full
    if (currentRaffle.current_participants >= currentRaffle.required_participants) {
      return res.status(400).json({ 
        error: 'Raffle is full',
        code: 'RAFFLE_FULL' 
      });
    }
    
    // Add participant to raffle
    const updatedRaffle = await Raffle.addParticipant(
      currentRaffle.id, 
      telegramUser.id, 
      currentRaffle.bet_amount
    );
    
    // Emit real-time update via Socket.IO
    if (global.io) {
      global.io.to('raffle-updates').emit('participant-joined', {
        raffle_id: updatedRaffle.id,
        current_participants: updatedRaffle.current_participants,
        required_participants: updatedRaffle.required_participants,
        total_pot: updatedRaffle.total_pot,
        user: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          username: telegramUser.username
        }
      });
    }
    
    // Check if raffle is now complete
    if (updatedRaffle.current_participants >= updatedRaffle.required_participants) {
      // Complete the raffle (draw winner)
      const completionResult = await Raffle.complete(updatedRaffle.id);
      
      // Emit winner announcement
      if (global.io) {
        global.io.to('raffle-updates').emit('raffle-completed', {
          raffle: completionResult.raffle,
          winner: completionResult.winner,
          participants: completionResult.participants
        });
      }
      
      // TODO: Send Telegram notifications to all participants
      // This would be handled by the Telegram service
      
      res.json({
        success: true,
        message: 'Bet placed successfully! Raffle completed.',
        raffle: completionResult.raffle,
        winner: completionResult.winner,
        is_winner: completionResult.winner.user_telegram_id === telegramUser.id
      });
    } else {
      res.json({
        success: true,
        message: 'Bet placed successfully!',
        raffle: {
          id: updatedRaffle.id,
          current_participants: updatedRaffle.current_participants,
          required_participants: updatedRaffle.required_participants,
          total_pot: updatedRaffle.total_pot,
          progress_percentage: (updatedRaffle.current_participants / updatedRaffle.required_participants) * 100
        }
      });
    }
    
  } catch (error) {
    console.error('Place bet error:', error);
    
    if (error.message.includes('already participated')) {
      return res.status(400).json({ 
        error: error.message,
        code: 'ALREADY_PARTICIPATED' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to place bet',
      code: 'BET_ERROR' 
    });
  }
});

// GET /api/raffle/:id/participants
// Get participants for a specific raffle
router.get('/:id/participants', async (req, res) => {
  try {
    const raffleId = req.params.id;
    
    const participants = await Raffle.getParticipants(raffleId);
    
    res.json({
      success: true,
      participants: participants.map(p => ({
        telegram_id: p.telegram_id,
        username: p.username,
        first_name: p.first_name,
        placed_at: p.placed_at
      }))
    });
    
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ 
      error: 'Failed to get participants',
      code: 'GET_PARTICIPANTS_ERROR' 
    });
  }
});

// GET /api/raffle/history
// Get raffle history with pagination
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 items
    const offset = parseInt(req.query.offset) || 0;
    
    const history = await Raffle.getHistory(limit, offset);
    
    res.json({
      success: true,
      history: history.map(raffle => ({
        id: raffle.id,
        required_participants: raffle.required_participants,
        current_participants: raffle.current_participants,
        total_pot: raffle.total_pot,
        status: raffle.status,
        winner_id: raffle.winner_id,
        winner_username: raffle.winner_username,
        winner_first_name: raffle.winner_first_name,
        winner_amount: raffle.winner_amount,
        organizer_amount: raffle.organizer_amount,
        created_at: raffle.created_at,
        completed_at: raffle.completed_at
      })),
      pagination: {
        limit,
        offset,
        has_more: history.length === limit
      }
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      error: 'Failed to get raffle history',
      code: 'GET_HISTORY_ERROR' 
    });
  }
});

// GET /api/raffle/stats
// Get raffle statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Raffle.getStats();
    const [activeUsers, totalUsers] = await Promise.all([
      User.getActiveUsersCount(),
      User.getTotalUsersCount()
    ]);
    
    res.json({
      success: true,
      stats: {
        total_raffles: parseInt(stats.total_raffles),
        completed_raffles: parseInt(stats.completed_raffles),
        cancelled_raffles: parseInt(stats.cancelled_raffles),
        active_raffles: parseInt(stats.active_raffles),
        total_volume: parseInt(stats.total_volume),
        total_fees: parseInt(stats.total_fees),
        avg_participants: parseFloat(stats.avg_participants).toFixed(1),
        active_users: activeUsers,
        total_users: totalUsers,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Get raffle stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get raffle statistics',
      code: 'GET_STATS_ERROR' 
    });
  }
});

// GET /api/raffle/:id
// Get specific raffle details
router.get('/:id', async (req, res) => {
  try {
    const raffleId = req.params.id;
    
    const raffle = await Raffle.findById(raffleId);
    
    if (!raffle) {
      return res.status(404).json({ 
        error: 'Raffle not found',
        code: 'RAFFLE_NOT_FOUND' 
      });
    }
    
    const participants = await Raffle.getParticipants(raffleId);
    
    res.json({
      success: true,
      raffle: {
        id: raffle.id,
        required_participants: raffle.required_participants,
        bet_amount: raffle.bet_amount,
        current_participants: raffle.current_participants,
        total_pot: raffle.total_pot,
        status: raffle.status,
        winner_id: raffle.winner_id,
        winner_amount: raffle.winner_amount,
        organizer_amount: raffle.organizer_amount,
        created_at: raffle.created_at,
        completed_at: raffle.completed_at,
        progress_percentage: raffle.status === 'active' 
          ? (raffle.current_participants / raffle.required_participants) * 100
          : 100
      },
      participants: participants.map(p => ({
        telegram_id: p.telegram_id,
        username: p.username,
        first_name: p.first_name,
        placed_at: p.placed_at
      }))
    });
    
  } catch (error) {
    console.error('Get raffle details error:', error);
    res.status(500).json({ 
      error: 'Failed to get raffle details',
      code: 'GET_RAFFLE_DETAILS_ERROR' 
    });
  }
});

module.exports = router;