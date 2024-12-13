const mongoose = require('mongoose');

// Define the schema for a medical history
const medicalHistorySchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  id: { type: String, unique: true }, // Field for unique four-digit ID
  detectedHealthProblems: { type: String, required: true },
  treatment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  socialSecurityNumber: { type: String, required: true }
});

medicalHistorySchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('id')) {
      const generateUniqueId = () => {
          const id = Math.floor(1000 + Math.random() * 9000).toString(); // Παράγει έναν τετραψήφιο αριθμό
          return id;
      };

      let unique = false;
      let newId;

      while (!unique) {
          newId = generateUniqueId();
          // Ελέγχει αν το ID ήδη υπάρχει στη βάση δεδομένων
          const existingDoc = await mongoose.models.MedicalHistory.findOne({ id: newId });
          if (!existingDoc) {
              unique = true;
          }
      }

      this.id = newId; // Θέτει το νέο μοναδικό ID
  }
  next();
});


// Create a model for the medical history schema
const MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema);

// Export the MedicalHistory model
module.exports = MedicalHistory;