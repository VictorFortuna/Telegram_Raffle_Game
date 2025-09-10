# Full-Stack Developer Handoff Specifications
## Telegram Raffle Stars - Technical Implementation Requirements

### Project Context
You are the **Full-Stack Developer** for the Telegram Raffle Stars HTML5 game. This document contains all technical specifications, user stories, and acceptance criteria needed to begin implementation.

**Reference Documents**:
- `CLAUDE.md` - Technical architecture and project standards
- `PROJECT_COORDINATION_PLAN.md` - Team coordination and timeline
- `project_description.md` - Business requirements (Russian)

---

## User Stories & Acceptance Criteria

### Epic 1: User Authentication & Registration
**As a** Telegram user  
**I want to** access the raffle game through my Telegram account  
**So that** I can participate securely without separate registration

**Acceptance Criteria**:
- [ ] Game launches via `/game` command in Telegram bot
- [ ] Telegram WebApp API validates user via `initData`
- [ ] JWT tokens generated for API authentication
- [ ] User data (telegram_id, username, first_name) stored in database
- [ ] Session management with proper token expiration
- [ ] Rate limiting implemented (max 10 requests per minute per user)

**Technical Requirements**:
```javascript
// Telegram initData validation
app.post('/api/auth/telegram', (req, res) => {
  const { initData } = req.body;
  // Validate initData signature with bot token
  // Extract user information
  // Generate JWT token
  // Store/update user in database
});

// JWT middleware for protected routes
const authenticateToken = (req, res, next) => {
  // Validate JWT token
  // Add user info to request object
};
```

### Epic 2: Game Interface & Real-Time Updates
**As a** player  
**I want to** see the current game status and participate in real-time  
**So that** I know when to place bets and see results immediately

**Acceptance Criteria**:
- [ ] Interface matches UI specifications exactly:
  - Large round orange BID button (1/3 screen height)
  - Top: Player stars count (left) + Active players count (right)
  - Bottom: Player stars, active players, total registered, game rules
- [ ] WebSocket connection for real-time updates
- [ ] Auto-reconnection if connection drops
- [ ] Mobile-responsive design
- [ ] Telegram system font and Mini Apps styling

**Technical Requirements**:
```javascript
// WebSocket events to implement
socket.on('raffle_update', (data) => {
  // Update participant count
  // Update game status
});

socket.on('new_participant', (data) => {
  // Add new participant to display
  // Update counts
});

socket.on('raffle_completed', (data) => {
  // Show winner
  // Display results
  // Reset for new raffle
});
```

### Epic 3: Raffle Game Logic
**As a** player  
**I want to** place 1-star bets and participate in fair lottery draws  
**So that** I have a chance to win 70% of the total pot

**Acceptance Criteria**:
- [ ] Users can only bet 1 Telegram Star per raffle
- [ ] Raffle starts automatically when first bet is placed
- [ ] Winner selected automatically when participant limit reached
- [ ] Cryptographically secure random winner selection
- [ ] Winner receives 70% of pot, organizer gets 30%
- [ ] All participants notified of results via Telegram bot
- [ ] New raffle starts immediately after previous completion

**Technical Requirements**:
```javascript
// Core raffle logic
const selectWinner = (participants) => {
  // Use crypto.randomBytes for secure randomization
  // Implement provably fair algorithm
  // Log selection process for audit
};

const processRaffleCompletion = async (raffleId) => {
  // Calculate payouts (70/30 split)
  // Process Telegram Stars payments
  // Send notifications via bot
  // Create audit log entries
  // Start new raffle
};
```

### Epic 4: Telegram Stars Integration
**As a** player  
**I want to** use my Telegram Stars to participate  
**So that** payments are handled securely within Telegram

**Acceptance Criteria**:
- [ ] Integration with Telegram Stars payment API
- [ ] Pre-checkout validation of user balance
- [ ] Secure payment processing for bets
- [ ] Automatic payout to winners
- [ ] Transaction logging for all payments
- [ ] Error handling for failed payments
- [ ] Refund capability for cancelled raffles

**Technical Requirements**:
```javascript
// Telegram Stars payment endpoints
app.post('/api/payment/pre-checkout', async (req, res) => {
  // Validate pre-checkout query
  // Check user eligibility
  // Respond to Telegram
});

app.post('/api/payment/successful', async (req, res) => {
  // Process successful payment
  // Add user to current raffle
  // Trigger raffle completion if limit reached
});
```

### Epic 5: Admin Panel
**As an** administrator  
**I want to** manage game settings and monitor operations  
**So that** I can ensure fair play and optimal game parameters

**Acceptance Criteria**:
- [ ] Web interface accessible at `/admin` route
- [ ] Bootstrap CSS styling (CSP headers configured)
- [ ] Authentication with admin credentials (admin/fortunaforever0910)
- [ ] Configure participant limits (default: 10)
- [ ] Configure bet amounts (default: 1 star)
- [ ] Configure payout percentages (default: 70/30)
- [ ] Force-cancel active raffles if needed
- [ ] View real-time statistics and audit logs
- [ ] Monitor system health and performance

