const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Patient', 'Doctor', 'Secretary'],
    required: true
  },
  ssn: { type: String, unique: true },
  specialty: String
});

module.exports = mongoose.model('User', userSchema);
