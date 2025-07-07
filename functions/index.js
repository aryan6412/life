/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./database/lifeline.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        createTables();
    }
});

// Create tables
function createTables() {
    const donorsTable = `
        CREATE TABLE IF NOT EXISTS donors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            blood_type TEXT NOT NULL,
            age INTEGER NOT NULL,
            city TEXT NOT NULL,
            last_donation_date TEXT,
            is_available BOOLEAN DEFAULT 1,
            points INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const donationsTable = `
        CREATE TABLE IF NOT EXISTS donations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            donor_id INTEGER,
            donation_date TEXT NOT NULL,
            blood_amount REAL NOT NULL,
            points_earned INTEGER DEFAULT 10,
            status TEXT DEFAULT 'completed',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (donor_id) REFERENCES donors (id)
        )
    `;

    const requestsTable = `
        CREATE TABLE IF NOT EXISTS blood_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital_id INTEGER,
            patient_name TEXT NOT NULL,
            blood_type TEXT NOT NULL,
            units_needed INTEGER NOT NULL,
            urgency TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        )
    `;

    const campsTable = `
        CREATE TABLE IF NOT EXISTS blood_camps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital_id INTEGER,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            duration INTEGER NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'upcoming',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        )
    `;

    const rewardsTable = `
        CREATE TABLE IF NOT EXISTS rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            points_required INTEGER NOT NULL,
            discount_percentage INTEGER NOT NULL,
            valid_until TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const donorRewardsTable = `
        CREATE TABLE IF NOT EXISTS donor_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            donor_id INTEGER,
            reward_id INTEGER,
            redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            points_spent INTEGER NOT NULL,
            FOREIGN KEY (donor_id) REFERENCES donors (id),
            FOREIGN KEY (reward_id) REFERENCES rewards (id)
        )
    `;

    const hospitalsTable = `
        CREATE TABLE IF NOT EXISTS hospitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            type TEXT NOT NULL,
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const bloodProvisionsTable = `
        CREATE TABLE IF NOT EXISTS blood_provisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital_id INTEGER,
            recipient_name TEXT NOT NULL,
            blood_type TEXT NOT NULL,
            units_provided REAL NOT NULL,
            provision_date TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        )
    `;

    const campPhotosTable = `
        CREATE TABLE IF NOT EXISTS camp_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            caption TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.serialize(() => {
        db.run(donorsTable, (err) => {
            if (err) {
                console.error('Error creating donors table:', err.message);
            } else {
                console.log('Donors table created successfully');
            }
        });

        db.run(donationsTable, (err) => {
            if (err) {
                console.error('Error creating donations table:', err.message);
            } else {
                console.log('Donations table created successfully');
            }
        });

        db.run(requestsTable, (err) => {
            if (err) {
                console.error('Error creating blood requests table:', err.message);
            } else {
                console.log('Blood requests table created successfully');
            }
        });

        db.run(campsTable, (err) => {
            if (err) {
                console.error('Error creating blood camps table:', err.message);
            } else {
                console.log('Blood camps table created successfully');
            }
        });

        db.run(rewardsTable, (err) => {
            if (err) {
                console.error('Error creating rewards table:', err.message);
            } else {
                console.log('Rewards table created successfully');
            }
        });

        db.run(donorRewardsTable, (err) => {
            if (err) {
                console.error('Error creating donor rewards table:', err.message);
            } else {
                console.log('Donor rewards table created successfully');
            }
        });

        db.run(hospitalsTable, (err) => {
            if (err) {
                console.error('Error creating hospitals table:', err.message);
            } else {
                console.log('Hospitals table created successfully');
            }
        });

        db.run(bloodProvisionsTable, (err) => {
            if (err) {
                console.error('Error creating blood provisions table:', err.message);
            } else {
                console.log('Blood provisions table created successfully');
            }
        });

        db.run(campPhotosTable, (err) => {
            if (err) {
                console.error('Error creating camp photos table:', err.message);
            } else {
                console.log('Camp photos table created successfully');
            }
        });

        // Insert sample data
        insertSampleData();
    });
}