---

## Database Implementation Requirements

### Database Schema
Use the schema provided in `CLAUDE.md` with these specific implementation notes:

```sql
-- Add indexes for performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_bids_raffle_id ON bids(raffle_id);
CREATE INDEX idx_star_transactions_user_id ON star_transactions(user_id);

-- Add constraints
ALTER TABLE bids ADD CONSTRAINT unique_user_per_raffle UNIQUE(raffle_id, user_telegram_id);
ALTER TABLE raffles ADD CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'cancelled'));
```

### Connection Management
```javascript
// PostgreSQL connection with pooling
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});
```

---

## API Endpoints Specification

### Authentication Endpoints
```javascript
POST /api/auth/telegram
Content-Type: application/json
Body: { "initData": "query_id=xxx&user=xxx..." }
Response: { "token": "jwt_token", "user": {...} }

GET /api/auth/me
Headers: Authorization: Bearer <jwt_token>
Response: { "user": {...}, "stars_balance": 123 }
```

### Game Endpoints
```javascript
GET /api/raffle/current
Headers: Authorization: Bearer <jwt_token>
Response: {
  "id": 1,
  "required_participants": 10,
  "current_participants": 7,
  "bet_amount": 1,
  "status": "active",
  "participants": [...]
}

POST /api/raffle/bid
Headers: Authorization: Bearer <jwt_token>
Body: { "amount": 1 }
Response: { "success": true, "raffle_id": 1, "position": 8 }
```

### Admin Endpoints
```javascript
GET /admin
Response: HTML admin panel interface

POST /api/admin/settings
Headers: Authorization: Bearer <admin_token>
Body: {
  "participants_limit": 15,
  "bet_amount": 1,
  "winner_percentage": 70.0
}
Response: { "success": true, "updated_settings": {...} }

POST /api/admin/cancel-raffle
Headers: Authorization: Bearer <admin_token>
Body: { "raffle_id": 1, "reason": "Technical issue" }
Response: { "success": true, "refunded_users": [...] }
```

---

## Frontend Implementation Requirements

### HTML Structure (game.html)
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram Raffle Stars</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link rel="stylesheet" href="/assets/game.css">
</head>
<body>
    <!-- Top Section -->
    <div class="top-section">
        <div class="stars-count">
            <span class="icon">⭐</span>
            <span id="user-stars">0</span>
        </div>
        <div class="players-count">
            <span class="icon">👥</span>
            <span id="active-players">0</span>
        </div>
    </div>

    <!-- Center BID Button -->
    <div class="center-section">
        <button id="bid-button" class="bid-button">
            BID 1 ⭐
        </button>
    </div>

    <!-- Bottom Section -->
    <div class="bottom-section">
        <div class="stat-item" id="player-stars">
            <div class="value">0</div>
            <div class="label">Your Stars</div>
        </div>
        <div class="stat-item" id="active-players-bottom">
            <div class="value">0</div>
            <div class="label">Active</div>
        </div>
        <div class="stat-item" id="total-registered">
            <div class="value">0</div>
            <div class="label">Registered</div>
        </div>
        <div class="stat-item clickable" id="game-rules">
            <div class="value">📖</div>
            <div class="label">Rules</div>
        </div>
    </div>

    <script src="/assets/game.js"></script>
</body>
</html>
```

### CSS Styling Requirements
```css
/* Telegram Mini Apps styling */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--tg-theme-bg-color, #ffffff);
    color: var(--tg-theme-text-color, #000000);
    margin: 0;
    padding: 20px;
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.bid-button {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background-color: #ff6b35;
    color: #ffffff;
    font-size: 24px;
    font-weight: bold;
    border: none;
    cursor: pointer;
    transition: transform 0.2s;
}

.bid-button:hover {
    transform: scale(1.05);
}

.bid-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}
```

### JavaScript Implementation
```javascript
class TelegramRaffleGame {
    constructor() {
        this.socket = null;
        this.user = null;
        this.currentRaffle = null;
        
        this.init();
    }

