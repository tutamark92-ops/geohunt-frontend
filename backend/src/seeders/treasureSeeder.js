require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Treasure = require('../models/Treasure');

/**
 * Seed data — the initial set of campus treasure locations.
 * Each treasure has GPS coordinates near the default campus center,
 * a clue for players to find its QR code, a point value, and a category.
 */
const treasures = [
    {
        name: 'The Grand Library',
        description: 'Home to over 2 million books and a quiet study atmosphere.',
        clue: 'I am where silence speaks volumes and knowledge is stored on wooden shelves. Find the oldest clock in the main hall.',
        latitude: 51.5074,
        longitude: -0.1278,
        points: 100,
        category: 'academic'
    },
    {
        name: 'Innovation Hub',
        description: 'The center for tech-startups and student projects.',
        clue: 'Where the future is coded and 3D printers hum all day. Look for the neon blue wall near the entrance.',
        latitude: 51.5085,
        longitude: -0.1285,
        points: 150,
        category: 'academic'
    },
    {
        name: 'Student Union Plaza',
        description: 'The heartbeat of social life and student activism.',
        clue: 'Hungry for debate or just a coffee? Meet where the banners fly highest near the large fountain.',
        latitude: 51.5065,
        longitude: -0.1265,
        points: 80,
        category: 'social'
    },
    {
        name: 'Heritage Arch',
        description: 'The oldest architectural structure on campus.',
        clue: 'A stone gateway that has seen generations pass. Beneath the ivy on the left pillar lies a hidden plaque.',
        latitude: 51.5070,
        longitude: -0.1290,
        points: 200,
        category: 'history'
    },
    {
        name: 'Olympic Athletics Park',
        description: 'State-of-the-art training facilities for university athletes.',
        clue: 'The starting line for champions. Find the sculpture of the sprinter near the track entrance.',
        latitude: 51.5095,
        longitude: -0.1250,
        points: 120,
        category: 'sports'
    }
];

/**
 * Run the seeder script.
 * Connects to MongoDB, wipes existing treasures (fresh start), and inserts the seed data.
 * Usage: node backend/src/seeders/treasureSeeder.js
 */
const seedTreasures = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        // Clear existing treasures
        await Treasure.deleteMany();
        console.log('Existing treasures cleared');

        // Insert new treasures
        const createdTreasures = await Treasure.insertMany(treasures);
        console.log(`${createdTreasures.length} treasures seeded successfully!`);

        console.log('\nSeeded Treasures:');
        createdTreasures.forEach(t => {
            console.log(`  - ${t.name} (${t.category}): ${t.points} pts`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error seeding treasures:', error.message);
        process.exit(1);
    }
};

seedTreasures();
