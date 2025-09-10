const axios = require('axios');
const { query } = require('../database/connection');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
  }

  // Send message to user
  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to send Telegram message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send message to multiple users
  async sendMessageToUsers(userIds, text, options = {}) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendMessage(userId, text, options);
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
      
      // Rate limiting - wait 30ms between messages
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    return results;
  }

  // Handle webhook updates
  async handleWebhook(update) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      } else if (update.pre_checkout_query) {
        await this.handlePreCheckoutQuery(update.pre_checkout_query);
      } else if (update.successful_payment) {
        await this.handleSuccessfulPayment(update.successful_payment);
      }
    } catch (error) {
      console.error('Error handling webhook update:', error);
    }
  }

  // Handle text messages
  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const user = message.from;

    // Store/update user information
    try {
      await query(`
        INSERT INTO users (telegram_id, username, first_name, last_name, language_code, last_active)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (telegram_id) DO UPDATE SET
          username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          language_code = EXCLUDED.language_code,
          last_active = CURRENT_TIMESTAMP
      `, [user.id, user.username, user.first_name, user.last_name, user.language_code]);
    } catch (error) {
      console.error('Failed to store user information:', error);
    }

    // Handle commands
    if (text?.startsWith('/')) {
      await this.handleCommand(chatId, text, user);
    }
  }

  // Handle bot commands
  async handleCommand(chatId, command, user) {
    const cmd = command.split(' ')[0].toLowerCase();

    switch (cmd) {
      case '/start':
        await this.handleStartCommand(chatId, user);
        break;
      
      case '/game':
        await this.handleGameCommand(chatId, user);
        break;
      
      case '/stats':
        await this.handleStatsCommand(chatId, user);
        break;
      
      case '/help':
        await this.handleHelpCommand(chatId, user);
        break;
      
      default:
        await this.sendMessage(chatId, 
          'Unknown command. Type /help to see available commands.');
        break;
    }
  }

  // Handle /start command
  async handleStartCommand(chatId, user) {
    const welcomeMessage = `
🎉 <b>Welcome to Telegram Raffle Stars!</b>

Hi ${user.first_name}! Ready to win some Telegram Stars?

🎯 <b>How it works:</b>
• Each raffle costs 1 Telegram Star to enter
• When the raffle fills up, we randomly pick a winner
• Winner takes 70% of the total pot!

🚀 <b>Ready to play?</b>
Click the button below to start playing!

💫 <b>Need help?</b> Type /help for more information.
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎮 Play Now', url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot_username'}/game` }],
        [{ text: '📊 My Stats', callback_data: 'stats' }],
        [{ text: '📋 Rules', callback_data: 'rules' }]
      ]
    };

    await this.sendMessage(chatId, welcomeMessage, { 
      reply_markup: keyboard 
    });
  }

  // Handle /game command
  async handleGameCommand(chatId, user) {
    const gameMessage = `
🎮 <b>Start Playing Raffle Stars!</b>

Click the button below to open the game interface:
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎯 Open Game', url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot_username'}/game` }]
      ]
    };

    await this.sendMessage(chatId, gameMessage, { 
      reply_markup: keyboard 
    });
  }

  // Handle /stats command
  async handleStatsCommand(chatId, user) {
    try {
      // Get user stats
      const userStatsResult = await query(`
        SELECT 
          u.telegram_id,
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
        GROUP BY u.telegram_id, u.first_name
      `, [user.id]);

      const userStats = userStatsResult.rows[0];

      // Get global stats
      const globalStatsResult = await query(`
        SELECT 
          COUNT(*) as total_raffles,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_raffles,
          COALESCE(SUM(total_pot), 0) as total_volume,
          COUNT(DISTINCT winner_id) as unique_winners
        FROM raffles
      `);

      const globalStats = globalStatsResult.rows[0];

      const statsMessage = `
📊 <b>Your Statistics</b>

👤 <b>${userStats?.first_name || 'User'}</b>
🎯 Raffles Entered: ${userStats?.total_bids || 0}
🏆 Raffles Won: ${userStats?.wins || 0}
⭐ Total Winnings: ${userStats?.total_winnings || 0} Stars
💸 Total Spent: ${userStats?.total_spent || 0} Stars
📈 Net Profit: ${(userStats?.total_winnings || 0) - (userStats?.total_spent || 0)} Stars

🌟 <b>Global Statistics</b>
🎲 Total Raffles: ${globalStats.total_raffles}
✅ Completed: ${globalStats.completed_raffles}
💰 Total Volume: ${globalStats.total_volume} Stars
🎉 Unique Winners: ${globalStats.unique_winners}

🎮 Ready to play more? /game
      `;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎮 Play Now', url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot_username'}/game` }]
        ]
      };

      await this.sendMessage(chatId, statsMessage, { 
        reply_markup: keyboard 
      });

    } catch (error) {
      console.error('Failed to get user stats:', error);
      await this.sendMessage(chatId, 
        'Failed to retrieve your statistics. Please try again later.');
    }
  }

  // Handle /help command
  async handleHelpCommand(chatId, user) {
    const helpMessage = `
📋 <b>Telegram Raffle Stars Help</b>

<b>🎯 How to Play:</b>
1. Each raffle costs 1 Telegram Star to enter
2. Click "Play Now" to open the game interface
3. Press the BID button to join the current raffle
4. When the raffle fills up, we randomly select a winner
5. Winner receives 70% of the total pot in Stars

<b>🎮 Commands:</b>
/start - Welcome message and main menu
/game - Open the game interface
/stats - View your playing statistics
/help - Show this help message

<b>🔒 Fair & Secure:</b>
• All drawings use cryptographically secure randomization
• Every raffle is verifiable and transparent
• Instant payouts via Telegram Stars

<b>💰 Payouts:</b>
• Winner: 70% of total pot
• Platform: 30% (covers operations and new features)

<b>🆘 Need Support?</b>
Contact @RaffleStarsSupport for any questions or issues.

🎲 <b>Good luck and have fun!</b>
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎮 Play Now', url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot_username'}/game` }],
        [{ text: '📊 My Stats', callback_data: 'stats' }]
      ]
    };

    await this.sendMessage(chatId, helpMessage, { 
      reply_markup: keyboard 
    });
  }

  // Handle callback queries (inline button presses)
  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const user = callbackQuery.from;

    // Answer the callback query to remove loading state
    try {
      await axios.post(`${this.apiUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQuery.id
      });
    } catch (error) {
      console.error('Failed to answer callback query:', error);
    }

    switch (data) {
      case 'stats':
        await this.handleStatsCommand(chatId, user);
        break;
      
      case 'rules':
        await this.showRules(chatId);
        break;
      
      default:
        console.log('Unknown callback query:', data);
        break;
    }
  }

  // Show game rules
  async showRules(chatId) {
    const rulesMessage = `
📋 <b>Game Rules</b>

<b>🎯 How Raffles Work:</b>
• Each raffle has a fixed number of spots (usually 10)
• Each spot costs exactly 1 Telegram Star
• You can only buy 1 spot per raffle
• When all spots are filled, we draw a winner randomly

<b>🎲 Winner Selection:</b>
• Uses cryptographically secure random number generation
• Every participant has an equal chance to win
• Results are immediate and transparent

<b>💰 Prize Distribution:</b>
• Winner receives 70% of the total pot
• Platform keeps 30% for operations and development
• Example: 10-person raffle = 10 Stars total
  → Winner gets 7 Stars, platform gets 3 Stars

<b>🚀 Auto-Start:</b>
• New raffles start automatically when previous one completes
• No waiting time between rounds
• Play as many rounds as you want!

<b>✅ Fair Play Guarantee:</b>
• All transactions are recorded on blockchain
• Random seed is generated using secure methods
• Complete transparency in winner selection

Good luck! 🍀
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎮 Play Now', url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot_username'}/game` }]
      ]
    };

    await this.sendMessage(chatId, rulesMessage, { 
      reply_markup: keyboard 
    });
  }

  // Handle pre-checkout queries for payments
  async handlePreCheckoutQuery(preCheckoutQuery) {
    try {
      // Answer the pre-checkout query to approve the payment
      await axios.post(`${this.apiUrl}/answerPreCheckoutQuery`, {
        pre_checkout_query_id: preCheckoutQuery.id,
        ok: true
      });
    } catch (error) {
      console.error('Failed to handle pre-checkout query:', error);
    }
  }

  // Handle successful payments
  async handleSuccessfulPayment(successfulPayment) {
    try {
      // Log the successful payment
      console.log('Successful payment received:', successfulPayment);
      
      // You could update transaction status here if tracking payments
      // This is mainly for direct bot payments, not WebApp payments
    } catch (error) {
      console.error('Failed to handle successful payment:', error);
    }
  }

  // Notify users about raffle completion
  async notifyRaffleCompletion(raffleId, winner, participants, winnerAmount) {
    try {
      const winnerMessage = `
🎉 <b>Congratulations!</b>

You won the raffle and received <b>${winnerAmount} ⭐ Telegram Stars</b>!

🎯 Want to try your luck again? 
      `;

      const loserMessage = `
🎲 <b>Raffle Completed</b>

The winner was <b>${winner.first_name}</b> ${winner.username ? `(@${winner.username})` : ''}
They won <b>${winnerAmount} ⭐ Stars</b>!

🎯 Better luck next time! Want to try again?
      `;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎮 Play Again', url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot_username'}/game` }]
        ]
      };

      // Send message to winner
      await this.sendMessage(winner.user_telegram_id, winnerMessage, { 
        reply_markup: keyboard 
      });

      // Send message to other participants
      const otherParticipants = participants.filter(p => p.user_telegram_id !== winner.user_telegram_id);
      for (const participant of otherParticipants) {
        try {
          await this.sendMessage(participant.user_telegram_id, loserMessage, { 
            reply_markup: keyboard 
          });
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to notify participant ${participant.user_telegram_id}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to notify raffle completion:', error);
    }
  }

  // Notify users about raffle cancellation
  async notifyRaffleCancellation(participants, reason) {
    const cancelMessage = `
❌ <b>Raffle Cancelled</b>

The current raffle was cancelled: <i>${reason}</i>

💰 Your Stars have been refunded automatically.

🎮 A new raffle is now available!
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎮 Play Now', url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot_username'}/game` }]
      ]
    };

    for (const participant of participants) {
      try {
        await this.sendMessage(participant.user_telegram_id, cancelMessage, { 
          reply_markup: keyboard 
        });
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to notify participant ${participant.user_telegram_id}:`, error);
      }
    }
  }

  // Set bot commands
  async setBotCommands() {
    const commands = [
      { command: 'start', description: 'Start the bot and see welcome message' },
      { command: 'game', description: 'Open the raffle game interface' },
      { command: 'stats', description: 'View your playing statistics' },
      { command: 'help', description: 'Show help and game rules' }
    ];

    try {
      await axios.post(`${this.apiUrl}/setMyCommands`, {
        commands
      });
      
      console.log('Bot commands set successfully');
    } catch (error) {
      console.error('Failed to set bot commands:', error);
    }
  }

  // Get bot info
  async getBotInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data.result;
    } catch (error) {
      console.error('Failed to get bot info:', error);
      throw error;
    }
  }

  // Set webhook
  async setWebhook(webhookUrl) {
    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment']
      });
      
      console.log('Webhook set successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      throw error;
    }
  }
}

// Export singleton instance
const telegramService = new TelegramService();
module.exports = telegramService;