const { query, transaction } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Raffle {
  constructor(raffleData) {
    this.id = raffleData.id;
    this.required_participants = raffleData.required_participants;
    this.bet_amount = raffleData.bet_amount;
    this.current_participants = raffleData.current_participants || 0;
    this.total_pot = raffleData.total_pot || 0;
    this.status = raffleData.status || 'active';
    this.winner_id = raffleData.winner_id;
    this.winner_amount = raffleData.winner_amount;
    this.organizer_amount = raffleData.organizer_amount;
    this.created_at = raffleData.created_at;
    this.completed_at = raffleData.completed_at;
    this.random_seed = raffleData.random_seed;
  }

  // Create a new raffle
  static async create(requiredParticipants, betAmount) {
    try {
      const raffleId = uuidv4();
      const result = await query(`
        INSERT INTO raffles (id, required_participants, bet_amount, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING *
      `, [raffleId, requiredParticipants, betAmount]);
      
      return new Raffle(result.rows[0]);
    } catch (error) {
      console.error('Error creating raffle:', error);
      throw error;
    }
  }

  // Get current active raffle
  static async getCurrent() {
    try {
      const result = await query(`
        SELECT r.*, 
               COALESCE(r.current_participants, 0) as current_participants,
               COALESCE(r.total_pot, 0) as total_pot
        FROM raffles r
        WHERE r.status = 'active'
        ORDER BY r.created_at ASC
        LIMIT 1
      `);
      
      return result.rows[0] ? new Raffle(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting current raffle:', error);
      throw error;
    }
  }

  // Get raffle by ID
  static async findById(raffleId) {
    try {
      const result = await query(
        'SELECT * FROM raffles WHERE id = $1',
        [raffleId]
      );
      
      return result.rows[0] ? new Raffle(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding raffle by ID:', error);
      throw error;
    }
  }

  // Get raffle participants
  static async getParticipants(raffleId) {
    try {
      const result = await query(`
        SELECT u.telegram_id, u.username, u.first_name, b.placed_at, b.status
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

  // Add participant to raffle
  static async addParticipant(raffleId, telegramId, amount = 1) {
    try {
      return await transaction(async (client) => {
        // Check if user already participated
        const existingBid = await client.query(
          'SELECT id FROM bids WHERE raffle_id = $1 AND user_telegram_id = $2',
          [raffleId, telegramId]
        );
        
        if (existingBid.rows.length > 0) {
          throw new Error('User already participated in this raffle');
        }
        
        // Add bid
        const bidId = uuidv4();
        await client.query(`
          INSERT INTO bids (id, raffle_id, user_telegram_id, amount, status)
          VALUES ($1, $2, $3, $4, 'confirmed')
        `, [bidId, raffleId, telegramId, amount]);
        
        // Update raffle counters
        const result = await client.query(`
          UPDATE raffles 
          SET 
            current_participants = current_participants + 1,
            total_pot = total_pot + $2
          WHERE id = $1
          RETURNING *
        `, [raffleId, amount]);
        
        // Record transaction
        const transactionId = uuidv4();
        await client.query(`
          INSERT INTO star_transactions (id, user_telegram_id, amount, type, status, raffle_id, bid_id)
          VALUES ($1, $2, $3, 'bet', 'confirmed', $4, $5)
        `, [transactionId, telegramId, -amount, raffleId, bidId]);
        
        return new Raffle(result.rows[0]);
      });
    } catch (error) {
      console.error('Error adding participant to raffle:', error);
      throw error;
    }
  }

  // Complete raffle (draw winner)
  static async complete(raffleId) {
    try {
      return await transaction(async (client) => {
        // Get raffle details
        const raffleResult = await client.query(
          'SELECT * FROM raffles WHERE id = $1 AND status = $2',
          [raffleId, 'active']
        );
        
        if (raffleResult.rows.length === 0) {
          throw new Error('Raffle not found or not active');
        }
        
        const raffle = raffleResult.rows[0];
        
        // Get all participants
        const participantsResult = await client.query(`
          SELECT user_telegram_id, placed_at FROM bids 
          WHERE raffle_id = $1 AND status = 'confirmed'
          ORDER BY placed_at ASC
        `, [raffleId]);
        
        const participants = participantsResult.rows;
        
        if (participants.length === 0) {
          throw new Error('No confirmed participants found');
        }
        
        // Generate random seed and select winner
        const randomSeed = crypto.randomBytes(32).toString('hex');
        const winnerIndex = parseInt(crypto.createHash('sha256')
          .update(randomSeed + raffleId)
          .digest('hex'), 16) % participants.length;
        
        const winner = participants[winnerIndex];
        
        // Calculate amounts
        const totalPot = raffle.total_pot;
        const winnerAmount = Math.floor(totalPot * 0.70); // 70% to winner
        const organizerAmount = totalPot - winnerAmount; // 30% to organizer
        
        // Update raffle
        const completedRaffle = await client.query(`
          UPDATE raffles 
          SET 
            status = 'completed',
            winner_id = $2,
            winner_amount = $3,
            organizer_amount = $4,
            completed_at = CURRENT_TIMESTAMP,
            random_seed = $5
          WHERE id = $1
          RETURNING *
        `, [raffleId, winner.user_telegram_id, winnerAmount, organizerAmount, randomSeed]);
        
        // Record winner transaction
        const winnerTransactionId = uuidv4();
        await client.query(`
          INSERT INTO star_transactions (id, user_telegram_id, amount, type, status, raffle_id)
          VALUES ($1, $2, $3, 'win', 'confirmed', $4)
        `, [winnerTransactionId, winner.user_telegram_id, winnerAmount, raffleId]);
        
        // Record organizer fee transaction
        const feeTransactionId = uuidv4();
        await client.query(`
          INSERT INTO star_transactions (id, user_telegram_id, amount, type, status, raffle_id)
          VALUES ($1, $2, $3, 'fee', 'confirmed', $4)
        `, [feeTransactionId, null, organizerAmount, raffleId]);
        
        return {
          raffle: new Raffle(completedRaffle.rows[0]),
          winner: winner,
          participants: participants
        };
      });
    } catch (error) {
      console.error('Error completing raffle:', error);
      throw error;
    }
  }

  // Cancel raffle
  static async cancel(raffleId, reason = 'Cancelled by admin') {
    try {
      return await transaction(async (client) => {
        // Update raffle status
        await client.query(
          'UPDATE raffles SET status = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $1',
          [raffleId, 'cancelled']
        );
        
        // Get all confirmed bids
        const bidsResult = await client.query(`
          SELECT b.*, u.telegram_id 
          FROM bids b
          JOIN users u ON b.user_telegram_id = u.telegram_id
          WHERE b.raffle_id = $1 AND b.status = 'confirmed'
        `, [raffleId]);
        
        // Process refunds
        for (const bid of bidsResult.rows) {
          const refundId = uuidv4();
          await client.query(`
            INSERT INTO star_transactions (id, user_telegram_id, amount, type, status, raffle_id, bid_id)
            VALUES ($1, $2, $3, 'refund', 'confirmed', $4, $5)
          `, [refundId, bid.user_telegram_id, bid.amount, raffleId, bid.id]);
        }
        
        return bidsResult.rows;
      });
    } catch (error) {
      console.error('Error cancelling raffle:', error);
      throw error;
    }
  }

  // Get raffle history
  static async getHistory(limit = 10, offset = 0) {
    try {
      const result = await query(`
        SELECT r.*, u.username as winner_username, u.first_name as winner_first_name
        FROM raffles r
        LEFT JOIN users u ON r.winner_id = u.telegram_id
        WHERE r.status IN ('completed', 'cancelled')
        ORDER BY r.completed_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      return result.rows.map(row => new Raffle(row));
    } catch (error) {
      console.error('Error getting raffle history:', error);
      throw error;
    }
  }

  // Get raffle statistics
  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_raffles,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_raffles,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_raffles,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_raffles,
          COALESCE(SUM(total_pot), 0) as total_volume,
          COALESCE(SUM(organizer_amount), 0) as total_fees,
          COALESCE(AVG(current_participants), 0) as avg_participants
        FROM raffles
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting raffle stats:', error);
      throw error;
    }
  }
}

module.exports = Raffle;