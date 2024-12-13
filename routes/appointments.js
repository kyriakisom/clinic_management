const express = require('express');
const router = express.Router();
const xss = require('xss');  // Εισαγωγή του xss για προστασία
const Patient = require('../models/patient'); 
const Med_histories = require('../models/med_history'); 
const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const User = require('../models/user');
const DoctorAvailability = require('../models/availability');
const { isAuthenticated } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');

const messages = {
  en: {
    ssnRequired: "Social security number is required.",
    firstNameRequired: "First name is required.",
    lastNameRequired: "Last name is required.",
    appointmentDateTimeRequired: "Appointment date and time are required.",
    reasonRequired: "Reason for the appointment is required.",
    doctorNameRequired: "Doctor's name is required.",
    invalidName: "Invalid name.",
    invalidLastName: "Invalid last name.",
    invalidDoctorName: "Invalid doctor's name.",
    invalidSSN: "Invalid social security number.",
    appointmentExists: "An appointment already exists for this date and time with the same doctor.",
    doctorUnavailable: "The doctor is not available at the selected time.",
    serverError: "Internal Server Error.",
    userNotFound: "User not found.",
    noAppointments: "No appointments found.",
    accessDenied: "Access denied.",
    appointmentDateRequired: "Appointment date is required.",
    appointmentTimeRequired: "Appointment time is required.",
    statusRequired: "Appointment status is required.",
    appointmentNotFound: "Appointment not found.",
    existingAppointment: "An appointment already exists for this date and time with the same doctor.",
    doctorUnavailable: "The doctor is not available at the selected time.",
    invalidStatusChange: 'You can only change the status from "Kept" to "Completed".',
    noAppointmentsToday: 'No appointments found for today.',
    appointmentIdRequired: 'Appointment ID is required',
    appointmentNotFound: 'Appointment not found',
    appointmentNotCancelable: 'Appointment can only be deleted if it is in "Cancelled" status',
    appointmentDeleted: 'Appointment has been successfully deleted',
    noAppointmentsFound: 'No appointments found for today.',
    invalidAppointmentId: 'Invalid appointmentId.',
  },
  el: {
    ssnRequired: "Ο αριθμός κοινωνικής ασφάλισης είναι υποχρεωτικός.",
    firstNameRequired: "Το όνομα είναι υποχρεωτικό.",
    lastNameRequired: "Το επώνυμο είναι υποχρεωτικό.",
    appointmentDateTimeRequired: "Η ημερομηνία και η ώρα του ραντεβού είναι υποχρεωτικές.",
    reasonRequired: "Ο λόγος για το ραντεβού είναι υποχρεωτικός.",
    doctorNameRequired: "Το όνομα του γιατρού είναι υποχρεωτικό.",
    invalidName: "Μη έγκυρο όνομα.",
    invalidLastName: "Μη έγκυρο επώνυμο.",
    invalidDoctorName: "Μη έγκυρο όνομα γιατρού.",
    invalidSSN: "Μη έγκυρος αριθμός κοινωνικής ασφάλισης.",
    appointmentExists: "Υπάρχει ήδη ραντεβού για αυτήν την ημερομηνία και ώρα με τον ίδιο γιατρό.",
    doctorUnavailable: "Ο γιατρός δεν είναι διαθέσιμος την επιλεγμένη ώρα.",
    serverError: "Εσωτερικό Σφάλμα Διακομιστή.",
    userNotFound: "Ο χρήστης δεν βρέθηκε.",
    noAppointments: "Δεν βρέθηκαν ραντεβού.",
    accessDenied: "Η πρόσβαση απορρίφθηκε.",
    appointmentDateRequired: "Η ημερομηνία του ραντεβού είναι υποχρεωτική.",
    appointmentTimeRequired: "Η ώρα του ραντεβού είναι υποχρεωτική.",
    statusRequired: "Η κατάσταση του ραντεβού είναι υποχρεωτική.",
    appointmentNotFound: "Το ραντεβού δεν βρέθηκε.",
    existingAppointment: "Υπάρχει ήδη ραντεβού για αυτή την ημερομηνία και ώρα με τον ίδιο γιατρό.",
    doctorUnavailable: "Ο γιατρός δεν είναι διαθέσιμος την επιλεγμένη ώρα.",
    invalidStatusChange: 'Μπορείτε να αλλάξετε την κατάσταση από "Τηρημένο" μόνο σε "Ολοκληρωμένο".',
    noAppointmentsToday: 'Δεν βρέθηκαν ραντεβού για σήμερα.',
    appointmentIdRequired: 'Ο αριθμός ραντεβού είναι απαραίτητος',
    appointmentNotFound: 'Το ραντεβού δεν βρέθηκε',
    appointmentNotCancelable: 'Το ραντεβού μπορεί να διαγραφεί μόνο εάν είναι σε κατάσταση "Ακυρωμένο"',
    appointmentDeleted: 'Το ραντεβού διαγράφηκε με επιτυχία',
    noAppointmentsFound: 'Δεν βρέθηκαν ραντεβού για σήμερα.',
    invalidAppointmentId: 'Μη έγκυρο appointmentId.',
  }
};

