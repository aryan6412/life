// Hospital Dashboard JavaScript

// Global variables
let currentHospital = null;
let currentCamps = [];
let currentRequests = [];
let currentProvisions = [];

// API Base URL
const API_BASE = 'https://lifeline-brp.onrender.com/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    console.log('Hospital Dashboard loaded');

    // Initialize navigation
    initializeNavigation();

    // Initialize forms
    initializeForms();

    // Check if hospital is logged in
    checkHospitalAuth();

    // Load initial data
    loadCamps();
    loadRequests();
    loadProvisions();

    // Open registration modal from login modal
    const openRegisterModal = document.getElementById('openRegisterModal');
    if (openRegisterModal) {
        openRegisterModal.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('registerModal').style.display = 'block';
        });
    }

    // Show login modal on page load if not logged in
    const hospitalId = localStorage.getItem('hospitalId');
    if (!hospitalId) {
        document.getElementById('loginModal').style.display = 'block';
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
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleHospitalLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleHospitalRegistration);
    }

    // Camp form
    const campForm = document.getElementById('campForm');
    if (campForm) {
        campForm.addEventListener('submit', handleCampCreation);
    }

    // Request form
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', handleBloodRequest);
    }

    // Provision form
    const provisionForm = document.getElementById('provisionForm');
    if (provisionForm) {
        provisionForm.addEventListener('submit', handleBloodProvision);
    }
}

// Check hospital authentication
function checkHospitalAuth() {
    const hospitalId = localStorage.getItem('hospitalId');
    const hospitalName = localStorage.getItem('hospitalName');

    if (hospitalId && hospitalName) {
        currentHospital = { id: hospitalId, name: hospitalName };
        showDashboard();
        updateHospitalInfo();
    } else {
        showLoginModal();
    }
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'block';
}

// Show register modal
function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    modal.style.display = 'block';
}

// Show dashboard
function showDashboard() {
    const dashboardContent = document.getElementById('dashboardContent');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');

    dashboardContent.style.display = 'block';
    loginModal.style.display = 'none';
    registerModal.style.display = 'none';
}

// Update hospital info
function updateHospitalInfo() {
    if (currentHospital) {
        const hospitalNameElement = document.getElementById('hospitalName');
        if (hospitalNameElement) {
            hospitalNameElement.textContent = currentHospital.name;
        }
    }
}