// Insert sample data
function insertSampleData() {
    // Sample hospitals
    const sampleHospitals = [
        ['City General Hospital', 'city.hospital@email.com', '+1-555-0101', 'Government', '123 Main Street, Downtown', 'New York', 'password123'],
        ['Community Medical Center', 'community.medical@email.com', '+1-555-0102', 'Private', '456 Oak Avenue, Westside', 'Los Angeles', 'password123'],
        ['University Health Center', 'university.health@email.com', '+1-555-0103', 'Medical Center', '789 Campus Drive, North', 'Chicago', 'password123'],
        ['Regional Blood Bank', 'regional.blood@email.com', '+1-555-0104', 'Blood Bank', '321 Health Plaza, East', 'Houston', 'password123']
    ];

    const hospitalsQuery = 'INSERT OR IGNORE INTO hospitals (name, email, phone, type, address, city, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
    sampleHospitals.forEach(hospital => {
        const hashedPassword = bcrypt.hashSync(hospital[6], 10);
        db.run(hospitalsQuery, [hospital[0], hospital[1], hospital[2], hospital[3], hospital[4], hospital[5], hashedPassword]);
    });

    // Sample blood camps (will be added after hospitals are created)
    setTimeout(() => {
        const sampleCamps = [
            [1, 'City Hospital Blood Drive', 'City Hospital, Downtown', '2024-07-15', '09:00', 8, 'Monthly blood donation camp with free health checkup'],
            [2, 'Community Center Camp', 'Community Center, Westside', '2024-07-20', '10:00', 8, 'Community blood donation drive with refreshments'],
            [3, 'University Blood Drive', 'University Campus, North', '2024-07-25', '08:00', 8, 'Student blood donation campaign'],
            [4, 'Regional Blood Camp', 'Regional Blood Bank, East', '2024-07-30', '09:00', 8, 'Regional blood donation with wellness benefits']
        ];

        const campsQuery = 'INSERT OR IGNORE INTO blood_camps (hospital_id, name, location, date, time, duration, description) VALUES (?, ?, ?, ?, ?, ?, ?)';
        sampleCamps.forEach(camp => {
            db.run(campsQuery, camp);
        });
    }, 1000);

    // Sample rewards
    const sampleRewards = [
        ['Health Checkup Discount', '20% off on complete health checkup package', 50, 20, '2024-12-31'],
        ['Dental Checkup', 'Free dental checkup and cleaning', 30, 100, '2024-12-31'],
        ['Eye Test Discount', '30% off on eye examination and glasses', 40, 30, '2024-12-31'],
        ['Pharmacy Discount', '15% off on medicines at partner pharmacies', 25, 15, '2024-12-31'],
        ['Specialist Consultation', 'Free consultation with any specialist', 100, 100, '2024-12-31']
    ];

    const rewardsQuery = 'INSERT OR IGNORE INTO rewards (name, description, points_required, discount_percentage, valid_until) VALUES (?, ?, ?, ?, ?)';
    sampleRewards.forEach(reward => {
        db.run(rewardsQuery, reward);
    });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/donor-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'donor-dashboard.html'));
});

app.get('/hospital-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hospital-dashboard.html'));
});

