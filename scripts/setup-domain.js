const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DomainSetup {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    this.railwayDomain = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_STATIC_DOMAIN;
  }

  async setTelegramWebhook() {
    try {
      if (!this.botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN not found in environment variables');
      }

      if (!this.webhookUrl) {
        console.log('TELEGRAM_WEBHOOK_URL not set, using Railway domain');
        if (!this.railwayDomain) {
          throw new Error('No webhook URL or Railway domain found');
        }
        this.webhookUrl = `https://${this.railwayDomain}/api/webhook/telegram`;
      }

      console.log(`Setting Telegram webhook to: ${this.webhookUrl}`);

      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/setWebhook`,
        {
          url: this.webhookUrl,
          allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
          drop_pending_updates: true
        }
      );

      if (response.data.ok) {
        console.log('✓ Telegram webhook set successfully');
        return response.data.result;
      } else {
        throw new Error(`Failed to set webhook: ${response.data.description}`);
      }

    } catch (error) {
      console.error('Error setting Telegram webhook:', error.message);
      throw error;
    }
  }

  async getTelegramWebhookInfo() {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${this.botToken}/getWebhookInfo`
      );

      if (response.data.ok) {
        const info = response.data.result;
        console.log('Current webhook info:');
        console.log(`  URL: ${info.url}`);
        console.log(`  Has custom certificate: ${info.has_custom_certificate}`);
        console.log(`  Pending update count: ${info.pending_update_count}`);
        console.log(`  IP address: ${info.ip_address || 'Not specified'}`);
        console.log(`  Last error date: ${info.last_error_date ? new Date(info.last_error_date * 1000) : 'None'}`);
        console.log(`  Last error message: ${info.last_error_message || 'None'}`);
        return info;
      } else {
        throw new Error(`Failed to get webhook info: ${response.data.description}`);
      }

    } catch (error) {
      console.error('Error getting webhook info:', error.message);
      throw error;
    }
  }

  async deleteTelegramWebhook() {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/deleteWebhook`,
        { drop_pending_updates: true }
      );

      if (response.data.ok) {
        console.log('✓ Telegram webhook deleted successfully');
        return response.data.result;
      } else {
        throw new Error(`Failed to delete webhook: ${response.data.description}`);
      }

    } catch (error) {
      console.error('Error deleting webhook:', error.message);
      throw error;
    }
  }

  async testWebhookSSL() {
    try {
      console.log('Testing webhook SSL certificate...');
      
      const response = await axios.get(this.webhookUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Telegram-Bot-SSL-Test/1.0'
        }
      });

      console.log(`✓ SSL test successful - Status: ${response.status}`);
      console.log('✓ Webhook endpoint is accessible via HTTPS');
      
      return {
        status: 'success',
        statusCode: response.status,
        accessible: true
      };

    } catch (error) {
      console.error('SSL test failed:', error.message);
      
      if (error.code === 'CERT_HAS_EXPIRED') {
        console.error('SSL certificate has expired');
      } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        console.error('SSL certificate cannot be verified');
      }
      
      return {
        status: 'error',
        error: error.message,
        accessible: false
      };
    }
  }

  generateBotFatherInstructions() {
    const instructions = `
# BotFather Setup Instructions for Telegram Raffle Stars

## 1. Create Bot (if not already done)
Send to @BotFather: /newbot
Follow the prompts to set:
- Bot name: Telegram Raffle Stars
- Bot username: your_bot_username_bot

## 2. Set Bot Description
/setdescription
Choose your bot
Description: Play exciting raffle games with Telegram Stars! Place your bets and win big in our secure, automated raffles.

## 3. Set Bot About
/setabouttext
Choose your bot
About: Secure raffle gaming platform using Telegram Stars for betting. Fair, automated, and instant payouts!

## 4. Set Bot Profile Photo
/setuserpic
Choose your bot
Upload the 512x512 icon: ${path.join(__dirname, '..', '1757411328.png')}

## 5. Configure Game
/newgame
Choose your bot
Game title: Raffle Stars
Game description: Join exciting raffles, place your Stars, and win big! Fair and automated gaming experience.
Game photo: Upload game screenshot
Animation: Optional GIF showing gameplay

## 6. Set Game URL
/setgameurl
Choose your bot
URL: ${this.webhookUrl?.replace('/api/webhook/telegram', '/game') || 'https://your-railway-domain.railway.app/game'}

## 7. Set Bot Commands
/setcommands
Choose your bot
Commands:
game - Start a new raffle game
help - Show help information
stats - View your gaming statistics
admin - Admin panel (for authorized users)

## 8. Configure Bot Settings
/setjoingroups - Disable
/setprivacy - Disable
/setinlinefeedback - Enable (100%)

## 9. Domain Configuration for Webhook
The webhook URL is automatically configured to:
${this.webhookUrl || 'https://your-railway-domain.railway.app/api/webhook/telegram'}

## 10. Payment Settings (Telegram Stars)
Your bot will automatically support Telegram Stars payments through the API.
No additional configuration needed in BotFather for Stars integration.

## Important Notes:
- Keep your bot token secure: ${this.botToken ? this.botToken.substring(0, 10) + '...' : 'TELEGRAM_BOT_TOKEN'}
- Test the game URL before going live
- Monitor webhook status regularly
- Ensure HTTPS is working for webhook communication

## Testing Checklist:
□ Bot responds to /start command
□ Game launches correctly via /game command
□ Webhook receives updates from Telegram
□ SSL certificate is valid and accessible
□ Payment flow works with Telegram Stars
□ Admin panel is accessible for authorized users
`;

    const instructionsPath = path.join(__dirname, '..', 'docs', 'botfather-setup.md');
    
    // Ensure docs directory exists
    const docsDir = path.dirname(instructionsPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    fs.writeFileSync(instructionsPath, instructions);
    console.log(`✓ BotFather setup instructions saved to: ${instructionsPath}`);
    
    return instructions;
  }
}

// CLI interface
if (require.main === module) {
  const domainSetup = new DomainSetup();
  const action = process.argv[2];

  switch (action) {
    case 'webhook':
      domainSetup.setTelegramWebhook()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'info':
      domainSetup.getTelegramWebhookInfo()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'delete':
      domainSetup.deleteTelegramWebhook()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'test':
      domainSetup.testWebhookSSL()
        .then(result => {
          console.log('Test result:', JSON.stringify(result, null, 2));
          process.exit(result.status === 'success' ? 0 : 1);
        })
        .catch(() => process.exit(1));
      break;

    case 'instructions':
      domainSetup.generateBotFatherInstructions();
      process.exit(0);
      break;

    default:
      console.log('Usage: node setup-domain.js <webhook|info|delete|test|instructions>');
      console.log('  webhook      - Set Telegram webhook URL');
      console.log('  info         - Get current webhook info');
      console.log('  delete       - Delete webhook');
      console.log('  test         - Test webhook SSL certificate');
      console.log('  instructions - Generate BotFather setup guide');
      process.exit(1);
  }
}

module.exports = DomainSetup;