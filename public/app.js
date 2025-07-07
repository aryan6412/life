// Global variables
let currentDonors = [];
let currentRequests = [];

// API Base URL
const API_BASE = 'https://lifeline-brp.onrender.com/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    console.log('Lifeline application loaded');

    // Initialize navigation
    initializeNavigation();

    // Initialize forms
    initializeForms();

    // Load initial data
    loadDonors();
    loadRequests();

    // Initialize blood type filter
    initializeBloodTypeFilter();

    // Donor Register in navbar dropdown
    const donorRegisterNav = document.getElementById('donorRegisterNav');
    if (donorRegisterNav) {
        donorRegisterNav.addEventListener('click', function (e) {
            e.preventDefault();
            scrollToSection('register');
        });
    }
});

// Navigation functions
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // Handle navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Check if it's an external link (starts with /)
            if (href.startsWith('/')) {
                // Allow normal navigation for external links
                return;
            }

            // Handle smooth scrolling for internal links
            e.preventDefault();
            const targetId = href.substring(1);
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

            // Close mobile menu
            navMenu.classList.remove('active');
        });
    });

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
            navMenu.classList.remove('active');
        }
    });
}

// Form initialization
function initializeForms() {
    // Donor registration form
    const donorForm = document.getElementById('donorForm');
    if (donorForm) {
        donorForm.addEventListener('submit', handleDonorRegistration);
    }

    // Blood request form
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', handleBloodRequest);
    }
}

// Handle donor registration
async function handleDonorRegistration(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const donorData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        blood_type: formData.get('blood_type'),
        age: parseInt(formData.get('age')),
        city: formData.get('city')
    };

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(donorData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Donor registered successfully! Redirecting to dashboard...', 'success');
            e.target.reset();
            loadDonors(); // Refresh donors list

            // Navigate to donor dashboard after successful registration
            setTimeout(() => {
                window.location.href = '/donor-dashboard';
            }, 1500); // Wait 1.5 seconds to show the success message
        } else {
            showNotification(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Handle blood request
async function handleBloodRequest(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        patient_name: formData.get('patient_name'),
        blood_type: formData.get('blood_type'),
        units_needed: parseInt(formData.get('units_needed')),
        hospital: formData.get('hospital'),
        urgency: formData.get('urgency'),
        contact_phone: formData.get('contact_phone')
    };

    try {
        const response = await fetch(`${API_BASE}/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Blood request created successfully!', 'success');
            e.target.reset();
            loadRequests(); // Refresh requests list
        } else {
            showNotification(result.error || 'Request creation failed', 'error');
        }
    } catch (error) {
        console.error('Request error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Load donors
async function loadDonors(bloodType = 'all') {
    try {
        let url = `${API_BASE}/donors`;
        if (bloodType !== 'all') {
            url = `${API_BASE}/donors/blood-type/${bloodType}`;
        }

        const response = await fetch(url);
        const donors = await response.json();

        if (response.ok) {
            currentDonors = donors;
            renderDonors(donors);
        } else {
            showNotification('Failed to load donors', 'error');
        }
    } catch (error) {
        console.error('Error loading donors:', error);
        showNotification('Network error loading donors', 'error');
    }
}

// Render donors
function renderDonors(donors) {
    const donorsList = document.getElementById('donorsList');
    if (!donorsList) return;

    if (donors.length === 0) {
        donorsList.innerHTML = `
            <div class="no-donors">
                <i class="fas fa-user-slash"></i>
                <h3>No donors found</h3>
                <p>No donors match your current filter.</p>
            </div>
        `;
        return;
    }

    donorsList.innerHTML = donors.map(donor => `
        <div class="donor-card">
            <div class="donor-header">
                <div class="donor-avatar">
                    ${donor.name.charAt(0).toUpperCase()}
                </div>
                <div class="donor-info">
                    <h4>${donor.name}</h4>
                    <p>${donor.city}</p>
                </div>
            </div>
            <div class="donor-details">
                <div class="detail-item">
                    <div class="detail-label">Blood Type</div>
                    <div class="detail-value">
                        <span class="blood-type-badge">${donor.blood_type}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Age</div>
                    <div class="detail-value">${donor.age}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value">${donor.phone}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        ${donor.is_available ?
            '<span style="color: #10b981;">Available</span>' :
            '<span style="color: #ef4444;">Unavailable</span>'
        }
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Load blood requests
async function loadRequests() {
    try {
        const response = await fetch(`${API_BASE}/requests`);
        const requests = await response.json();

        if (response.ok) {
            currentRequests = requests;
            renderRequests(requests);
        } else {
            showNotification('Failed to load blood requests', 'error');
        }
    } catch (error) {
        console.error('Error loading requests:', error);
        showNotification('Network error loading requests', 'error');
    }
}

// Render blood requests
function renderRequests(requests) {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    if (requests.length === 0) {
        requestsList.innerHTML = `
            <div class="no-requests">
                <i class="fas fa-clipboard-list"></i>
                <h3>No blood requests</h3>
                <p>No blood requests found.</p>
            </div>
        `;
        return;
    }

    requestsList.innerHTML = requests.map(request => `
        <div class="request-item">
            <div class="request-header">
                <div class="request-patient">${request.patient_name}</div>
                <div class="request-urgency ${request.urgency}">${request.urgency.toUpperCase()}</div>
            </div>
            <div class="request-details">
                <p><strong>Blood Type:</strong> ${request.blood_type}</p>
                <p><strong>Units Needed:</strong> ${request.units_needed}</p>
                <p><strong>Hospital:</strong> ${request.hospital}</p>
                <p><strong>Contact:</strong> ${request.contact_phone}</p>
                <p><strong>Status:</strong> ${request.status}</p>
                <p><strong>Date:</strong> ${new Date(request.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

// Initialize blood type filter
function initializeBloodTypeFilter() {
    const bloodTypeButtons = document.querySelectorAll('.blood-type-btn');

    bloodTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            bloodTypeButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Load donors with selected blood type
            const bloodType = button.dataset.type;
            loadDonors(bloodType);
        });
    });
}

// Utility functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Handle dashboard navigation
document.addEventListener('DOMContentLoaded', function () {
    // Add click handlers for dashboard links
    const dashboardLinks = document.querySelectorAll('a[href="/donor-dashboard"]');
    dashboardLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            // Let the default navigation happen
            console.log('Navigating to donor dashboard...');
        });
    });
});

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

// Update hero stats with real data
function updateHeroStats() {
    // This would typically fetch real statistics from the server
    // For now, we'll use placeholder data
    const stats = {
        donors: currentDonors.length,
        requests: currentRequests.length,
        hospitals: 89 // Placeholder
    };

    // Update stats in the hero section
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 3) {
        statNumbers[0].textContent = stats.donors.toLocaleString();
        statNumbers[1].textContent = (stats.donors * 3).toLocaleString(); // Estimated lives saved
        statNumbers[2].textContent = stats.hospitals.toLocaleString();
    }
}

// Update stats when data loads
document.addEventListener('DOMContentLoaded', () => {
    // Update stats after initial load
    setTimeout(updateHeroStats, 1000);
}); 