// Register new donor
app.post('/api/register', (req, res) => {
    const { name, email, phone, blood_type, age, city } = req.body;

    // Validation
    if (!name || !email || !phone || !blood_type || !age || !city) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (age < 18 || age > 65) {
        return res.status(400).json({ error: 'Age must be between 18 and 65' });
    }

    const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodTypes.includes(blood_type)) {
        return res.status(400).json({ error: 'Invalid blood type' });
    }

    const query = `
        INSERT INTO donors (name, email, phone, blood_type, age, city)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [name, email, phone, blood_type, age, city], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            console.error('Error registering donor:', err.message);
            return res.status(500).json({ error: 'Failed to register donor' });
        }

        res.json({
            success: true,
            message: 'Donor registered successfully',
            donor_id: this.lastID
        });
    });
});

// Get donor by email (for login)
app.post('/api/donor/login', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const query = 'SELECT * FROM donors WHERE email = ?';
    db.get(query, [email], (err, donor) => {
        if (err) {
            console.error('Error finding donor:', err.message);
            return res.status(500).json({ error: 'Failed to find donor' });
        }

        if (!donor) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        res.json({
            success: true,
            donor: donor
        });
    });
});

// Get donor dashboard data
app.get('/api/donor/:email/dashboard', (req, res) => {
    const { email } = req.params;

    const donorQuery = 'SELECT * FROM donors WHERE email = ?';
    const donationsQuery = 'SELECT * FROM donations WHERE donor_id = ? ORDER BY donation_date DESC';
    const campsQuery = 'SELECT * FROM blood_camps WHERE date >= date("now") ORDER BY date ASC';
    const rewardsQuery = 'SELECT * FROM rewards WHERE is_active = 1 ORDER BY points_required ASC';

    db.get(donorQuery, [email], (err, donor) => {
        if (err) {
            console.error('Error finding donor:', err.message);
            return res.status(500).json({ error: 'Failed to find donor' });
        }

        if (!donor) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        // Get donor's donations
        db.all(donationsQuery, [donor.id], (err, donations) => {
            if (err) {
                console.error('Error fetching donations:', err.message);
                donations = [];
            }

            // Get upcoming camps
            db.all(campsQuery, [], (err, camps) => {
                if (err) {
                    console.error('Error fetching camps:', err.message);
                    camps = [];
                }

                // Get available rewards
                db.all(rewardsQuery, [], (err, rewards) => {
                    if (err) {
                        console.error('Error fetching rewards:', err.message);
                        rewards = [];
                    }

                    res.json({
                        success: true,
                        donor: donor,
                        donations: donations,
                        camps: camps,
                        rewards: rewards
                    });
                });
            });
        });
    });
});

// Record blood donation
app.post('/api/donations', (req, res) => {
    const { donor_id, donation_date, blood_amount, notes } = req.body;

    if (!donor_id || !donation_date || !blood_amount) {
        return res.status(400).json({ error: 'Donor ID, donation date, and blood amount are required' });
    }

    const pointsEarned = Math.floor(blood_amount * 10); // 10 points per unit

    const query = `
        INSERT INTO donations (donor_id, donation_date, blood_amount, points_earned, notes)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [donor_id, donation_date, blood_amount, pointsEarned, notes], function (err) {
        if (err) {
            console.error('Error recording donation:', err.message);
            return res.status(500).json({ error: 'Failed to record donation' });
        }

        // Update donor's points and last donation date
        const updateQuery = `
            UPDATE donors 
            SET points = points + ?, last_donation_date = ?
            WHERE id = ?
        `;

        db.run(updateQuery, [pointsEarned, donation_date, donor_id], (err) => {
            if (err) {
                console.error('Error updating donor points:', err.message);
            }
        });

        res.json({
            success: true,
            message: 'Donation recorded successfully',
            points_earned: pointsEarned,
            donation_id: this.lastID
        });
    });
});

// Redeem reward
app.post('/api/donor/:donor_id/redeem-reward', (req, res) => {
    const { donor_id } = req.params;
    const { reward_id } = req.body;

    if (!reward_id) {
        return res.status(400).json({ error: 'Reward ID is required' });
    }

    // Check if donor has enough points
    const donorQuery = 'SELECT points FROM donors WHERE id = ?';
    const rewardQuery = 'SELECT * FROM rewards WHERE id = ? AND is_active = 1';

    db.get(donorQuery, [donor_id], (err, donor) => {
        if (err || !donor) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        db.get(rewardQuery, [reward_id], (err, reward) => {
            if (err || !reward) {
                return res.status(404).json({ error: 'Reward not found' });
            }

            if (donor.points < reward.points_required) {
                return res.status(400).json({ error: 'Insufficient points' });
            }

            // Record reward redemption
            const redemptionQuery = `
                INSERT INTO donor_rewards (donor_id, reward_id, points_spent)
                VALUES (?, ?, ?)
            `;

            db.run(redemptionQuery, [donor_id, reward_id, reward.points_required], function (err) {
                if (err) {
                    console.error('Error redeeming reward:', err.message);
                    return res.status(500).json({ error: 'Failed to redeem reward' });
                }

                // Deduct points from donor
                const updateQuery = 'UPDATE donors SET points = points - ? WHERE id = ?';
                db.run(updateQuery, [reward.points_required, donor_id], (err) => {
                    if (err) {
                        console.error('Error updating donor points:', err.message);
                    }
                });

                res.json({
                    success: true,
                    message: 'Reward redeemed successfully',
                    reward: reward,
                    points_spent: reward.points_required
                });
            });
        });
    });
});

