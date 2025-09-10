const Raffle = require('../models/Raffle');
const { query } = require('../database/connection');
const telegramService = require('./telegram');

class RaffleService {
  constructor() {
    this.currentRaffleCache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 30 * 1000; // 30 seconds
  }

  // Get current raffle with caching
  async getCurrentRaffle() {
    const now = Date.now();
    
    // Return cached raffle if still valid
    if (this.currentRaffleCache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.currentRaffleCache;
    }

    try {
      // Get from database
      const raffle = await Raffle.getCurrent();
      
      // Create new raffle if none exists
      if (!raffle) {
        const newRaffle = await this.createNewRaffle();
        this.updateCache(newRaffle);
        return newRaffle;
      }

      this.updateCache(raffle);
      return raffle;
    } catch (error) {
      console.error('Error getting current raffle:', error);
      throw error;
    }
  }

  // Update raffle cache
  updateCache(raffle) {
    this.currentRaffleCache = raffle;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }

  // Clear raffle cache
  clearCache() {
    this.currentRaffleCache = null;
    this.cacheExpiry = null;
  }

  // Create new raffle based on settings
  async createNewRaffle() {
    try {
      const settingsResult = await query(`
        SELECT * FROM raffle_settings 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      const settings = settingsResult.rows[0];
      
      if (!settings) {
        throw new Error('No active raffle settings found');
      }

      const raffle = await Raffle.create(settings.participants_limit, settings.bet_amount);
      
      console.log(`New raffle created: ${raffle.id}`);
      return raffle;
    } catch (error) {
      console.error('Error creating new raffle:', error);
      throw error;
    }
  }

  // Add participant to current raffle
  async addParticipant(telegramId, amount = 1) {
    try {
      // Get current raffle
      const currentRaffle = await this.getCurrentRaffle();
      
      if (!currentRaffle) {
        throw new Error('No active raffle found');
      }

      if (currentRaffle.status !== 'active') {
        throw new Error('Raffle is not active');
      }

      // Check if raffle is full
      if (currentRaffle.current_participants >= currentRaffle.required_participants) {
        throw new Error('Raffle is full');
      }

      // Add participant
      const updatedRaffle = await Raffle.addParticipant(currentRaffle.id, telegramId, amount);
      
      // Update cache
      this.updateCache(updatedRaffle);
      
      // Check if raffle is now complete
      if (updatedRaffle.current_participants >= updatedRaffle.required_participants) {
        // Complete the raffle
        const completionResult = await this.completeRaffle(updatedRaffle.id);
        
        // Clear cache since raffle is completed
        this.clearCache();
        
        return {
          raffle: completionResult.raffle,
          winner: completionResult.winner,
          participants: completionResult.participants,
          completed: true
        };
      }

      return {
        raffle: updatedRaffle,
        completed: false
      };
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  // Complete raffle and select winner
  async completeRaffle(raffleId) {
    try {
      console.log(`Completing raffle: ${raffleId}`);
      
      const result = await Raffle.complete(raffleId);
      
      // Notify participants via Telegram
      try {
        await telegramService.notifyRaffleCompletion(
          raffleId,
          result.winner,
          result.participants,
          result.raffle.winner_amount
        );
      } catch (notifyError) {
        console.error('Failed to notify participants:', notifyError);
        // Don't throw error here - raffle completion should succeed even if notifications fail
      }

      console.log(`Raffle completed: ${raffleId}, Winner: ${result.winner.user_telegram_id}`);
      
      return result;
    } catch (error) {
      console.error('Error completing raffle:', error);
      throw error;
    }
  }

  // Cancel raffle
  async cancelRaffle(raffleId, reason = 'Cancelled by admin') {
    try {
      console.log(`Cancelling raffle: ${raffleId}, Reason: ${reason}`);
      
      const participants = await Raffle.cancel(raffleId, reason);
      
      // Clear cache if this was the current raffle
      if (this.currentRaffleCache && this.currentRaffleCache.id === raffleId) {
        this.clearCache();
      }

      // Notify participants via Telegram
      try {
        await telegramService.notifyRaffleCancellation(participants, reason);
      } catch (notifyError) {
        console.error('Failed to notify participants about cancellation:', notifyError);
      }

      console.log(`Raffle cancelled: ${raffleId}, Refunded ${participants.length} participants`);
      
      return { participants, refunded: participants.length };
    } catch (error) {
      console.error('Error cancelling raffle:', error);
      throw error;
    }
  }

  // Get raffle statistics
  async getStatistics() {
    try {
      const stats = await Raffle.getStats();
      
      // Get additional statistics
      const additionalStats = await query(`
        SELECT 
          COUNT(DISTINCT user_telegram_id) as unique_participants,
          AVG(CASE WHEN status = 'completed' THEN 
            EXTRACT(EPOCH FROM (completed_at - created_at))/60 
          END) as avg_completion_time_minutes,
          COUNT(CASE WHEN status = 'completed' AND completed_at > CURRENT_DATE THEN 1 END) as completed_today,
          COALESCE(SUM(CASE WHEN status = 'completed' AND completed_at > CURRENT_DATE THEN total_pot ELSE 0 END), 0) as volume_today
        FROM raffles r
        LEFT JOIN bids b ON r.id = b.raffle_id
      `);

      const additional = additionalStats.rows[0];

      return {
        ...stats,
        unique_participants: parseInt(additional.unique_participants || 0),
        avg_completion_time_minutes: parseFloat(additional.avg_completion_time_minutes || 0),
        completed_today: parseInt(additional.completed_today || 0),
        volume_today: parseInt(additional.volume_today || 0)
      };
    } catch (error) {
      console.error('Error getting raffle statistics:', error);
      throw error;
    }
  }

  // Get raffle participants with user info
  async getRaffleParticipantsWithInfo(raffleId) {
    try {
      const result = await query(`
        SELECT 
          b.id,
          b.user_telegram_id,
          b.amount,
          b.placed_at,
          b.status,
          u.username,
          u.first_name,
          u.last_name
        FROM bids b
        JOIN users u ON b.user_telegram_id = u.telegram_id
        WHERE b.raffle_id = $1 AND b.status = 'confirmed'
        ORDER BY b.placed_at ASC
      `, [raffleId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting raffle participants:', error);
      throw error;
    }
  }

  // Check if user can participate in current raffle
  async canUserParticipate(telegramId) {
    try {
      const currentRaffle = await this.getCurrentRaffle();
      
      if (!currentRaffle || currentRaffle.status !== 'active') {
        return { canParticipate: false, reason: 'No active raffle' };
      }

      if (currentRaffle.current_participants >= currentRaffle.required_participants) {
        return { canParticipate: false, reason: 'Raffle is full' };
      }

      // Check if user already participated
      const existingBid = await query(
        'SELECT id FROM bids WHERE raffle_id = $1 AND user_telegram_id = $2',
        [currentRaffle.id, telegramId]
      );

      if (existingBid.rows.length > 0) {
        return { canParticipate: false, reason: 'Already participated' };
      }

      return { canParticipate: true, raffle: currentRaffle };
    } catch (error) {
      console.error('Error checking user participation eligibility:', error);
      return { canParticipate: false, reason: 'System error' };
    }
  }

  // Get user's raffle history
  async getUserRaffleHistory(telegramId, limit = 10, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          r.id,
          r.required_participants,
          r.current_participants,
          r.total_pot,
          r.status,
          r.winner_id,
          r.winner_amount,
          r.created_at,
          r.completed_at,
          b.amount as bet_amount,
          b.placed_at,
          CASE WHEN r.winner_id = $1 THEN true ELSE false END as is_winner,
          winner.first_name as winner_first_name,
          winner.username as winner_username
        FROM bids b
        JOIN raffles r ON b.raffle_id = r.id
        LEFT JOIN users winner ON r.winner_id = winner.telegram_id
        WHERE b.user_telegram_id = $1 AND b.status = 'confirmed'
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `, [telegramId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('Error getting user raffle history:', error);
      throw error;
    }
  }

  // Update raffle settings
  async updateSettings(participantsLimit, betAmount, winnerPercentage, organizerPercentage) {
    try {
      // Validate settings
      if (participantsLimit < 2 || participantsLimit > 1000) {
        throw new Error('Participants limit must be between 2 and 1000');
      }

      if (betAmount < 1 || betAmount > 100) {
        throw new Error('Bet amount must be between 1 and 100 stars');
      }

      if (winnerPercentage + organizerPercentage !== 100) {
        throw new Error('Winner and organizer percentages must sum to 100');
      }

      // Deactivate current settings
      await query('UPDATE raffle_settings SET is_active = false');

      // Create new settings
      const result = await query(`
        INSERT INTO raffle_settings (participants_limit, bet_amount, winner_percentage, organizer_percentage)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [participantsLimit, betAmount, winnerPercentage, organizerPercentage]);

      console.log('Raffle settings updated:', result.rows[0]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating raffle settings:', error);
      throw error;
    }
  }

  // Get current raffle settings
  async getCurrentSettings() {
    try {
      const result = await query(`
        SELECT * FROM raffle_settings 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting current settings:', error);
      throw error;
    }
  }

  // Cleanup old completed raffles (for maintenance)
  async cleanupOldRaffles(daysOld = 30) {
    try {
      const result = await query(`
        DELETE FROM raffles 
        WHERE status IN ('completed', 'cancelled') 
        AND completed_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
        RETURNING COUNT(*)
      `);

      const deletedCount = result.rows[0]?.count || 0;
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old raffles`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old raffles:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const currentRaffle = await this.getCurrentRaffle();
      const settings = await this.getCurrentSettings();
      
      return {
        status: 'healthy',
        current_raffle: currentRaffle ? {
          id: currentRaffle.id,
          participants: currentRaffle.current_participants,
          required: currentRaffle.required_participants,
          status: currentRaffle.status
        } : null,
        settings: settings ? {
          participants_limit: settings.participants_limit,
          bet_amount: settings.bet_amount
        } : null,
        cache_status: {
          has_cache: !!this.currentRaffleCache,
          cache_expires_in: this.cacheExpiry ? Math.max(0, this.cacheExpiry - Date.now()) : 0
        }
      };
    } catch (error) {
      console.error('Raffle service health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Export singleton instance
const raffleService = new RaffleService();
module.exports = raffleService;