const mongoose = require('mongoose');

// Define the schema for a doctor
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Doctor's name (mandatory)
  specialty: { type: String, required: true }, // Doctor's specialty (mandatory)
  id: { type: String, unique: true } // Add a field for the unique three-digit ID
});

// Middleware to generate a unique three-digit ID before saving
doctorSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('id')) {
    const generateUniqueId = () => {
      return Math.floor(100 + Math.random() * 900).toString(); // Generate a three-digit number
    };

    let unique = false;
    let newId;

    while (!unique) {
      newId = generateUniqueId();
      // Check if the ID already exists in the database
      const existingDoc = await mongoose.models.Doctor.findOne({ id: newId });
      if (!existingDoc) {
        unique = true;
      }
    }

    this.id = newId;
  }
  next();
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
