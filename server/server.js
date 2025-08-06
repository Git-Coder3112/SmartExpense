import config from './../config/config'
import app from './express'
import mongoose from 'mongoose'

// Connection URL
console.log('Connecting to MongoDB at:', config.mongoUri);
mongoose.Promise = global.Promise;

mongoose.connect(config.mongoUri, { 
  useNewUrlParser: true, 
  useCreateIndex: true, 
  useUnifiedTopology: true,
  useFindAndModify: false
}).then(() => {
  console.log('Successfully connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

app.listen(config.port, (err) => {
  if (err) {
    console.log(err)
  }
  console.info('Server started on port %s.', config.port)
})