// Handle hospital login
async function handleHospitalLogin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE}/hospital/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (response.ok) {
            currentHospital = result.hospital;
            localStorage.setItem('hospitalId', currentHospital.id);
            localStorage.setItem('hospitalName', currentHospital.name);

            showNotification('Login successful!', 'success');
            showDashboard();
            updateHospitalInfo();

            // Load data
            loadCamps();
            loadRequests();
            loadProvisions();
        } else {
            showNotification(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Handle hospital registration
async function handleHospitalRegistration(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const hospitalData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        type: formData.get('type'),
        address: formData.get('address'),
        city: formData.get('city'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE}/hospital/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(hospitalData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Hospital registered successfully! Please login.', 'success');
            e.target.reset();

            // Switch to login modal
            document.getElementById('registerModal').style.display = 'none';
            showLoginModal();
        } else {
            showNotification(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Show camp form
function showCampForm() {
    const modal = document.getElementById('campModal');
    modal.style.display = 'block';
}

// Close camp modal
function closeCampModal() {
    const modal = document.getElementById('campModal');
    modal.style.display = 'none';
    document.getElementById('campForm').reset();
}

// Handle camp creation
async function handleCampCreation(e) {
    e.preventDefault();

    if (!currentHospital) {
        showNotification('Please login first', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const campData = {
        hospital_id: currentHospital.id,
        name: formData.get('name'),
        date: formData.get('date'),
        time: formData.get('time'),
        duration: parseInt(formData.get('duration')),
        location: formData.get('location'),
        description: formData.get('description')
    };

    try {
        const response = await fetch(`${API_BASE}/camps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(campData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Blood camp created successfully!', 'success');
            e.target.reset();
            closeCampModal();
            loadCamps();
        } else {
            showNotification(result.error || 'Camp creation failed', 'error');
        }
    } catch (error) {
        console.error('Camp creation error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Show request form
function showRequestForm() {
    const modal = document.getElementById('requestModal');
    modal.style.display = 'block';
}

// Close request modal
function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    modal.style.display = 'none';
    document.getElementById('requestForm').reset();
}

// Handle blood request
async function handleBloodRequest(e) {
    e.preventDefault();

    if (!currentHospital) {
        showNotification('Please login first', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const requestData = {
        hospital_id: currentHospital.id,
        patient_name: formData.get('patient_name'),
        blood_type: formData.get('blood_type'),
        units_needed: parseInt(formData.get('units_needed')),
        urgency: formData.get('urgency'),
        reason: formData.get('reason')
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
            closeRequestModal();
            loadRequests();
        } else {
            showNotification(result.error || 'Request creation failed', 'error');
        }
    } catch (error) {
        console.error('Request error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Show provision form
function showProvisionForm() {
    const modal = document.getElementById('provisionModal');
    modal.style.display = 'block';
}

// Close provision modal
function closeProvisionModal() {
    const modal = document.getElementById('provisionModal');
    modal.style.display = 'none';
    document.getElementById('provisionForm').reset();
}

// Handle blood provision
async function handleBloodProvision(e) {
    e.preventDefault();

    if (!currentHospital) {
        showNotification('Please login first', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const provisionData = {
        hospital_id: currentHospital.id,
        recipient_name: formData.get('recipient_name'),
        blood_type: formData.get('blood_type'),
        units_provided: parseFloat(formData.get('units_provided')),
        provision_date: formData.get('provision_date'),
        notes: formData.get('notes')
    };

    try {
        const response = await fetch(`${API_BASE}/provisions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(provisionData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Blood provision recorded successfully!', 'success');
            e.target.reset();
            closeProvisionModal();
            loadProvisions();
        } else {
            showNotification(result.error || 'Provision recording failed', 'error');
        }
    } catch (error) {
        console.error('Provision error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Load camps
async function loadCamps() {
    if (!currentHospital) return;

    try {
        const response = await fetch(`${API_BASE}/camps/hospital/${currentHospital.id}`);
        const camps = await response.json();

        if (response.ok) {
            currentCamps = camps;
            renderCamps(camps);
            updateStats();
        } else {
            showNotification('Failed to load camps', 'error');
        }
    } catch (error) {
        console.error('Error loading camps:', error);
        showNotification('Network error loading camps', 'error');
    }
}

// Render camps
function renderCamps(camps) {
    const campsList = document.getElementById('campsList');
    if (!campsList) return;

    if (camps.length === 0) {
        campsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No blood camps found</h3>
                <p>Create your first blood donation camp to get started.</p>
            </div>
        `;
        return;
    }

    campsList.innerHTML = camps.map(camp => `
        <div class="camp-card">
            <div class="camp-header">
                <div class="camp-name">${camp.name}</div>
                <div class="camp-date">${new Date(camp.date).toLocaleDateString()}</div>
            </div>
            <div class="camp-details">
                <p><i class="fas fa-clock"></i> ${camp.time} (${camp.duration} hours)</p>
                <p><i class="fas fa-map-marker-alt"></i> ${camp.location}</p>
                ${camp.description ? `<p><i class="fas fa-info-circle"></i> ${camp.description}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// Load requests
async function loadRequests() {
    if (!currentHospital) return;

    try {
        const response = await fetch(`${API_BASE}/requests/hospital/${currentHospital.id}`);
        const requests = await response.json();

        if (response.ok) {
            currentRequests = requests;
            renderRequests(requests);
            updateStats();
        } else {
            showNotification('Failed to load requests', 'error');
        }
    } catch (error) {
        console.error('Error loading requests:', error);
        showNotification('Network error loading requests', 'error');
    }
}

// Render requests
function renderRequests(requests) {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    if (requests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tint"></i>
                <h3>No blood requests found</h3>
                <p>Create blood requests for patients in need.</p>
            </div>
        `;
        return;
    }

    requestsList.innerHTML = requests.map(request => `
        <div class="request-card">
            <div class="request-header">
                <div class="request-patient">${request.patient_name}</div>
                <div class="request-urgency ${request.urgency}">${request.urgency}</div>
            </div>
            <div class="request-details">
                <p><i class="fas fa-tint"></i> Blood Type: ${request.blood_type}</p>
                <p><i class="fas fa-syringe"></i> Units Needed: ${request.units_needed}</p>
                <p><i class="fas fa-calendar"></i> Requested: ${new Date(request.created_at).toLocaleDateString()}</p>
                ${request.reason ? `<p><i class="fas fa-sticky-note"></i> ${request.reason}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// Load provisions
async function loadProvisions() {
    if (!currentHospital) return;

    try {
        const response = await fetch(`${API_BASE}/provisions/hospital/${currentHospital.id}`);
        const provisions = await response.json();

        if (response.ok) {
            currentProvisions = provisions;
            renderProvisions(provisions);
            updateStats();
        } else {
            showNotification('Failed to load provisions', 'error');
        }
    } catch (error) {
        console.error('Error loading provisions:', error);
        showNotification('Network error loading provisions', 'error');
    }
}

// Render provisions
function renderProvisions(provisions) {
    const provisionsList = document.getElementById('provisionsList');
    if (!provisionsList) return;

    if (provisions.length === 0) {
        provisionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-hand-holding-heart"></i>
                <h3>No blood provisions found</h3>
                <p>Record blood provisions provided to patients.</p>
            </div>
        `;
        return;
    }

    provisionsList.innerHTML = provisions.map(provision => `
        <div class="provision-card">
            <div class="provision-header">
                <div class="provision-recipient">${provision.recipient_name}</div>
                <div class="provision-date">${new Date(provision.provision_date).toLocaleDateString()}</div>
            </div>
            <div class="provision-details">
                <p><i class="fas fa-tint"></i> Blood Type: ${provision.blood_type}</p>
                <p><i class="fas fa-syringe"></i> Units Provided: ${provision.units_provided}</p>
                <p><i class="fas fa-calendar"></i> Provided: ${new Date(provision.created_at).toLocaleDateString()}</p>
                ${provision.notes ? `<p><i class="fas fa-sticky-note"></i> ${provision.notes}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// Update stats
function updateStats() {
    const totalCampsElement = document.getElementById('totalCamps');
    const totalRequestsElement = document.getElementById('totalRequests');
    const totalProvisionsElement = document.getElementById('totalProvisions');

    if (totalCampsElement) totalCampsElement.textContent = currentCamps.length;
    if (totalRequestsElement) totalRequestsElement.textContent = currentRequests.length;
    if (totalProvisionsElement) totalProvisionsElement.textContent = currentProvisions.length;
}

// Scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notificationContainer = document.querySelector('.notification-container') || createNotificationContainer();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Create notification container
function createNotificationContainer() {
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

// Close modal when clicking outside
window.addEventListener('click', function (e) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Close modal when clicking close button
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
});

// Record Donation Modal logic
function showRecordDonationModal() {
    document.getElementById('recordDonationModal').style.display = 'block';
    document.getElementById('recordDonationForm').reset();
    document.getElementById('donorSearchResult').innerHTML = '';
    document.getElementById('donationFields').style.display = 'none';
    window.selectedDonorId = null;
}
function closeRecordDonationModal() {
    document.getElementById('recordDonationModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    const findDonorBtn = document.getElementById('findDonorBtn');
    if (findDonorBtn) {
        findDonorBtn.addEventListener('click', async function () {
            const searchValue = document.getElementById('searchDonor').value.trim();
            const resultDiv = document.getElementById('donorSearchResult');
            if (!searchValue) {
                resultDiv.innerHTML = '<span style="color:#dc2626;">Please enter donor email or phone.</span>';
                return;
            }
            // Search donor by email or phone
            let donor = null;
            try {
                let res = await fetch(`/api/donors`);
                let donors = await res.json();
                donor = donors.find(d => d.email === searchValue || d.phone === searchValue);
            } catch (e) {
                donor = null;
            }
            if (donor) {
                resultDiv.innerHTML = `<span style='color: #22c55e;'>Donor found: <b>${donor.name}</b> (${donor.blood_type}, ${donor.city})</span>`;
                document.getElementById('donationFields').style.display = '';
                window.selectedDonorId = donor.id;
            } else {
                resultDiv.innerHTML = '<span style="color:#dc2626;">Donor not found.</span>';
                document.getElementById('donationFields').style.display = 'none';
                window.selectedDonorId = null;
            }
        });
    }
}); 