const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors');
const historiesRoutes = require('./routes/med_histories');
const availabilitiesRoutes = require('./routes/availabilities');
const patientsRoutes = require('./routes/patients');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'front-end')));
app.use(session({
  secret: process.env.SESSION_SECRET || '123456789012345678901234567890',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 3 * 60 * 60 * 1000 // 3 ώρες σε milliseconds
  }
}));


app.use(cors());
app.use(mongoSanitize());
app.use(helmet());

// Routes
app.use('/users', userRoutes);
app.use('/appointments',appointmentRoutes);
app.use('/doctors', doctorRoutes);
app.use('/med_histories', historiesRoutes);
app.use('/availabilities', availabilitiesRoutes);
app.use('/patients', patientsRoutes);


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
