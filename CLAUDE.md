# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Telegram HTML5 raffle game** (NOT a Mini App) that uses Telegram Stars for betting. Users place 1-star bets, and when the required number of participants is reached, a winner is automatically selected. The winner receives 70% of the pot, and the organizer gets 30%.

## Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with connection pooling
- **Frontend**: HTML5 + Vanilla JavaScript (no frameworks for performance)
- **Admin Panel**: Bootstrap CSS
- **Real-time**: Socket.IO for WebSocket connections
- **Authentication**: JWT tokens + Telegram WebApp API
- **Hosting**: Railway with GitHub auto-deployment

## Environment Variables

Required environment variables for development and production:
```
DATABASE_URL=postgresql://connection_string
TELEGRAM_BOT_TOKEN=8077229164:AAHnRoH3aTB7EYgiEX-K2uDsLUgM8aYDjIY
JWT_SECRET=
ADMIN_PASSWORD_HASH=
PORT=3000
```

Admin credentials: `admin` / `fortunaforever0910`

## Database Schema

Key database tables to implement:
```sql
-- Core user management
users (telegram_id, username, first_name, created_at, last_active)

-- Raffle management
raffles (id, required_participants, bet_amount, status, winner_id, created_at)
bids (id, raffle_id, user_telegram_id, amount, placed_at)
raffle_settings (participants_limit, bet_amount, winner_percentage)

-- Financial tracking
star_transactions (id, user_id, amount, type, status)
audit_logs (id, admin_action, timestamp, details)
```

## Project Structure

Recommended modular backend architecture:
```
├── server.js                 # Main Express server
├── routes/                   # API route handlers
│   ├── auth.js              # Telegram authentication
│   ├── raffle.js            # Raffle operations
│   └── admin.js             # Admin panel APIs
├── models/                   # Database models
├── services/                 # Business logic
│   ├── telegram.js          # Telegram Bot API integration
│   ├── raffle.js            # Raffle game logic
│   └── payments.js          # Telegram Stars handling
├── middleware/               # Express middleware
├── public/                   # Frontend assets
│   ├── game.html            # Main game interface
│   ├── admin/               # Admin panel
│   └── assets/              # CSS, JS, images
└── utils/                   # Helper functions
```

## Critical Implementation Requirements

### Telegram Integration
- Game must be created via `/newgame` in @BotFather (NOT as Mini App)
- Webhook endpoint: `/api/webhook/telegram`
- Domain must be added to bot settings via @BotFather
- Requires 512x512 pixel icon
- Proper `initData` validation for user authentication

### Security & Data Validation
- Validate all Telegram `initData` in server.js
- Implement rate limiting to prevent spam
- Use JWT tokens for API authentication
- Prevent SQL injection and XSS attacks
- Log all financial transactions for audit

### Real-time Features
- Socket.IO for live raffle updates
- Auto-reconnection handling for WebSocket connections
- Real-time participant count and status updates

### Admin Panel Requirements
- Web interface at `/admin` route
- CSP headers must allow Bootstrap CSS loading
- Configure raffle settings (participant limits, bet amounts, percentages)
- Force-cancel raffles if needed
- View statistics and audit logs

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# or
node server.js

# Database migrations (if using a migration tool)
npm run migrate

# Run tests
npm test
```

### Deployment
The project uses automatic GitHub → Railway deployment. Push to main branch triggers deployment.

## Game Flow Architecture

1. **User Authentication**: Telegram WebApp API validates user via `initData`
2. **Balance Check**: Verify user has sufficient Telegram Stars
3. **Place Bet**: User places 1-star bet, added to current raffle
4. **Real-time Updates**: All connected users see participant count updates via WebSocket
5. **Auto Draw**: When participant limit reached, cryptographically secure winner selection
6. **Payouts**: Winner receives 70%, organizer gets 30% via Telegram Stars API
7. **Notifications**: Telegram bot sends results to all participants

## Known Issues to Address

- Express.js middleware compatibility (avoid deprecated modules)
- Database connection error handling with proper reconnection
- CSP settings for Bootstrap CSS in admin panel
- WebSocket reconnection on connection drops
- Race condition prevention for concurrent bet placement

## Testing Strategy

- Functional testing of complete raffle flow
- Telegram API integration testing
- WebSocket connection load testing
- Security testing (SQL injection, XSS)
- Real Telegram bot environment testing

The game launches via `/game` command or inline buttons, NOT through standard Telegram Mini App interface.

## UI/UX Specifications (Updated)

### Main Game Interface Design
- **Center**: Large round orange BID button (1/3 of screen height, bold contrasting text)
- **Top Section**: Two elements displayed horizontally
  - Left: Player stars count with star icon
  - Right: Active players count with human icon
- **Bottom Section**: Four elements in a horizontal row
  - Player stars count
  - Active players count  
  - Total registered users
  - Game rules (clickable element)

### Design System
- **Style**: Minimalistic Telegram Mini Apps aesthetic
- **Background**: Light background color
- **Typography**: Telegram system font
- **UI Elements**: Rounded corners throughout
- **Color Scheme**: Telegram concept with designer-chosen accent colors
- **Primary Action**: Orange BID button with high contrast text for accessibility

### Responsive Considerations
- Button must remain prominent and easily tappable on mobile devices
- Information hierarchy: Action (center) > Status (top) > Details (bottom)
- Consistent spacing and padding following Telegram design guidelines