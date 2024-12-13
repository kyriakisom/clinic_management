const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema({
    specialty: { type: String, required: true },
    slots: [{
        date: { type: String, required: true }, // Separate date field
        time: { type: String, required: true } // Separate time field, stored as a string
    }],
    id: { type: String, unique: true }, // Field for unique four-digit ID
    name: { type: String, required: true } // Combined name field
});

// Middleware to generate a unique four-digit ID before saving
doctorAvailabilitySchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('id')) {
        const generateUniqueId = () => {
            const id = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a four-digit number
            return id;
        };

        let unique = false;
        let newId;

        while (!unique) {
            newId = generateUniqueId();
            // Check if the ID already exists in the database
            const existingDoc = await mongoose.models.DoctorAvailability.findOne({ id: newId });
            if (!existingDoc) {
                unique = true;
            }
        }

        this.id = newId;
    }
    next();
});

const DoctorAvailability = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);

module.exports = DoctorAvailability;
