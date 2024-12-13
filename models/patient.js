const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define the schema for a patient
const patientSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // Field for unique four-digit ID
  firstName: { type: String, required: true }, // First name of the patient (required)
  lastName: { type: String, required: true }, // Last name of the patient (required)
  socialSecurityNumber: { type: String, required: true }, // Social Security Number of the patient (required)
  dateOfRegistration: { type: Date, default: Date.now }, // Date of registration, auto-generated upon successful registration
  // Add other patient-related fields here if needed
});


// Middleware to generate a unique three-digit ID before saving
patientSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('id')) {
    const generateUniqueId = () => {
      return Math.floor(0 + Math.random() * 90000).toString(); // Generate a three-digit number
    };

    let unique = false;
    let newId;

    while (!unique) {
      newId = generateUniqueId();
      // Check if the ID already exists in the database
      const existingDoc = await mongoose.models.Patient.findOne({ id: newId });
      if (!existingDoc) {
        unique = true;
      }
    }

    this.id = newId;
  }
  next();
});



// Create a model for the Patient schema
const Patient = mongoose.model('Patient', patientSchema);

// Export the Patient model
module.exports = Patient;


