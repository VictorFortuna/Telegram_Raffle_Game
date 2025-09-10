// Telegram Raffle Stars Game JavaScript
let tg = null;
let socket = null;
let authToken = null;
let currentUser = null;
let currentRaffle = null;
let isPlacingBet = false;

// Initialize Telegram WebApp
function initTelegramWebApp() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        tg = Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Set theme
        if (tg.themeParams) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#222222');
            document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#3390ec');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f4');
            document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
        }
        
        // Hide back button
        tg.BackButton.hide();
        
        console.log('Telegram WebApp initialized');
        return true;
    } else {
        console.log('Running in development mode (no Telegram WebApp)');
        return false;
    }
}

// Initialize Socket.IO
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        
        // Join raffle updates room
        socket.emit('join-raffle', {
            initData: tg?.initData
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showStatus('Connection lost. Reconnecting...', 'error');
    });
    
    socket.on('raffle-status', (data) => {
        console.log('Received raffle status:', data);
        currentRaffle = data;
        updateRaffleDisplay(data);
    });
    
    socket.on('participant-joined', (data) => {
        console.log('Participant joined:', data);
        updateRaffleDisplay({
            id: data.raffle_id,
            current_participants: data.current_participants,
            required_participants: data.required_participants,
            total_pot: data.total_pot
        });
        
        if (data.user.telegram_id !== currentUser?.telegram_id) {
            showStatus(`${data.user.first_name} joined the raffle!`, 'info');
        }
    });
    
    socket.on('raffle-completed', (data) => {
        console.log('Raffle completed:', data);
        const isWinner = data.winner.user_telegram_id === currentUser?.telegram_id;
        
        if (isWinner) {
            showWinnerModal(data.raffle.winner_amount, true);
        } else {
            showWinnerModal(data.raffle.winner_amount, false, data.winner);
        }
        
        // Load new raffle after a delay
        setTimeout(() => {
            loadCurrentRaffle();
        }, 5000);
    });
    
    socket.on('raffle-cancelled', (data) => {
        console.log('Raffle cancelled:', data);
        showStatus('Raffle was cancelled. Refunds processed.', 'info');
        loadCurrentRaffle();
    });
    
    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showStatus(data.message || 'An error occurred', 'error');
    });
}

// API request helper
async function apiRequest(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (tg?.initData) {
        defaultHeaders['X-Telegram-Init-Data'] = tg.initData;
    }
    
    if (authToken) {
        defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

// Authentication
async function authenticateUser() {
    try {
        if (!tg?.initData) {
            // Development mode - use mock user
            currentUser = {
                telegram_id: 123456789,
                first_name: 'Test User',
                username: 'testuser'
            };
            showStatus('Running in development mode', 'info');
            return true;
        }
        
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                initData: tg.initData
            })
        });
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            // Update player stars display
            updatePlayerStars(data.stats?.total_winnings || 0);
            
            console.log('User authenticated:', currentUser);
            return true;
        } else {
            throw new Error(data.error || 'Authentication failed');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showStatus('Failed to authenticate. Please try again.', 'error');
        return false;
    }
}