// POST route to create an appointment
router.post('/', async (req, res) => {
  // Get the language from the query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  try {
    // Sanitize inputs
    const socialSecurityNumber = xss(req.body.socialSecurityNumber);
    const firstName = xss(req.body.firstName);
    const lastName = xss(req.body.lastName);
    const appointmentDate = xss(req.body.appointmentDate); // Date as string
    const appointmentTime = xss(req.body.appointmentTime);
    const reason = xss(req.body.reason);
    const doctorName = xss(req.body.doctorName);

    console.table(req.body);

    const errors = [];

    // Validation checks
    if (!socialSecurityNumber) errors.push(messages[selectedLanguage].ssnRequired);
    if (!firstName) errors.push(messages[selectedLanguage].firstNameRequired);
    if (!lastName) errors.push(messages[selectedLanguage].lastNameRequired);
    if (!appointmentDate || !appointmentTime) errors.push(messages[selectedLanguage].appointmentDateTimeRequired);
    if (!reason) errors.push(messages[selectedLanguage].reasonRequired);
    if (!doctorName) errors.push(messages[selectedLanguage].doctorNameRequired);

    // Regex for validation
    const nameRegex = /^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ]+$/;
    const doctorNameRegex = /^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s]+$/;

    if (firstName && !nameRegex.test(firstName)) {
      errors.push(messages[selectedLanguage].invalidName);
    }

    if (lastName && !nameRegex.test(lastName)) {
      errors.push(messages[selectedLanguage].invalidLastName);
    }

    if (doctorName && !doctorNameRegex.test(doctorName)) {
      errors.push(messages[selectedLanguage].invalidDoctorName);
    }

    if (socialSecurityNumber && !/^\d{11}$/.test(socialSecurityNumber)) {
      errors.push(messages[selectedLanguage].invalidSSN);
    }

    if (errors.length > 0) return res.status(400).json({ errors });

    // Find or create patient
    let patient = await Patient.findOne({ socialSecurityNumber });
    if (!patient) {
      patient = new Patient({
        socialSecurityNumber,
        firstName,
        lastName
      });
      await patient.save();
    } else {
      if (patient.firstName !== firstName || patient.lastName !== lastName) {
        patient.firstName = firstName;
        patient.lastName = lastName;
        await patient.save();
      }
    }

    // Check for existing appointment
    const existingAppointment = await Appointment.findOne({
      doctorName,
      date: appointmentDate, // Use string date
      time: appointmentTime
    });

    if (existingAppointment) {
      return res.status(400).json({ error: messages[selectedLanguage].appointmentExists });
    }

    // Check doctor availability
    const doctorAvailability = await DoctorAvailability.findOne({
      name: doctorName,
      'slots.date': appointmentDate, // Use string date
      'slots.time': appointmentTime
    });

    if (!doctorAvailability) {
      return res.status(400).json({ error: messages[selectedLanguage].doctorUnavailable });
    }

    // Create new appointment
    const newAppointment = new Appointment({
      appointmentId: uuidv4(),
      patientId: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      date: appointmentDate, // Save as string
      time: appointmentTime,
      reason,
      doctorName,
      socialSecurityNumber,
      status: 'Δημιουργημένο'
    });

    await newAppointment.save();

    return res.status(201).json(newAppointment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});



// Route to get user appointment history based on socialSecurityNumber
router.get('/app', isAuthenticated, async (req, res) => {
  // Get the language from query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  try {
    // Sanitize the user ID from the session
    const userId = xss(req.session.userId);

    // Find the user by the session's userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: messages[selectedLanguage].userNotFound });
    }

    // If the user is a patient, retrieve their appointment history based on socialSecurityNumber
    if (user.role === 'Patient') {
      // Find the appointments associated with this patient's socialSecurityNumber
      const appointments = await Appointment.find({ socialSecurityNumber: user.ssn });

      // If no appointments are found
      if (!appointments.length) {
        return res.status(404).json({ message: messages[selectedLanguage].noAppointments });
      }

      // Include appointment details in the response
      const appointmentInfo = appointments.map(appointment => ({
        appointmentId: appointment.appointmentId,
        date: appointment.date,
        time: appointment.time,
        patientId: appointment.patientId,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        reason: appointment.reason,
        doctorName: appointment.doctorName,
        socialSecurityNumber: appointment.socialSecurityNumber,
        status: appointment.status,
        creationDate: appointment.creationDate,
      }));

      return res.status(200).json(appointmentInfo);
    } else {
      return res.status(403).json({ message: messages[selectedLanguage].accessDenied });
    }
  } catch (error) {
    console.error('Error retrieving appointments:', error);
    return res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});

