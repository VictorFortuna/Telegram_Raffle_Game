// Admin Panel JavaScript
let authToken = localStorage.getItem('admin_token');
let currentSection = 'dashboard';

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    if (authToken) {
        showAdminPanel();
        loadDashboard();
    } else {
        showLoginForm();
    }
});

// Authentication functions
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('admin_token', authToken);
            localStorage.setItem('admin_user', JSON.stringify(data.admin));
            showAdminPanel();
            loadDashboard();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    showLoginForm();
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';
    
    const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    document.getElementById('adminName').textContent = adminUser.username || 'Admin';
}

// API request helper
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
        logout();
        throw new Error('Authentication failed');
    }
    
    return response.json();
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').style.display = 'block';
    
    // Add active class to current nav link
    document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
    
    currentSection = sectionName;
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'raffles':
            loadRaffles();
            break;
        case 'users':
            loadUsers();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'audit':
            loadAuditLogs();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const data = await apiRequest('/api/admin/dashboard');
        
        if (data.success) {
            renderStatsCards(data.dashboard);
            renderRecentTransactions(data.dashboard.recent_transactions);
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

function renderStatsCards(dashboard) {
    const statsCards = document.getElementById('statsCards');
    const stats = dashboard.raffle_stats;
    const userStats = dashboard.user_stats;
    const todayStats = dashboard.today_stats;
    
    statsCards.innerHTML = `
        <div class="col-md-3">
            <div class="card stats-card text-center">
                <div class="card-body">
                    <i class="bi bi-gift text-primary fs-1"></i>
                    <div class="stats-number">${stats.total_raffles}</div>
                    <p class="text-muted">Total Raffles</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stats-card text-center">
                <div class="card-body">
                    <i class="bi bi-people text-success fs-1"></i>
                    <div class="stats-number">${userStats.active_users}</div>
                    <p class="text-muted">Active Users</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stats-card text-center">
                <div class="card-body">
                    <i class="bi bi-star text-warning fs-1"></i>
                    <div class="stats-number">${stats.total_volume}</div>
                    <p class="text-muted">Total Volume</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stats-card text-center">
                <div class="card-body">
                    <i class="bi bi-cash text-info fs-1"></i>
                    <div class="stats-number">${stats.total_fees}</div>
                    <p class="text-muted">Total Fees</p>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card stats-card text-center">
                <div class="card-body">
                    <i class="bi bi-calendar-day text-primary fs-1"></i>
                    <div class="stats-number">${todayStats.completed_raffles}</div>
                    <p class="text-muted">Completed Today</p>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card stats-card text-center">
                <div class="card-body">
                    <i class="bi bi-graph-up text-success fs-1"></i>
                    <div class="stats-number">${todayStats.volume}</div>
                    <p class="text-muted">Volume Today</p>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card stats-card text-center">
                <div class="card-body">
                    <i class="bi bi-piggy-bank text-warning fs-1"></i>
                    <div class="stats-number">${todayStats.fees}</div>
                    <p class="text-muted">Fees Today</p>
                </div>
            </div>
        </div>
    `;
}

function renderRecentTransactions(transactions) {
    const tbody = document.getElementById('recentTransactionsBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent transactions</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td>${tx.user || 'System'}</td>
            <td>
                <span class="${tx.amount > 0 ? 'text-success' : 'text-danger'}">
                    ${tx.amount > 0 ? '+' : ''}${tx.amount}
                </span>
            </td>
            <td><span class="badge badge-${getTypeColor(tx.type)}">${tx.type.toUpperCase()}</span></td>
            <td><span class="badge badge-${getStatusColor(tx.status)}">${tx.status.toUpperCase()}</span></td>
            <td>${new Date(tx.created_at).toLocaleString()}</td>
        </tr>
    `).join('');
}

// Raffles functions
async function loadRaffles() {
    try {
        const status = document.getElementById('raffleStatusFilter').value;
        const data = await apiRequest(`/api/admin/raffles?status=${status}`);
        
        if (data.success) {
            renderRafflesTable(data.raffles);
        }
    } catch (error) {
        console.error('Failed to load raffles:', error);
    }
}

function renderRafflesTable(raffles) {
    const tbody = document.getElementById('rafflesTableBody');
    
    if (raffles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No raffles found</td></tr>';
        return;
    }
    
    tbody.innerHTML = raffles.map(raffle => `
        <tr>
            <td><small>${raffle.id.substring(0, 8)}...</small></td>
            <td>${raffle.current_participants}/${raffle.required_participants}</td>
            <td><strong>${raffle.total_pot}</strong> ⭐</td>
            <td><span class="badge badge-${getStatusColor(raffle.status)}">${raffle.status.toUpperCase()}</span></td>
            <td>${raffle.winner_username ? `${raffle.winner_first_name} (@${raffle.winner_username})` : '-'}</td>
            <td><small>${new Date(raffle.created_at).toLocaleString()}</small></td>
            <td>
                ${raffle.status === 'active' ? 
                    `<button class="btn btn-sm btn-danger" onclick="cancelRaffle('${raffle.id}')">Cancel</button>` : 
                    '<span class="text-muted">-</span>'
                }
            </td>
        </tr>
    `).join('');
}

async function cancelRaffle(raffleId) {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    
    try {
        const data = await apiRequest(`/api/admin/raffles/${raffleId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        
        if (data.success) {
            alert('Raffle cancelled successfully');
            loadRaffles();
        } else {
            alert('Failed to cancel raffle: ' + data.error);
        }
    } catch (error) {
        alert('Failed to cancel raffle');
        console.error(error);
    }
}

// Users functions
async function loadUsers() {
    try {
        const search = document.getElementById('userSearchInput')?.value || '';
        const data = await apiRequest(`/api/admin/users?search=${encodeURIComponent(search)}`);
        
        if (data.success) {
            renderUsersTable(data.users);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.telegram_id}</td>
            <td>${user.first_name} ${user.last_name || ''}</td>
            <td>${user.username ? '@' + user.username : '-'}</td>
            <td>${user.total_bids || 0}</td>
            <td>${user.wins || 0}</td>
            <td><strong>${user.total_winnings || 0}</strong> ⭐</td>
            <td><strong>${user.total_spent || 0}</strong> ⭐</td>
            <td><small>${new Date(user.last_active).toLocaleString()}</small></td>
        </tr>
    `).join('');
}

function searchUsers() {
    clearTimeout(window.userSearchTimeout);
    window.userSearchTimeout = setTimeout(loadUsers, 500);
}

// Transactions functions
async function loadTransactions() {
    try {
        const type = document.getElementById('transactionTypeFilter').value;
        const status = document.getElementById('transactionStatusFilter').value;
        const data = await apiRequest(`/api/admin/transactions?type=${type}&status=${status}`);
        
        if (data.success) {
            renderTransactionsTable(data.transactions);
        }
    } catch (error) {
        console.error('Failed to load transactions:', error);
    }
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td><small>${tx.id.substring(0, 8)}...</small></td>
            <td>${tx.username ? `${tx.first_name} (@${tx.username})` : (tx.first_name || `ID: ${tx.user_telegram_id}`)}</td>
            <td>
                <span class="${tx.amount > 0 ? 'text-success' : 'text-danger'}">
                    ${tx.amount > 0 ? '+' : ''}${tx.amount} ⭐
                </span>
            </td>
            <td><span class="badge badge-${getTypeColor(tx.type)}">${tx.type.toUpperCase()}</span></td>
            <td><span class="badge badge-${getStatusColor(tx.status)}">${tx.status.toUpperCase()}</span></td>
            <td>${tx.raffle_display_id ? `<small>${tx.raffle_display_id.substring(0, 8)}...</small>` : '-'}</td>
            <td><small>${new Date(tx.created_at).toLocaleString()}</small></td>
        </tr>
    `).join('');
}

// Settings functions
async function loadSettings() {
    try {
        const data = await apiRequest('/api/admin/settings');
        
        if (data.success && data.settings) {
            const settings = data.settings;
            document.getElementById('participantsLimit').value = settings.participants_limit;
            document.getElementById('betAmount').value = settings.bet_amount;
            document.getElementById('winnerPercentage').value = settings.winner_percentage;
            document.getElementById('organizerPercentage').value = settings.organizer_percentage;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

async function updateSettings(event) {
    event.preventDefault();
    
    const participantsLimit = parseInt(document.getElementById('participantsLimit').value);
    const betAmount = parseInt(document.getElementById('betAmount').value);
    const winnerPercentage = parseInt(document.getElementById('winnerPercentage').value);
    const organizerPercentage = parseInt(document.getElementById('organizerPercentage').value);
    
    if (winnerPercentage + organizerPercentage !== 100) {
        alert('Winner percentage and organizer percentage must sum to 100%');
        return;
    }
    
    try {
        const data = await apiRequest('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({
                participants_limit: participantsLimit,
                bet_amount: betAmount,
                winner_percentage: winnerPercentage,
                organizer_percentage: organizerPercentage
            })
        });
        
        if (data.success) {
            alert('Settings updated successfully');
        } else {
            alert('Failed to update settings: ' + data.error);
        }
    } catch (error) {
        alert('Failed to update settings');
        console.error(error);
    }
}

// Audit logs functions
async function loadAuditLogs() {
    try {
        const data = await apiRequest('/api/admin/audit-logs');
        
        if (data.success) {
            renderAuditLogsTable(data.logs);
        }
    } catch (error) {
        console.error('Failed to load audit logs:', error);
    }
}

function renderAuditLogsTable(logs) {
    const tbody = document.getElementById('auditLogsBody');
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No audit logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${log.admin_user || 'System'}</td>
            <td><span class="badge badge-info">${log.action.toUpperCase()}</span></td>
            <td>${log.target_type ? `${log.target_type}: ${log.target_id?.substring(0, 8) || ''}` : '-'}</td>
            <td><small>${log.details ? JSON.stringify(log.details).substring(0, 100) : '-'}</small></td>
            <td><small>${log.ip_address || '-'}</small></td>
            <td><small>${new Date(log.created_at).toLocaleString()}</small></td>
        </tr>
    `).join('');
}

// Helper functions
function getStatusColor(status) {
    const colors = {
        'active': 'info',
        'completed': 'success',
        'cancelled': 'danger',
        'pending': 'warning',
        'confirmed': 'success',
        'failed': 'danger'
    };
    return colors[status] || 'secondary';
}

function getTypeColor(type) {
    const colors = {
        'bet': 'danger',
        'win': 'success',
        'refund': 'warning',
        'fee': 'info'
    };
    return colors[type] || 'secondary';
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (currentSection === 'dashboard' && document.getElementById('adminPanel').style.display !== 'none') {
        loadDashboard();
    }
}, 30000);