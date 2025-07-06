// Global variables
let currentDonor = null;
let dashboardData = null;

// API Base URL
const API_BASE = '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    console.log('Donor dashboard loaded');

    // Check if donor is logged in
    const savedDonor = localStorage.getItem('currentDonor');
    if (savedDonor) {
        currentDonor = JSON.parse(savedDonor);
        showDashboard();
        loadDashboardData();
    } else {
        showLoginModal();
    }

    // Initialize event listeners
    initializeEventListeners();
});

// Initialize event listeners
function initializeEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Donation form
    const donationForm = document.getElementById('donationForm');
    if (donationForm) {
        donationForm.addEventListener('submit', handleDonation);
    }

    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function () {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }

            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Handle donor login
async function handleLogin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const email = formData.get('email');

    try {
        const response = await fetch(`${API_BASE}/donor/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (response.ok) {
            currentDonor = result.donor;
            localStorage.setItem('currentDonor', JSON.stringify(currentDonor));

            showNotification('Login successful!', 'success');
            hideLoginModal();
            showDashboard();
            loadDashboardData();
        } else {
            showNotification(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Handle blood donation recording
async function handleDonation(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const donationData = {
        donor_id: currentDonor.id,
        donation_date: formData.get('donation_date'),
        blood_amount: parseFloat(formData.get('blood_amount')),
        notes: formData.get('notes')
    };

    try {
        const response = await fetch(`${API_BASE}/donations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(donationData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(`Donation recorded successfully! You earned ${result.points_earned} points.`, 'success');
            e.target.reset();
            closeDonationModal();
            loadDashboardData(); // Refresh dashboard data
        } else {
            showNotification(result.error || 'Failed to record donation', 'error');
        }
    } catch (error) {
        console.error('Donation error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Load dashboard data
async function loadDashboardData() {
    if (!currentDonor) return;

    try {
        const response = await fetch(`${API_BASE}/donor/${currentDonor.email}/dashboard`);
        const data = await response.json();

        if (response.ok) {
            dashboardData = data;
            updateDashboard(data);
        } else {
            showNotification('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Network error loading dashboard', 'error');
    }
}

// Update dashboard with data
function updateDashboard(data) {
    const { donor, donations, camps, rewards } = data;

    // Update donor name
    document.getElementById('donorName').textContent = donor.name;

    // Update statistics
    document.getElementById('totalDonations').textContent = donations.length;
    document.getElementById('totalPoints').textContent = donor.points;
    document.getElementById('currentPoints').textContent = donor.points;

    // Calculate rewards redeemed (this would need to be tracked in the database)
    const rewardsRedeemed = 0; // Placeholder
    document.getElementById('rewardsRedeemed').textContent = rewardsRedeemed;

    // Render blood camps
    renderBloodCamps(camps);

    // Render rewards
    renderRewards(rewards, donor.points);

    // Render donations
    renderDonations(donations);
}

// Render blood camps
function renderBloodCamps(camps) {
    const campsList = document.getElementById('campsList');
    if (!campsList) return;

    if (camps.length === 0) {
        campsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No upcoming blood camps</h3>
                <p>Check back later for new blood donation camps.</p>
            </div>
        `;
        return;
    }

    campsList.innerHTML = camps.map(camp => `
        <div class="camp-card">
            <div class="camp-header">
                <div>
                    <div class="camp-name">${camp.name}</div>
                    <div class="camp-date">${formatDate(camp.date)}</div>
                </div>
            </div>
            <div class="camp-details">
                <p><i class="fas fa-map-marker-alt"></i> ${camp.location}</p>
                <p><i class="fas fa-clock"></i> ${camp.time}</p>
                <p><i class="fas fa-user"></i> ${camp.organizer}</p>
                <p><i class="fas fa-phone"></i> ${camp.contact_phone}</p>
                <p><i class="fas fa-info-circle"></i> ${camp.description}</p>
            </div>
        </div>
    `).join('');
}

// Render rewards
function renderRewards(rewards, availablePoints) {
    const rewardsList = document.getElementById('rewardsList');
    if (!rewardsList) return;

    if (rewards.length === 0) {
        rewardsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gift"></i>
                <h3>No rewards available</h3>
                <p>Check back later for new rewards.</p>
            </div>
        `;
        return;
    }

    rewardsList.innerHTML = rewards.map(reward => {
        const canRedeem = availablePoints >= reward.points_required;
        return `
            <div class="reward-card">
                <div class="reward-header">
                    <div>
                        <div class="reward-name">${reward.name}</div>
                        <div class="reward-discount">${reward.discount_percentage}% Discount</div>
                    </div>
                    <div class="reward-points">${reward.points_required} pts</div>
                </div>
                <div class="reward-description">${reward.description}</div>
                <button class="redeem-btn" 
                        onclick="redeemReward(${reward.id})" 
                        ${!canRedeem ? 'disabled' : ''}>
                    ${canRedeem ? 'Redeem Reward' : 'Insufficient Points'}
                </button>
            </div>
        `;
    }).join('');
}

// Render donations
function renderDonations(donations) {
    const donationsList = document.getElementById('donationsList');
    if (!donationsList) return;

    if (donations.length === 0) {
        donationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No donations yet</h3>
                <p>Start your donation journey by recording your first blood donation.</p>
            </div>
        `;
        return;
    }

    donationsList.innerHTML = donations.map(donation => `
        <div class="donation-item">
            <div class="donation-info">
                <div class="donation-date">${formatDate(donation.donation_date)}</div>
                <div class="donation-details">
                    Blood Amount: ${donation.blood_amount} units<br>
                    ${donation.notes ? `Notes: ${donation.notes}` : ''}
                </div>
            </div>
            <div class="donation-points">
                +${donation.points_earned} pts
            </div>
        </div>
    `).join('');
}

// Redeem reward
async function redeemReward(rewardId) {
    if (!currentDonor) return;

    try {
        const response = await fetch(`${API_BASE}/donor/${currentDonor.id}/redeem-reward`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reward_id: rewardId })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(`Reward redeemed successfully! You spent ${result.points_spent} points.`, 'success');
            loadDashboardData(); // Refresh dashboard data
        } else {
            showNotification(result.error || 'Failed to redeem reward', 'error');
        }
    } catch (error) {
        console.error('Reward redemption error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Modal functions
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showDonationForm() {
    const modal = document.getElementById('donationModal');
    if (modal) {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('donationDate').value = today;
        modal.style.display = 'block';
    }
}

function closeDonationModal() {
    const modal = document.getElementById('donationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showDashboard() {
    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent) {
        dashboardContent.style.display = 'block';
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add slideOut animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Logout function
function logout() {
    localStorage.removeItem('currentDonor');
    currentDonor = null;
    dashboardData = null;

    // Redirect to home page
    window.location.href = '/';
}

// Add logout button to navigation (optional)
function addLogoutButton() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        const logoutItem = document.createElement('li');
        logoutItem.innerHTML = '<a href="#" onclick="logout()" class="nav-link">Logout</a>';
        navMenu.appendChild(logoutItem);
    }
}

// Initialize logout button when dashboard is shown
document.addEventListener('DOMContentLoaded', function () {
    if (currentDonor) {
        addLogoutButton();
    }
}); 