// Function to check doctor's availability
async function checkDoctorAvailability(doctorName, date, time) {
  const datetime = new Date(`${date}T${time}`);
  const existingAppointment = await Appointment.findOne({ doctorName, date: datetime, time });
  return !existingAppointment;
}

// Route to update appointment information
router.put('/:appointmentId', async (req, res) => {
  // Get the language from query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  try {
    // Sanitize inputs
    const appointmentId = xss(req.params.appointmentId);
    const appointmentDate = xss(req.body.appointmentDate); // date as string
    const appointmentTime = xss(req.body.appointmentTime);
    const status = xss(req.body.status);
    const newStatus = xss(req.body.status);

    const errors = [];

    // Validation checks
    if (!appointmentDate) errors.push(messages[selectedLanguage].appointmentDateRequired);
    if (!appointmentTime) errors.push(messages[selectedLanguage].appointmentTimeRequired);
    if (!status) errors.push(messages[selectedLanguage].statusRequired);

    // Return error messages if there are any validation errors
    if (errors.length > 0) return res.status(400).json({ errors });

    // Check if the appointment exists
    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
      return res.status(404).json({ error: messages[selectedLanguage].appointmentNotFound });
    }

    // Check if the date or time has changed
    const isDateChanged = appointment.date !== appointmentDate;
    const isTimeChanged = appointment.time !== appointmentTime;

    // Check availability only if the date or time has changed
    if (isDateChanged || isTimeChanged) {
      // Check if an appointment already exists for the same doctor, date, and time
      const existingAppointment = await Appointment.findOne({
        doctorName: appointment.doctorName,
        date: appointmentDate, // Use string date
        time: appointmentTime
      });

      if (existingAppointment && existingAppointment.appointmentId !== appointmentId) {
        return res.status(400).json({ error: messages[selectedLanguage].existingAppointment });
      }

      // Check doctor's availability
      const doctorAvailability = await DoctorAvailability.findOne({
        name: appointment.doctorName,
        'slots.date': appointmentDate, // Use string date
        'slots.time': appointmentTime
      });

      if (!doctorAvailability) {
        return res.status(400).json({ error: messages[selectedLanguage].doctorUnavailable });
      }
    }

    // Check current status and allowed status update
    if (appointment.status === 'Τηρημένο' && newStatus !== 'Ολοκληρωμένο') {
      return res.status(400).json({ error: messages[selectedLanguage].invalidStatusChange });
    }

    // Update appointment details
    appointment.date = appointmentDate; // Save as string
    appointment.time = appointmentTime;
    appointment.status = status;

    await appointment.save();

    return res.status(200).json(appointment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});


router.get('/doc/today', isAuthenticated, async (req, res) => {
  try {
    // Καθαρισμός των δεδομένων εισόδου (session userId)
    const userId = xss(req.session.userId);

    // Βρίσκουμε τον χρήστη με βάση το userId από το session
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: xss('User not found.') });
    }

    // Έλεγχος αν ο χρήστης είναι γιατρός
    if (user.role === 'Doctor') {
      // Δημιουργία της σημερινής ημερομηνίας σε μορφή string
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'

      // Δημιουργία της αυριανής ημερομηνίας σε μορφή string
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0]; // 'YYYY-MM-DD'

      // Καθαρισμός του ονόματος και επωνύμου του γιατρού
      const doctorName = xss(`${user.firstname} ${user.lastname}`);

      // Βρίσκουμε τα ραντεβού του γιατρού που είναι προγραμματισμένα για σήμερα
      const todayAppointments = await Appointment.find({
        doctorName: doctorName, // Βρίσκουμε ραντεβού για αυτόν τον γιατρό
        date: {
          $gte: todayString, // Χρησιμοποιούμε το string ημερομηνίας
          $lt: tomorrowString, // Χρησιμοποιούμε το string ημερομηνίας
        },
      });

      // Αν δεν βρεθούν ραντεβού
      if (todayAppointments.length === 0) {
        return res.status(200).json({ message: xss('No appointments found for today.') });
      }

      // Καθαρισμός των λεπτομερειών του ραντεβού στην απάντηση
      const appointmentInfo = todayAppointments.map((appointment) => ({
        appointmentId: xss(appointment.appointmentId),
        date: xss(appointment.date),
        time: xss(appointment.time),
        patientId: xss(appointment.patientId),
        firstName: xss(appointment.firstName),
        lastName: xss(appointment.lastName),
        reason: xss(appointment.reason),
        doctorName: xss(appointment.doctorName),
        socialSecurityNumber: xss(appointment.socialSecurityNumber),
        status: xss(appointment.status),
        creationDate: xss(appointment.creationDate),
      }));

      return res.status(200).json(appointmentInfo);
    } else {
      return res.status(403).json({ message: xss('Access denied.') });
    }
  } catch (error) {
    console.error(xss(`Error retrieving today's appointments: ${error}`));
    res.status(500).json({ message: xss('Internal server error.') });
  }
});


