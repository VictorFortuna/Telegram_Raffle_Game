# Telegram Raffle Stars

A Telegram HTML5 raffle game that uses Telegram Stars for betting. Users place 1-star bets, and when the required number of participants is reached, a winner is automatically selected using cryptographically secure randomization. The winner receives 70% of the pot, and the organizer gets 30%.

## 🎯 Features

- **HTML5 Game Interface**: Optimized for Telegram WebApp
- **Telegram Stars Integration**: Native Telegram Stars payment system
- **Real-time Updates**: Live participant count via Socket.IO
- **Cryptographically Secure**: Fair winner selection using secure randomization
- **Admin Panel**: Complete management interface with Bootstrap UI
- **Multi-language Support**: Extensible localization system
- **Security First**: JWT authentication, rate limiting, input validation
- **Production Ready**: Comprehensive error handling and logging

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with connection pooling
- **Frontend**: HTML5 + Vanilla JavaScript (Telegram WebApp API)
- **Admin Panel**: Bootstrap CSS framework
- **Real-time**: Socket.IO for WebSocket connections
- **Authentication**: JWT tokens + Telegram WebApp API
- **Deployment**: Railway with GitHub auto-deployment

### Project Structure
```
├── server.js                 # Main Express server
├── routes/                   # API route handlers
│   ├── auth.js              # Telegram authentication
│   ├── raffle.js            # Raffle operations
│   └── admin.js             # Admin panel APIs
├── models/                   # Database models
│   ├── User.js              # User model
│   └── Raffle.js            # Raffle model
├── services/                 # Business logic
│   ├── telegram.js          # Telegram Bot API integration
│   ├── raffle.js            # Raffle game logic
│   └── payments.js          # Telegram Stars handling
├── middleware/               # Express middleware
│   ├── telegramAuth.js      # Telegram initData validation
│   └── jwtAuth.js           # JWT token handling
├── public/                   # Frontend assets
│   ├── game.html            # Main game interface
│   ├── admin/               # Admin panel
│   └── assets/              # CSS, JS, images
├── database/                 # Database management
│   ├── schema.sql           # Database schema
│   ├── connection.js        # Database connection
│   └── migrate.js           # Migration script
└── utils/                   # Helper functions
    ├── validation.js        # Input validation
    └── logger.js            # Logging system
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- PostgreSQL >= 12
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-raffle-stars
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb telegram_raffle_stars
   
   # Run migrations
   npm run migrate
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

### Environment Configuration

Required environment variables:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/telegram_raffle_stars
TELEGRAM_BOT_TOKEN=your_bot_token_here
JWT_SECRET=your_jwt_secret_here
ADMIN_PASSWORD_HASH=your_bcrypt_hashed_password
PORT=3000
```

## 🎮 Game Flow

1. **User Authentication**: Telegram WebApp API validates user via `initData`
2. **Balance Check**: Verify user has sufficient Telegram Stars
3. **Place Bet**: User places 1-star bet, added to current raffle
4. **Real-time Updates**: All connected users see participant count updates
5. **Auto Draw**: When participant limit reached, cryptographically secure winner selection
6. **Payouts**: Winner receives 70%, organizer gets 30% via Telegram Stars API
7. **Notifications**: Telegram bot sends results to all participants

## 🔧 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /login` - Authenticate with Telegram initData
- `GET /me` - Get current user information
- `POST /refresh` - Refresh JWT token
- `GET /stats` - Get platform statistics

### Raffle Routes (`/api/raffle`)
- `GET /current` - Get current active raffle
- `POST /bet` - Place bet in current raffle
- `GET /history` - Get raffle history
- `GET /stats` - Get raffle statistics
- `GET /:id` - Get specific raffle details
- `GET /:id/participants` - Get raffle participants

### Admin Routes (`/api/admin`)
- `POST /login` - Admin authentication
- `GET /dashboard` - Get admin dashboard data
- `GET /raffles` - Get all raffles
- `POST /raffles/:id/cancel` - Cancel raffle
- `GET /settings` - Get raffle settings
- `POST /settings` - Update raffle settings
- `GET /users` - Get users list
- `GET /transactions` - Get transactions
- `GET /audit-logs` - Get audit logs

