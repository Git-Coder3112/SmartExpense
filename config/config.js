import dotenv from 'dotenv';

// Load environment variables from .env file
const result = dotenv.config();

if (result.error) {
  console.error('Error loading .env file:', result.error);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || "YOUR_secret_key",
  mongoUri: process.env.MONGODB_URI ||
    process.env.MONGO_HOST ||
    'mongodb://' + (process.env.IP || 'localhost') + ':' +
    (process.env.MONGO_PORT || '27017') +
    '/mernproject'
}

console.log('MongoDB URI:', config.mongoUri);

export default config;
