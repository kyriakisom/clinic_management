const mongoose = require('mongoose');

// Define the schema for an appointment
const appointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true, unique: true }, // Appointment ID (mandatory)
  date: { type: String, required: true }, // Date of the appointment (mandatory)
  time: { type: String, required: true }, // Time of the appointment in HH:MM format (mandatory)
  patientId: { type: String, required: true }, // Patient ID (mandatory)
  firstName: { type: String, required: true }, // Patient's first name (mandatory)
  lastName: { type: String, required: true }, // Patient's last name (mandatory)
  reason: { type: String, required: true }, // Reason for the appointment (mandatory)
  doctorName: { type: String, required: true }, // Doctor's name (mandatory)
  socialSecurityNumber: { type: String, required: true }, // Social Security Number (mandatory)
  creationDate: { type: Date, default: Date.now }, // Creation date of the appointment (automatically generated)
  status: { 
    type: String, 
    enum: ['Δημιουργημένο', 'Τηρημένο', 'Ολοκληρωμένο', 'Ακυρωμένο','Created','Kept','Completed','Cancelled'], 
    default: 'Δημιουργημένο',
    required: true,
  }, // Status of the appointment (mandatory)
});

// Middleware to ensure unique four-digit appointmentId before saving
appointmentSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('appointmentId')) {
    let unique = false;
    let newAppointmentId;

    while (!unique) {
      newAppointmentId = generateFourDigitId(); // Generate a four-digit ID
      // Check if the ID already exists in the database
      const existingDoc = await mongoose.models.Appointment.findOne({ appointmentId: newAppointmentId });
      if (!existingDoc) {
        unique = true;
        this.appointmentId = newAppointmentId; // Assign the unique ID to the document
      }
    }
  }
  next();
});

// Function to generate a unique four-digit ID
function generateFourDigitId() {
  return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a four-digit number
}

// Create a model for the Appointment schema
const Appointment = mongoose.model('Appointment', appointmentSchema);

// Export the Appointment model
module.exports = Appointment;