router.delete('/cancel', async (req, res) => {
  // Get the language from query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  const appointmentId = xss(req.body.appointmentId); // Clean the appointmentId

  if (!appointmentId) {
    return res.status(400).json({ message: messages[selectedLanguage].appointmentIdRequired });
  }

  try {
    // Find the appointment by appointmentId
    const appointment = await Appointment.findOne({ appointmentId });

    // Check if the appointment exists and if its status is "Cancelled"
    if (!appointment) {
      return res.status(404).json({ message: messages[selectedLanguage].appointmentNotFound });
    }
    if (appointment.status !== "Ακυρωμένο" && appointment.status !== "Cancelled") {
      return res.status(400).json({ message: messages[selectedLanguage].appointmentNotCancelable });
    }

    // Delete the appointment
    await Appointment.deleteOne({ appointmentId });

    return res.json({ message: messages[selectedLanguage].appointmentDeleted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});



router.get('/', async (req, res) => {
  // Get the language from query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  try {
    const appointments = await Appointment.find(); // Fetch all appointments

    if (appointments.length === 0) {
      return res.status(404).json({ message: messages[selectedLanguage].noAppointmentsFound });
    }

    return res.status(200).json(appointments); // Return appointments with success code
  } catch (error) {
    console.error('Error fetching appointments:', error); // Log error to server console
    return res.status(500).json({ message: messages[selectedLanguage].serverError }); // Return error message for internal server error
  }
});



// Route για τα σημερινά ραντεβού
router.get('/appointments/today', isAuthenticated, async (req, res) => {
  // Get the language from query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  try {
    // Βρίσκουμε τον χρήστη με βάση το userId από το session
    const userId = req.session.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: messages[selectedLanguage].userNotFound });
    }

    // Αν ο χρήστης είναι ασθενής, βρίσκουμε τα σημερινά ραντεβού του
    if (user.role === 'Patient') {
      // Δημιουργία της σημερινής ημερομηνίας σε μορφή string
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'

      // Δημιουργία της αυριανής ημερομηνίας σε μορφή string
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0]; // 'YYYY-MM-DD'

      // Βρίσκουμε τα ραντεβού του ασθενούς που είναι προγραμματισμένα για σήμερα
      const todayAppointments = await Appointment.find({
        socialSecurityNumber: user.ssn, // Βασιζόμαστε στον ΑΜΚΑ για τα ραντεβού του χρήστη
        date: {
          $gte: todayString,
          $lt: tomorrowString
        }
      });

      if (todayAppointments.length === 0) {
        return res.status(200).json({ message: messages[selectedLanguage].noAppointmentsFound });
      }

      // Περιλαμβάνουμε τις λεπτομέρειες του ραντεβού στην απάντηση
      const appointmentInfo = todayAppointments.map(appointment => ({
        appointmentId: appointment.appointmentId,
        date: appointment.date,
        time: appointment.time,
        patientId: appointment.patientId,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        reason: appointment.reason,
        doctorName: appointment.doctorName,
        socialSecurityNumber: appointment.socialSecurityNumber,
        status: appointment.status,
        creationDate: appointment.creationDate,
      }));

      return res.status(200).json(appointmentInfo);
    } else {
      return res.status(403).json({ message: messages[selectedLanguage].accessDenied });
    }
  } catch (error) {
    console.error('Error retrieving today\'s appointments:', error);
    return res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});



// Route to display details of a specific appointment
router.get('/:appointmentId', async (req, res) => {
  // Get the language from query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  const appointmentId = xss(req.params.appointmentId); // Καθαρισμός του appointmentId

  try {
    // Log the appointmentId to ensure it's being received correctly
    console.log('Received appointmentId:', appointmentId);

    // Ensure appointmentId is a string and not empty
    if (typeof appointmentId !== 'string' || appointmentId.trim() === '') {
      return res.status(400).json({ message: messages[selectedLanguage].invalidAppointmentId });
    }

    // Find the appointment by appointmentId
    const appointment = await Appointment.findOne({ appointmentId });

    // Check if the appointment exists
    if (!appointment) {
      return res.status(404).json({ message: messages[selectedLanguage].appointmentNotFound });
    }

    // Respond with the appointment details
    return res.status(200).json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});

module.exports = router;
