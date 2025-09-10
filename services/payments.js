const axios = require('axios');
const { query, transaction } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
  }

  // Create Telegram Stars invoice
  async createInvoice(chatId, amount, description, payload) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendInvoice`, {
        chat_id: chatId,
        title: 'Raffle Stars Entry',
        description: description,
        payload: payload,
        provider_token: '', // Empty for Telegram Stars
        currency: 'XTR', // Telegram Stars currency code
        prices: [
          {
            label: 'Raffle Entry',
            amount: amount // Amount in Telegram Stars
          }
        ],
        max_tip_amount: 0,
        suggested_tip_amounts: [],
        photo_url: 'https://your-domain.com/raffle-icon.png', // Optional
        photo_size: 512,
        photo_width: 512,
        photo_height: 512,
        need_name: false,
        need_phone_number: false,
        need_email: false,
        need_shipping_address: false,
        send_phone_number_to_provider: false,
        send_email_to_provider: false,
        is_flexible: false
      });

      return response.data;
    } catch (error) {
      console.error('Failed to create Telegram Stars invoice:', error.response?.data || error.message);
      throw error;
    }
  }

  // Process successful payment
  async processSuccessfulPayment(payment, userId, raffleId) {
    try {
      return await transaction(async (client) => {
        // Create transaction record
        const transactionId = uuidv4();
        await client.query(`
          INSERT INTO star_transactions (
            id, user_telegram_id, amount, type, status, 
            telegram_payment_id, raffle_id, metadata
          )
          VALUES ($1, $2, $3, 'bet', 'confirmed', $4, $5, $6)
        `, [
          transactionId,
          userId,
          -payment.total_amount, // Negative for outgoing payment
          payment.telegram_payment_charge_id,
          raffleId,
          JSON.stringify({
            currency: payment.currency,
            invoice_payload: payment.invoice_payload,
            shipping_option_id: payment.shipping_option_id,
            order_info: payment.order_info
          })
        ]);

        console.log(`Payment processed: ${transactionId} for user ${userId}`);
        
        return transactionId;
      });
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  // Process refund
  async processRefund(userId, amount, raffleId, reason = 'Raffle cancelled') {
    try {
      return await transaction(async (client) => {
        // Create refund transaction record
        const transactionId = uuidv4();
        await client.query(`
          INSERT INTO star_transactions (
            id, user_telegram_id, amount, type, status, 
            raffle_id, metadata
          )
          VALUES ($1, $2, $3, 'refund', 'confirmed', $4, $5)
        `, [
          transactionId,
          userId,
          amount, // Positive for incoming refund
          raffleId,
          JSON.stringify({ reason })
        ]);

        // Note: Actual Telegram Stars refund would need to be processed via Telegram Bot API
        // This currently just records the refund in our system
        // In a real implementation, you'd need to use Telegram's refund API

        console.log(`Refund processed: ${transactionId} for user ${userId}, amount: ${amount}`);
        
        return transactionId;
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Process winner payout
  async processWinnerPayout(userId, amount, raffleId) {
    try {
      return await transaction(async (client) => {
        // Create winner transaction record
        const transactionId = uuidv4();
        await client.query(`
          INSERT INTO star_transactions (
            id, user_telegram_id, amount, type, status, 
            raffle_id, metadata
          )
          VALUES ($1, $2, $3, 'win', 'confirmed', $4, $5)
        `, [
          transactionId,
          userId,
          amount, // Positive for incoming payout
          raffleId,
          JSON.stringify({ type: 'winner_payout' })
        ]);

        // Note: Actual Telegram Stars payout would need to be processed via Telegram Bot API
        // This currently just records the payout in our system
        // In a real implementation, you'd need to use Telegram's payout API

        console.log(`Winner payout processed: ${transactionId} for user ${userId}, amount: ${amount}`);
        
        return transactionId;
      });
    } catch (error) {
      console.error('Error processing winner payout:', error);
      throw error;
    }
  }

  // Record organizer fee
  async recordOrganizerFee(amount, raffleId) {
    try {
      const transactionId = uuidv4();
      await query(`
        INSERT INTO star_transactions (
          id, user_telegram_id, amount, type, status, 
          raffle_id, metadata
        )
        VALUES ($1, NULL, $2, 'fee', 'confirmed', $3, $4)
      `, [
        transactionId,
        amount, // Positive for organizer revenue
        raffleId,
        JSON.stringify({ type: 'organizer_fee' })
      ]);

      console.log(`Organizer fee recorded: ${transactionId}, amount: ${amount}`);
      
      return transactionId;
    } catch (error) {
      console.error('Error recording organizer fee:', error);
      throw error;
    }
  }

  // Get user's transaction history
  async getUserTransactionHistory(userId, limit = 20, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          st.*,
          r.id as raffle_display_id,
          r.status as raffle_status,
          r.completed_at as raffle_completed_at
        FROM star_transactions st
        LEFT JOIN raffles r ON st.raffle_id = r.id
        WHERE st.user_telegram_id = $1
        ORDER BY st.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('Error getting user transaction history:', error);
      throw error;
    }
  }

  // Get user's balance (sum of all confirmed transactions)
  async getUserBalance(userId) {
    try {
      const result = await query(`
        SELECT COALESCE(SUM(amount), 0) as balance
        FROM star_transactions 
        WHERE user_telegram_id = $1 AND status = 'confirmed'
      `, [userId]);

      return parseInt(result.rows[0].balance || 0);
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw error;
    }
  }

  // Get payment statistics
  async getPaymentStatistics() {
    try {
      const result = await query(`
        SELECT 
          type,
          status,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM star_transactions
        GROUP BY type, status
        ORDER BY type, status
      `);

      // Process results into a more useful format
      const stats = {
        bets: { pending: 0, confirmed: 0, failed: 0 },
        wins: { pending: 0, confirmed: 0, failed: 0 },
        refunds: { pending: 0, confirmed: 0, failed: 0 },
        fees: { pending: 0, confirmed: 0, failed: 0 },
        totals: {
          total_volume: 0,
          total_payouts: 0,
          total_fees: 0,
          total_refunds: 0
        }
      };

      result.rows.forEach(row => {
        if (stats[row.type + 's']) {
          stats[row.type + 's'][row.status] = parseInt(row.count);
          
          // Calculate totals
          if (row.status === 'confirmed') {
            switch (row.type) {
              case 'bet':
                stats.totals.total_volume += Math.abs(parseInt(row.total_amount));
                break;
              case 'win':
                stats.totals.total_payouts += parseInt(row.total_amount);
                break;
              case 'fee':
                stats.totals.total_fees += parseInt(row.total_amount);
                break;
              case 'refund':
                stats.totals.total_refunds += parseInt(row.total_amount);
                break;
            }
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting payment statistics:', error);
      throw error;
    }
  }

  // Validate pre-checkout query
  async validatePreCheckout(preCheckoutQuery) {
    try {
      const { id, from, currency, total_amount, invoice_payload } = preCheckoutQuery;

      // Basic validation
      if (currency !== 'XTR') {
        return {
          valid: false,
          error_message: 'Invalid currency. Only Telegram Stars (XTR) are accepted.'
        };
      }

      if (total_amount <= 0) {
        return {
          valid: false,
          error_message: 'Invalid amount.'
        };
      }

      // Parse payload to get raffle info
      let payloadData;
      try {
        payloadData = JSON.parse(invoice_payload);
      } catch (error) {
        return {
          valid: false,
          error_message: 'Invalid payment data.'
        };
      }

      // Check if raffle is still active and has space
      const raffleResult = await query(
        'SELECT * FROM raffles WHERE id = $1 AND status = $2',
        [payloadData.raffleId, 'active']
      );

      if (raffleResult.rows.length === 0) {
        return {
          valid: false,
          error_message: 'Raffle is no longer active.'
        };
      }

      const raffle = raffleResult.rows[0];
      
      if (raffle.current_participants >= raffle.required_participants) {
        return {
          valid: false,
          error_message: 'Raffle is full.'
        };
      }

      // Check if user already participated
      const bidResult = await query(
        'SELECT id FROM bids WHERE raffle_id = $1 AND user_telegram_id = $2',
        [payloadData.raffleId, from.id]
      );

      if (bidResult.rows.length > 0) {
        return {
          valid: false,
          error_message: 'You have already participated in this raffle.'
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating pre-checkout:', error);
      return {
        valid: false,
        error_message: 'Validation failed. Please try again.'
      };
    }
  }

  // Handle failed payment
  async handleFailedPayment(userId, raffleId, reason, metadata = {}) {
    try {
      const transactionId = uuidv4();
      await query(`
        INSERT INTO star_transactions (
          id, user_telegram_id, amount, type, status, 
          raffle_id, metadata
        )
        VALUES ($1, $2, $3, 'bet', 'failed', $4, $5)
      `, [
        transactionId,
        userId,
        0, // No amount for failed payment
        raffleId,
        JSON.stringify({ reason, ...metadata })
      ]);

      console.log(`Failed payment recorded: ${transactionId} for user ${userId}`);
      
      return transactionId;
    } catch (error) {
      console.error('Error recording failed payment:', error);
      throw error;
    }
  }

  // Clean up old transactions (for maintenance)
  async cleanupOldTransactions(daysOld = 90) {
    try {
      const result = await query(`
        DELETE FROM star_transactions 
        WHERE status = 'failed' 
        AND created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
        RETURNING COUNT(*)
      `);

      const deletedCount = result.rows[0]?.count || 0;
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old failed transactions`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old transactions:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const stats = await this.getPaymentStatistics();
      
      // Check for any concerning patterns
      const concerns = [];
      
      if (stats.bets.failed > stats.bets.confirmed * 0.1) {
        concerns.push('High failure rate for bets');
      }
      
      if (stats.wins.failed > 0) {
        concerns.push('Failed winner payouts detected');
      }

      return {
        status: concerns.length === 0 ? 'healthy' : 'warning',
        concerns: concerns,
        statistics: stats
      };
    } catch (error) {
      console.error('Payment service health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Export singleton instance
const paymentService = new PaymentService();
module.exports = paymentService;