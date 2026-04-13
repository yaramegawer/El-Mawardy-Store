import mongoose from 'mongoose';
import TreasuryService from '../src/services/treasuryService.js';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/el-mawardy-store')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function rebuildTreasury() {
  try {
    console.log('Starting treasury rebuild...');
    
    // Rebuild treasury for all data
    const result = await TreasuryService.rebuildTreasury();
    
    console.log('Treasury rebuild completed:', result);
    process.exit(0);
  } catch (error) {
    console.error('Treasury rebuild failed:', error);
    process.exit(1);
  }
}

rebuildTreasury();