// Load current raffle
async function loadCurrentRaffle() {
    try {
        const data = await apiRequest('/api/raffle/current');
        
        if (data.success) {
            currentRaffle = data.raffle;
            updateRaffleDisplay(data.raffle);
        } else {
            throw new Error(data.error || 'Failed to load raffle');
        }
    } catch (error) {
        console.error('Load raffle error:', error);
        showStatus('Failed to load current raffle', 'error');
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const data = await apiRequest('/api/auth/stats');
        
        if (data.success) {
            updateStatistics(data.stats);
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// Place bet
async function placeBet() {
    if (isPlacingBet) return;
    
    if (!currentUser) {
        showStatus('Please authenticate first', 'error');
        return;
    }
    
    if (!currentRaffle) {
        showStatus('No active raffle', 'error');
        return;
    }
    
    isPlacingBet = true;
    updateBidButton(true);
    
    try {
        const data = await apiRequest('/api/raffle/bet', {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        if (data.success) {
            if (data.winner) {
                // Raffle completed
                const isWinner = data.is_winner;
                if (isWinner) {
                    showStatus('Congratulations! You won!', 'success');
                    showWinnerModal(data.winner.winner_amount, true);
                } else {
                    showStatus('Raffle completed! Better luck next time.', 'info');
                    showWinnerModal(data.raffle.winner_amount, false, data.winner);
                }
                
                // Update display with completed raffle
                updateRaffleDisplay(data.raffle);
                
                // Load new raffle after delay
                setTimeout(loadCurrentRaffle, 5000);
            } else {
                // Bet placed successfully
                showStatus('Bet placed successfully!', 'success');
                currentRaffle = data.raffle;
                updateRaffleDisplay(data.raffle);
            }
        } else {
            throw new Error(data.error || 'Failed to place bet');
        }
    } catch (error) {
        console.error('Place bet error:', error);
        
        let errorMessage = 'Failed to place bet';
        if (error.message.includes('already participated')) {
            errorMessage = 'You have already placed a bet in this raffle';
        } else if (error.message.includes('full')) {
            errorMessage = 'Raffle is full';
        } else if (error.message.includes('not active')) {
            errorMessage = 'Raffle is not active';
        }
        
        showStatus(errorMessage, 'error');
    } finally {
        isPlacingBet = false;
        updateBidButton(false);
    }
}

// Update raffle display
function updateRaffleDisplay(raffle) {
    if (!raffle) return;
    
    const progressPercentage = Math.min(
        (raffle.current_participants / raffle.required_participants) * 100,
        100
    );
    
    // Update progress bar with animation
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${raffle.current_participants} / ${raffle.required_participants} participants`;
    }
    
    // Update active players in top section
    const activePlayersTop = document.getElementById('activePlayers');
    if (activePlayersTop) {
        activePlayersTop.textContent = `${raffle.current_participants}/${raffle.required_participants}`;
        activePlayersTop.classList.add('updated');
        setTimeout(() => activePlayersTop.classList.remove('updated'), 500);
    }
    
    // Update bid button state
    const bidButton = document.getElementById('bidButton');
    if (bidButton && raffle.status === 'completed') {
        bidButton.disabled = true;
        bidButton.innerHTML = '<div class="bid-text">COMPLETED</div><div class="bet-amount">New raffle starting...</div>';
    } else if (bidButton) {
        bidButton.disabled = false;
        bidButton.innerHTML = '<div class="bid-text">BID</div><div class="bet-amount">1 ⭐</div>';
    }
}

// Update bid button
function updateBidButton(loading) {
    const bidButton = document.getElementById('bidButton');
    
    if (loading) {
        bidButton.disabled = true;
        bidButton.innerHTML = '<div class="loading"></div><div class="bet-amount">Placing bet...</div>';
        bidButton.setAttribute('aria-label', 'Processing bet, please wait');
    } else {
        bidButton.disabled = false;
        bidButton.innerHTML = '<div class="bid-text">BID</div><div class="bet-amount">1 ⭐</div>';
        bidButton.setAttribute('aria-label', 'Place bid of 1 Telegram Star');
    }
}

// Update player stars with animation
function updatePlayerStars(stars) {
    const playerStarsTop = document.getElementById('playerStars');
    const playerStarsBottom = document.getElementById('playerStarsBottom');
    
    // Update top stars with animation
    if (playerStarsTop) {
        const currentValue = parseInt(playerStarsTop.textContent) || 0;
        if (currentValue !== stars) {
            playerStarsTop.classList.add('updated');
            setTimeout(() => playerStarsTop.classList.remove('updated'), 500);
        }
        playerStarsTop.textContent = stars;
    }
    
    // Update bottom stars with animation
    if (playerStarsBottom) {
        const currentValue = parseInt(playerStarsBottom.textContent) || 0;
        if (currentValue !== stars) {
            playerStarsBottom.classList.add('updated');
            setTimeout(() => playerStarsBottom.classList.remove('updated'), 500);
        }
        playerStarsBottom.textContent = stars;
    }
}

// Update statistics with animation
function updateStatistics(stats) {
    const activePlayersBottom = document.getElementById('activePlayersBottom');
    const totalUsers = document.getElementById('totalUsers');
    
    // Update active players with animation
    if (activePlayersBottom && stats.active_users !== undefined) {
        const currentValue = parseInt(activePlayersBottom.textContent) || 0;
        const newValue = stats.active_users || 0;
        
        if (currentValue !== newValue) {
            activePlayersBottom.classList.add('updated');
            setTimeout(() => activePlayersBottom.classList.remove('updated'), 500);
        }
        activePlayersBottom.textContent = newValue;
    }
    
    // Update total users with animation
    if (totalUsers && stats.total_users !== undefined) {
        const currentValue = parseInt(totalUsers.textContent) || 0;
        const newValue = stats.total_users || 0;
        
        if (currentValue !== newValue) {
            totalUsers.classList.add('updated');
            setTimeout(() => totalUsers.classList.remove('updated'), 500);
        }
        totalUsers.textContent = newValue;
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type} show`;
    
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 3000);
}

// Show winner modal
function showWinnerModal(amount, isWinner, winner = null) {
    const winnerModal = document.getElementById('winnerModal');
    const winnerTitle = document.getElementById('winnerTitle');
    const winnerAmount = document.getElementById('winnerAmount');
    const winnerMessage = document.getElementById('winnerMessage');
    
    if (isWinner) {
        winnerTitle.textContent = 'Congratulations!';
        winnerAmount.textContent = `${amount} ⭐`;
        winnerMessage.textContent = 'You won the raffle!';
        
        // Update player stars
        const currentStars = parseInt(document.getElementById('playerStars').textContent);
        updatePlayerStars(currentStars + amount);
    } else {
        winnerTitle.textContent = 'Raffle Completed';
        winnerAmount.textContent = `${amount} ⭐`;
        winnerMessage.textContent = winner 
            ? `${winner.first_name} won the raffle!` 
            : 'Better luck next time!';
    }
    
    winnerModal.classList.add('show');
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        closeWinnerModal();
    }, 5000);
}

// Close winner modal
function closeWinnerModal() {
    const winnerModal = document.getElementById('winnerModal');
    winnerModal.classList.remove('show');
}

// Show rules
function showRules() {
    const rules = `
🎯 How to Play:
• Each bet costs 1 Telegram Star
• Join the current raffle by placing a bet
• When the raffle fills up, a winner is drawn randomly
• Winner receives 70% of the total pot
• New raffle starts automatically

🎲 Fair & Random:
• Winners are selected using cryptographically secure randomization
• All draws are verifiable and transparent

💰 Payouts:
• Winner: 70% of total pot
• Organizer: 30% (platform fee)

📱 Need help? Contact @RaffleStarsSupport
    `;
    
    if (tg && tg.showAlert) {
        tg.showAlert(rules);
    } else {
        alert(rules);
    }
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && socket) {
        // Refresh data when user returns to the game
        loadCurrentRaffle();
        loadStatistics();
    }
});

// Initialize game
async function initGame() {
    console.log('Initializing Telegram Raffle Stars...');
    
    // Initialize Telegram WebApp
    const hasTelegramWebApp = initTelegramWebApp();
    
    // Initialize Socket.IO
    initSocket();
    
    // Authenticate user
    const isAuthenticated = await authenticateUser();
    
    if (isAuthenticated) {
        // Load initial data
        await Promise.all([
            loadCurrentRaffle(),
            loadStatistics()
        ]);
        
        console.log('Game initialized successfully');
        showStatus('Welcome to Telegram Raffle Stars!', 'success');
    } else {
        showStatus('Failed to initialize game', 'error');
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});

// Export for debugging
window.gameDebug = {
    currentUser,
    currentRaffle,
    tg,
    socket,
    loadCurrentRaffle,
    loadStatistics,
    placeBet
};