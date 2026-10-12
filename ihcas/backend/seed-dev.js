require('dotenv').config();
const { seedPhase13 } = require('./scripts/seed-phase13');

async function seed() {
  try {
    await seedPhase13();
  } catch (err) {
    console.error('Seed execution failed:', err);
    process.exit(1);
  }
}

seed();