// Get all donors
app.get('/api/donors', (req, res) => {
    const query = 'SELECT * FROM donors ORDER BY created_at DESC';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching donors:', err.message);
            return res.status(500).json({ error: 'Failed to fetch donors' });
        }
        res.json(rows);
    });
});

// Get donors by blood type
app.get('/api/donors/blood-type/:type', (req, res) => {
    const { type } = req.params;
    const query = 'SELECT * FROM donors WHERE blood_type = ? AND is_available = 1';

    db.all(query, [type], (err, rows) => {
        if (err) {
            console.error('Error fetching donors by blood type:', err.message);
            return res.status(500).json({ error: 'Failed to fetch donors' });
        }
        res.json(rows);
    });
});

// Get blood camps
app.get('/api/camps', (req, res) => {
    const query = 'SELECT * FROM blood_camps WHERE date >= date("now") ORDER BY date ASC';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching blood camps:', err.message);
            return res.status(500).json({ error: 'Failed to fetch blood camps' });
        }
        res.json(rows);
    });
});

// Create blood request (for public use)
app.post('/api/requests', (req, res) => {
    const { patient_name, blood_type, units_needed, hospital, urgency, contact_phone } = req.body;

    if (!patient_name || !blood_type || !units_needed || !hospital || !urgency || !contact_phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const validUrgency = ['low', 'medium', 'high', 'emergency'];
    if (!validUrgency.includes(urgency)) {
        return res.status(400).json({ error: 'Invalid urgency level' });
    }

    // For public requests, we'll use a default hospital_id of 1 (City General Hospital)
    const query = `
        INSERT INTO blood_requests (hospital_id, patient_name, blood_type, units_needed, urgency, reason)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [1, patient_name, blood_type, units_needed, urgency, `Contact: ${contact_phone}, Hospital: ${hospital}`], function (err) {
        if (err) {
            console.error('Error creating blood request:', err.message);
            return res.status(500).json({ error: 'Failed to create blood request' });
        }

        res.json({
            success: true,
            message: 'Blood request created successfully',
            request_id: this.lastID
        });
    });
});

// Get all blood requests
app.get('/api/requests', (req, res) => {
    const query = 'SELECT * FROM blood_requests ORDER BY created_at DESC';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching blood requests:', err.message);
            return res.status(500).json({ error: 'Failed to fetch blood requests' });
        }
        res.json(rows);
    });
});

// Hospital Registration
app.post('/api/hospital/register', (req, res) => {
    const { name, email, phone, type, address, city, password } = req.body;

    // Validation
    if (!name || !email || !phone || !type || !address || !city || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const query = `
        INSERT INTO hospitals (name, email, phone, type, address, city, password)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [name, email, phone, type, address, city, hashedPassword], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            console.error('Error registering hospital:', err.message);
            return res.status(500).json({ error: 'Failed to register hospital' });
        }

        res.json({
            success: true,
            message: 'Hospital registered successfully',
            hospital_id: this.lastID
        });
    });
});

// Hospital Login
app.post('/api/hospital/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = 'SELECT * FROM hospitals WHERE email = ?';
    db.get(query, [email], (err, hospital) => {
        if (err) {
            console.error('Error finding hospital:', err.message);
            return res.status(500).json({ error: 'Failed to find hospital' });
        }

        if (!hospital) {
            return res.status(404).json({ error: 'Hospital not found' });
        }

        // Check password
        if (!bcrypt.compareSync(password, hospital.password)) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.json({
            success: true,
            hospital: {
                id: hospital.id,
                name: hospital.name,
                email: hospital.email,
                type: hospital.type,
                city: hospital.city
            }
        });
    });
});

