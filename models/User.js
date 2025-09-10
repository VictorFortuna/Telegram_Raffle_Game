const { query } = require('../database/connection');

class User {
  constructor(userData) {
    this.telegram_id = userData.telegram_id;
    this.username = userData.username;
    this.first_name = userData.first_name;
    this.last_name = userData.last_name;
    this.language_code = userData.language_code || 'en';
  }

  // Create or update user from Telegram data
  static async upsert(telegramUser) {
    try {
      const result = await query(`
        INSERT INTO users (telegram_id, username, first_name, last_name, language_code, last_active)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (telegram_id) DO UPDATE SET
          username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          language_code = EXCLUDED.language_code,
          last_active = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        telegramUser.id,
        telegramUser.username,
        telegramUser.first_name,
        telegramUser.last_name,
        telegramUser.language_code
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  // Find user by Telegram ID
  static async findByTelegramId(telegramId) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by Telegram ID:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getStats(telegramId) {
    try {
      const result = await query(`
        SELECT 
          u.telegram_id,
          u.username,
          u.first_name,
          COUNT(b.id) as total_bids,
          COUNT(r.winner_id) as wins,
          COALESCE(SUM(CASE WHEN st.type = 'win' THEN st.amount ELSE 0 END), 0) as total_winnings,
          COALESCE(SUM(CASE WHEN st.type = 'bet' THEN ABS(st.amount) ELSE 0 END), 0) as total_spent
        FROM users u
        LEFT JOIN bids b ON u.telegram_id = b.user_telegram_id AND b.status = 'confirmed'
        LEFT JOIN raffles r ON u.telegram_id = r.winner_id AND r.status = 'completed'
        LEFT JOIN star_transactions st ON u.telegram_id = st.user_telegram_id AND st.status = 'confirmed'
        WHERE u.telegram_id = $1
        GROUP BY u.telegram_id, u.username, u.first_name
      `, [telegramId]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Get active users count
  static async getActiveUsersCount() {
    try {
      const result = await query(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE last_active > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND is_active = true
      `);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting active users count:', error);
      throw error;
    }
  }

  // Get total users count
  static async getTotalUsersCount() {
    try {
      const result = await query(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE is_active = true
      `);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting total users count:', error);
      throw error;
    }
  }

  // Update last active timestamp
  static async updateLastActive(telegramId) {
    try {
      await query(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE telegram_id = $1',
        [telegramId]
      );
    } catch (error) {
      console.error('Error updating last active:', error);
      throw error;
    }
  }

  // Deactivate user
  static async deactivate(telegramId) {
    try {
      const result = await query(
        'UPDATE users SET is_active = false WHERE telegram_id = $1 RETURNING *',
        [telegramId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }
}

module.exports = User;