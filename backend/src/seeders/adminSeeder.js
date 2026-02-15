require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Create the default admin user for the GeoHunt dashboard.
 * Only runs once — if an admin already exists, it skips creation.
 * The password gets hashed automatically by the User model's pre-save hook.
 * Usage: node backend/src/seeders/adminSeeder.js
 */
const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        // Don't create a duplicate if one already exists
        const existingAdmin = await User.findOne({ role: 'admin' });

        if (existingAdmin) {
            console.log('\n⚠️  Admin user already exists:');
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Email: ${existingAdmin.email}`);
            process.exit(0);
        }

        // Create the admin with default credentials
        const admin = await User.create({
            username: 'GeoHuntAdmin',
            email: 'admin@geohunt.com',
            password: 'admin123',
            role: 'admin'
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: admin123`);
        console.log(`   Role: ${admin.role}`);
        console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();