## 🛠️ Database Schema

### Core Tables
- `users` - Telegram user management
- `raffles` - Individual raffle instances
- `bids` - Participant entries
- `raffle_settings` - Configurable game parameters
- `star_transactions` - Financial tracking
- `audit_logs` - Admin actions and system events

### Key Features
- ACID compliance for concurrent operations
- Optimized indexes for high-load scenarios
- Foreign key constraints and validation
- Audit trail for all admin actions
- Transaction safety with rollback support

## 🎨 Frontend

### Game Interface Specifications
- **Center**: Large round orange BID button (1/3 of screen height)
- **Top Section**: Player stars count (left) + Active players count (right)
- **Bottom Section**: Four elements - player stars, active players, total registered, game rules
- **Style**: Minimalistic Telegram Mini Apps aesthetic with rounded corners
- **Responsive**: Optimized for mobile devices within Telegram

### Admin Panel
- Bootstrap-based responsive interface
- Real-time dashboard with statistics
- Raffle management and user oversight
- Settings configuration
- Audit log viewing
- CSP headers configured for external CSS loading

## 🔐 Security Features

- **Telegram InitData Validation**: Server-side verification of Telegram WebApp data
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against spam and abuse
- **Input Validation**: Comprehensive validation and sanitization
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: Output encoding and CSP headers
- **Financial Transaction Security**: Audit logging and verification
- **Admin Access Control**: Role-based permissions

## 📱 Telegram Bot Setup

1. **Create Bot**: Message @BotFather and use `/newgame` command
2. **Configure Bot**:
   - Add bot commands using `/setcommands`
   - Upload 512x512 game icon
   - Set game URL to your domain
3. **Webhook Setup**: Configure webhook endpoint at `/api/webhook/telegram`
4. **Domain Configuration**: Add your domain to bot settings

### Bot Commands
- `/start` - Welcome message and main menu
- `/game` - Open game interface
- `/stats` - View playing statistics
- `/help` - Show help and rules

## 🎯 Admin Panel

Access the admin panel at `/admin` with these features:

### Dashboard
- Real-time statistics
- Recent transactions
- System health monitoring
- Performance metrics

### Raffle Management
- View all raffles with filters
- Cancel active raffles
- Monitor completion status
- Participant tracking

### User Management
- Search and filter users
- View user statistics
- Track user activity
- Account management

### Financial Oversight
- Transaction monitoring
- Payment verification
- Refund processing
- Revenue tracking

### System Configuration
- Raffle parameters (participants, bet amounts, percentages)
- Rate limiting settings
- Feature toggles
- Maintenance mode

### Audit & Compliance
- Complete audit trail
- Admin action logging
- Security event monitoring
- Compliance reporting

## 🚀 Deployment

### Railway Deployment
1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Push to main branch triggers automatic deployment
4. Configure custom domain if needed

### Manual Deployment
1. Set up production PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Start application with process manager (PM2 recommended)
5. Set up reverse proxy (Nginx recommended)
6. Configure SSL certificates

### Health Checks
- `/health` - Basic health check endpoint
- Database connection monitoring
- Service health verification
- Performance metrics

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

### Test Strategy
- Unit tests for models and services
- Integration tests for API endpoints
- WebSocket connection testing
- Security testing (SQL injection, XSS)
- Load testing for concurrent operations

## 📊 Monitoring & Logging

### Logging System
- Structured logging with timestamps
- Separate log files by category (auth, raffle, payment, admin)
- Log rotation and cleanup
- Error tracking and alerts

### Metrics & Analytics
- Real-time user activity
- Raffle completion rates
- Payment success rates
- System performance metrics
- Error rates and patterns

## 🔧 Maintenance

### Regular Tasks
- Database backup and maintenance
- Log file rotation and cleanup
- Security updates and patches
- Performance monitoring and optimization

### Monitoring
- Database performance
- API response times
- Error rates
- User activity patterns
- Financial transaction accuracy

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Create an issue in this repository
- Contact the development team
- Check the troubleshooting guide in the wiki

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📋 Todo / Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] Enhanced admin notifications
- [ ] Automated testing pipeline
- [ ] Performance optimizations
- [ ] Advanced fraud detection

---

Made with ❤️ for the Telegram community