    async init() {
        // Initialize Telegram WebApp
        window.Telegram.WebApp.ready();
        
        // Authenticate user
        await this.authenticate();
        
        // Connect WebSocket
        this.connectWebSocket();
        
        // Load current raffle
        await this.loadCurrentRaffle();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    async authenticate() {
        const initData = window.Telegram.WebApp.initData;
        // Send to backend for validation
    }

    connectWebSocket() {
        this.socket = io();
        
        this.socket.on('raffle_update', (data) => {
            this.updateRaffleDisplay(data);
        });

        this.socket.on('raffle_completed', (data) => {
            this.showRaffleResults(data);
        });
    }

    async placeBid() {
        // Disable button during processing
        // Send bid request to API
        // Handle success/error responses
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TelegramRaffleGame();
});
```

---

## Security Implementation Checklist

### Input Validation
- [ ] Validate all Telegram `initData` signatures
- [ ] Sanitize all user inputs to prevent XSS
- [ ] Use parameterized queries to prevent SQL injection
- [ ] Implement rate limiting on all API endpoints
- [ ] Validate JWT tokens on protected routes

### Financial Security
- [ ] Log all Telegram Stars transactions
- [ ] Implement transaction verification before processing
- [ ] Use database transactions for critical operations
- [ ] Implement idempotency for payment processing
- [ ] Add audit logging for all admin actions

### WebSocket Security
- [ ] Authenticate WebSocket connections with JWT
- [ ] Implement rate limiting for WebSocket events
- [ ] Validate all incoming WebSocket data
- [ ] Implement connection timeouts and cleanup

---

## Error Handling Requirements

### API Error Responses
```javascript
// Standard error response format
{
  "error": true,
  "code": "INSUFFICIENT_BALANCE",
  "message": "Not enough Telegram Stars to place bet",
  "details": {
    "required": 1,
    "available": 0
  }
}

// Error codes to implement
- AUTH_INVALID: Invalid authentication
- RAFFLE_FULL: Raffle already has maximum participants
- INSUFFICIENT_BALANCE: Not enough stars
- ALREADY_PARTICIPATED: User already in current raffle
- PAYMENT_FAILED: Telegram Stars payment failed
- SERVER_ERROR: Internal server error
```

### Frontend Error Handling
```javascript
// Display user-friendly error messages
const showError = (message) => {
    // Show toast notification or modal
    // Log error for debugging
};

// Retry logic for failed requests
const retryRequest = async (requestFn, maxRetries = 3) => {
    // Implement exponential backoff
    // Handle different error types appropriately
};
```

---

## Testing Requirements

### Unit Tests to Implement
- [ ] Telegram initData validation
- [ ] JWT token generation and validation
- [ ] Raffle winner selection algorithm
- [ ] Payment processing logic
- [ ] Database operations (CRUD)

### Integration Tests
- [ ] Complete raffle flow (bet → completion → payout)
- [ ] WebSocket connection and events
- [ ] Admin panel functionality
- [ ] Error handling scenarios

### Test Data Setup
```javascript
// Test user data
const testUsers = [
    { telegram_id: 123456, username: 'testuser1', first_name: 'Test' },
    { telegram_id: 234567, username: 'testuser2', first_name: 'User' }
];

// Mock Telegram Stars responses
const mockTelegramStars = {
    balance: 100,
    payment_success: true,
    pre_checkout_query: { id: 'test_query_id' }
};
```

---

## Performance Requirements

### Response Time Targets
- API endpoints: < 200ms average response time
- WebSocket events: < 50ms event propagation
- Database queries: < 100ms for simple queries
- Admin panel load: < 1000ms initial load

### Scalability Considerations
- Support minimum 100 concurrent users
- Database connection pooling (max 10 connections)
- WebSocket connection management and cleanup
- Efficient database indexing for large datasets

---

## Deployment Configuration

### Environment Variables
```bash
# Production environment
DATABASE_URL=postgresql://connection_string
TELEGRAM_BOT_TOKEN=7599940711:AAFIlo4g7MZzZWKu8NoJQFXotrBzMev-o9Y
JWT_SECRET=922137fa77b75ab5653d9477c726c21e
ADMIN_PASSWORD_HASH=$2a$12$FVDv8Cb2AyjXULcUgLDB3ufz8K.Q51/aWL0XmqyMdtpOrwsJV8Ci2
PORT=3000
NODE_ENV=production
```

### Required Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "socket.io": "^4.7.x",
    "pg": "^8.11.x",
    "jsonwebtoken": "^9.0.x",
    "bcryptjs": "^2.4.x",
    "helmet": "^7.0.x",
    "express-rate-limit": "^6.7.x",
    "cors": "^2.8.x",
    "crypto": "built-in"
  }
}
```

---

## Next Steps & Coordination

### Immediate Tasks (Week 1)
1. **Set up development environment** with all dependencies
2. **Implement authentication system** with Telegram initData validation
3. **Create database schema** and connection management
4. **Set up basic Express server** with route structure
5. **Coordinate with DevOps Engineer** for Railway deployment setup

### Dependencies & Handoffs
- **From DevOps Engineer**: Database connection string, deployment environment
- **To UI/UX Designer**: Frontend component specifications and styling requirements
- **To QA Engineer**: API endpoints for testing, test data requirements
- **To Project Manager**: Progress updates, technical decisions, risk identification

### Communication Protocol
- **Daily progress updates** to Project Manager
- **Technical questions** escalated through Project Manager
- **Architecture decisions** documented in CLAUDE.md
- **API changes** communicated to all team members

---

**Document Version**: 1.0  
**Created By**: Project Manager + Memory Specialist  
**Target Recipient**: Full-Stack Developer  
**Next Review**: Week 2 Progress Checkpoint