// Create blood camp
app.post('/api/camps', (req, res) => {
    const { hospital_id, name, date, time, duration, location, description } = req.body;

    if (!hospital_id || !name || !date || !time || !duration || !location) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        INSERT INTO blood_camps (hospital_id, name, location, date, time, duration, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [hospital_id, name, location, date, time, duration, description], function (err) {
        if (err) {
            console.error('Error creating blood camp:', err.message);
            return res.status(500).json({ error: 'Failed to create blood camp' });
        }

        res.json({
            success: true,
            message: 'Blood camp created successfully',
            camp_id: this.lastID
        });
    });
});

// Get camps by hospital
app.get('/api/camps/hospital/:hospital_id', (req, res) => {
    const { hospital_id } = req.params;
    const query = 'SELECT * FROM blood_camps WHERE hospital_id = ? ORDER BY date DESC';

    db.all(query, [hospital_id], (err, rows) => {
        if (err) {
            console.error('Error fetching hospital camps:', err.message);
            return res.status(500).json({ error: 'Failed to fetch camps' });
        }
        res.json(rows);
    });
});

// Get requests by hospital
app.get('/api/requests/hospital/:hospital_id', (req, res) => {
    const { hospital_id } = req.params;
    const query = 'SELECT * FROM blood_requests WHERE hospital_id = ? ORDER BY created_at DESC';

    db.all(query, [hospital_id], (err, rows) => {
        if (err) {
            console.error('Error fetching hospital requests:', err.message);
            return res.status(500).json({ error: 'Failed to fetch requests' });
        }
        res.json(rows);
    });
});

// Create blood provision
app.post('/api/provisions', (req, res) => {
    const { hospital_id, recipient_name, blood_type, units_provided, provision_date, notes } = req.body;

    if (!hospital_id || !recipient_name || !blood_type || !units_provided || !provision_date) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        INSERT INTO blood_provisions (hospital_id, recipient_name, blood_type, units_provided, provision_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [hospital_id, recipient_name, blood_type, units_provided, provision_date, notes], function (err) {
        if (err) {
            console.error('Error recording blood provision:', err.message);
            return res.status(500).json({ error: 'Failed to record blood provision' });
        }

        res.json({
            success: true,
            message: 'Blood provision recorded successfully',
            provision_id: this.lastID
        });
    });
});

// Get provisions by hospital
app.get('/api/provisions/hospital/:hospital_id', (req, res) => {
    const { hospital_id } = req.params;
    const query = 'SELECT * FROM blood_provisions WHERE hospital_id = ? ORDER BY provision_date DESC';

    db.all(query, [hospital_id], (err, rows) => {
        if (err) {
            console.error('Error fetching hospital provisions:', err.message);
            return res.status(500).json({ error: 'Failed to fetch provisions' });
        }
        res.json(rows);
    });
});

// Serve uploaded camp photos statically
app.use('/uploads/camp-photos', express.static(path.join(__dirname, 'public', 'uploads', 'camp-photos')));

// Multer setup for camp photo uploads
const campPhotoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'public', 'uploads', 'camp-photos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const uploadCampPhoto = multer({ storage: campPhotoStorage });

// Upload camp photo
app.post('/api/camp-photos/upload', uploadCampPhoto.single('photo'), (req, res) => {
    const { caption } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
    }
    const filename = req.file.filename;
    db.run('INSERT INTO camp_photos (filename, caption) VALUES (?, ?)', [filename, caption || ''], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to save photo info' });
        }
        res.json({ success: true, filename, caption, id: this.lastID });
    });
});

// List camp photos
app.get('/api/camp-photos', (req, res) => {
    db.all('SELECT * FROM camp_photos ORDER BY uploaded_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch photos' });
        }
        res.json(rows);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Lifeline server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

exports.api = functions.https.onRequest(app); 