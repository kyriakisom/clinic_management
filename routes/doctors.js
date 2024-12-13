const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
const Doctor = require("../models/doctor");
const xss = require('xss'); // Import the XSS module

router.use(fileUpload());

const messages = {
    en: {
      noFileUploaded: 'No file uploaded.',
      fileSaveError: 'Error saving the file.',
      fileProcessingError: 'Error processing the CSV file.',
      csvProcessed: 'The CSV file was successfully processed.',
      doctorSaveError: 'Error saving new doctors.',
      fileDeleteError: 'Error deleting the file.',
      doctorExists: 'The doctor with this name and specialty already exists.',
      invalidData: 'Invalid data.',
      serverError: 'Internal server error.',
      doctorAdded: "Doctor added successfully.",
      doctorNameRequired: "Doctor's name is required.",
      specialtyRequired: "Specialty is required.",
      invalidName: "Name can only contain letters and spaces.",
      invalidSpecialty: "Specialty can only contain letters, spaces, and the characters - ' ,.",
       noDoctorsFound: "No doctor records found.",
       doctorNotFound: "Doctor record not found.",
       invalidId: "ID must be a three-digit number.",
       doctorNotFound: "Doctor not found.",
       doctorDeleted: "Doctor deleted successfully.",
       nameRequired: "Doctor's name is required for identification.",
       invalidName: "Name can only contain letters and spaces.",
       invalidSpecialty: "Specialty can only contain letters, spaces, dashes, apostrophes, and commas.",
       doctorNotFound: "Doctor not found.",
       updateSuccess: "Doctor's details updated successfully."
    },
    el: {
      noFileUploaded: 'Δεν ανέβηκε κανένα αρχείο.',
      fileSaveError: 'Σφάλμα κατά την αποθήκευση του αρχείου.',
      fileProcessingError: 'Σφάλμα κατά την επεξεργασία του αρχείου CSV.',
      csvProcessed: 'Το αρχείο CSV επεξεργάστηκε επιτυχώς.',
      doctorSaveError: 'Σφάλμα κατά την αποθήκευση νέων γιατρών.',
      fileDeleteError: 'Σφάλμα κατά την αφαίρεση του αρχείου.',
      doctorExists: 'Ο γιατρός με αυτό το όνομα και ειδικότητα υπάρχει ήδη.',
      invalidData: 'Μη έγκυρα δεδομένα.',
      serverError: 'Εσωτερικό σφάλμα διακομιστή.',
      doctorAdded: "Ο γιατρός προστέθηκε με επιτυχία.",
    doctorNameRequired: "Το όνομα του γιατρού είναι υποχρεωτικό.",
    specialtyRequired: "Η ειδικότητα είναι υποχρεωτική.",
    invalidName: "Το όνομα μπορεί να περιέχει μόνο γράμματα και κενά.",
    invalidSpecialty: "Η ειδικότητα μπορεί να περιέχει μόνο γράμματα, κενά, και τους χαρακτήρες - ' ,.",
     noDoctorsFound: "Δεν βρέθηκαν εγγραφές γιατρών.",
     doctorNotFound: "Η εγγραφή του γιατρού δεν βρέθηκε.",
     invalidId: "Το ID πρέπει να είναι ένας αριθμός τριών ψηφίων.",
     doctorNotFound: "Ο γιατρός δεν βρέθηκε.",
     doctorDeleted: "Ο γιατρός διαγράφηκε με επιτυχία.",
     nameRequired: "Το όνομα του γιατρού είναι απαραίτητο για την αναγνώριση.",
       invalidName: "Το όνομα μπορεί να περιέχει μόνο γράμματα και κενά.",
       invalidSpecialty: "Η ειδικότητα μπορεί να περιέχει μόνο γράμματα, κενά, παύλες, αποστρόφους και κόμματα.",
       doctorNotFound: "Ο γιατρός δεν βρέθηκε.",
       updateSuccess: "Τα στοιχεία του γιατρού ενημερώθηκαν με επιτυχία."
    }
  };
  
router.post('/upload-doctor-csv', async (req, res) => {
  try {
    const language = req.body.language || 'el'; // Default to Greek if no language is provided
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: messages[selectedLanguage].noFileUploaded });
    }

    const file = req.files.file;
    const filePath = './uploads/' + xss(file.name); // Sanitize file name

    file.mv(filePath, async (err) => {
      if (err) {
        return res.status(500).send(messages[selectedLanguage].fileSaveError);
      }

      try {
        const existingDoctors = new Set();
        const doctors = await Doctor.find({}, 'name specialty');
        doctors.forEach(doctor => {
          existingDoctors.add(`${doctor.name}-${doctor.specialty}`);
        });

        let newRecordsCount = 0;

        fs.createReadStream(filePath)
          .pipe(csv({ separator: ';', headers: ['doctorName', 'specialty'], skipEmptyLines: true }))
          .on('data', async (data) => {
            try {
              const doctorName = xss(data.doctorName);
              const specialty = xss(data.specialty);

              if (!doctorName || !specialty) {
                console.error(messages[selectedLanguage].invalidData, data);
                return;
              }

              const doctorKey = `${doctorName}-${specialty}`;

              if (existingDoctors.has(doctorKey)) {
                console.log(messages[selectedLanguage].doctorExists, { doctorName, specialty });
                return;
              }

              const newDoctor = new Doctor({ name: doctorName, specialty });
              await newDoctor.save();

              existingDoctors.add(doctorKey);
              newRecordsCount++;
            } catch (err) {
              console.error(messages[selectedLanguage].doctorSaveError, err);
            }
          })
          .on('end', () => {
            res.status(200).send(`${messages[selectedLanguage].csvProcessed} ${newRecordsCount} new records added.`);
          });
      } catch (error) {
        res.status(500).send(messages[selectedLanguage].fileProcessingError);
      } finally {
        fs.unlink(filePath, (err) => {
          if (err) console.error(messages[selectedLanguage].fileDeleteError, err);
        });
      }
    });
  } catch (error) {
    res.status(500).send(messages[selectedLanguage].serverError);
  }
});

  
// POST endpoint to add a new doctor
router.post("/", async (req, res) => {
    try {
      // Get the language from the query parameters, default to 'el' if not provided
      const language = req.query.language || 'el';
      const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
  
      const name = xss(req.body.name); // Sanitize inputs
      const specialty = xss(req.body.specialty); // Sanitize inputs
  
      const errors = [];
  
      if (!name) {
        errors.push(messages[selectedLanguage].doctorNameRequired);
      }
  
      if (!specialty) {
        errors.push(messages[selectedLanguage].specialtyRequired);
      }
  
      // Modified regex to accept Greek characters
      if (name && !/^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s]*$/.test(name)) {
        errors.push(messages[selectedLanguage].invalidName);
      }
  
      if (specialty && !/^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s\-',]*$/.test(specialty)) {
        errors.push(messages[selectedLanguage].invalidSpecialty);
      }
  
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }
  
      const newDoctor = new Doctor({
        name,
        specialty
      });
  
      await newDoctor.save();
  
      return res.status(201).json({
        message: messages[selectedLanguage].doctorAdded,
        doctor: newDoctor
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: messages[selectedLanguage].serverError });
    }
  });
  

// Route for displaying all information about doctors
router.get("/display", async (req, res) => {
    console.log("Handling request to fetch all doctor information");
  
    try {
      // Get the language from the query parameters, default to 'el' if not provided
      const language = req.query.language || 'el';
      const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
  
      const doctors = await Doctor.find({});
  
      console.log("Fetched doctor records:", doctors);
  
      if (!doctors || doctors.length === 0) {
        console.log(messages[selectedLanguage].noDoctorsFound);
        return res.status(404).json({ error: messages[selectedLanguage].noDoctorsFound });
      }
  
      return res.status(200).json(doctors);
    } catch (error) {
      console.error(messages[selectedLanguage].serverError, error);
      return res.status(500).json({ error: messages[selectedLanguage].serverError });
    }
  });

// Route for displaying a specific doctor based on the unique ID field
router.get("/display/:id", async (req, res) => {
    const doctorId = req.params.id;
    console.log(`Handling request to fetch doctor information for ID: ${doctorId}`);
  
    try {
      // Get the language from the query parameters, default to 'el' if not provided
      const language = req.query.language || 'el';
      const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
  
      // Find the doctor by the unique ID field
      const doctor = await Doctor.findOne({ id: doctorId });
  
      console.log("Fetched doctor record:", doctor);
  
      if (!doctor) {
        console.log(messages[selectedLanguage].doctorNotFound);
        return res.status(404).json({ error: messages[selectedLanguage].doctorNotFound });
      }
  
      return res.status(200).json(doctor);
    } catch (error) {
      console.error(messages[selectedLanguage].serverError, error);
      return res.status(500).json({ error: messages[selectedLanguage].serverError });
    }
  });
// DELETE route to remove a doctor by ID from the request body
router.delete('/', async (req, res) => {
    // Get the language from the query parameters, default to 'el' if not provided
    const language = req.query.language || 'el';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
  
    const id = xss(req.body.id); // Sanitize ID
  
    try {
      console.log("Request to delete doctor with ID:", id);
  
      // Validate the ID format
      if (!id || !/^\d{3}$/.test(id)) {
        console.log("Invalid ID format:", id);
        return res.status(400).json({ error: messages[selectedLanguage].invalidId });
      }
  
      // Attempt to delete the doctor with the specified ID
      const deletedDoctor = await Doctor.findOneAndDelete({ id });
  
      console.log("Deleted doctor:", deletedDoctor);
  
      if (!deletedDoctor) {
        console.log(messages[selectedLanguage].doctorNotFound);
        return res.status(404).json({ error: messages[selectedLanguage].doctorNotFound });
      }
  
      // Return success message
      return res.status(200).json({ message: messages[selectedLanguage].doctorDeleted });
    } catch (error) {
      console.error(messages[selectedLanguage].serverError, error);
      return res.status(500).json({ error: messages[selectedLanguage].serverError });
    }
  });

// PATCH route to update a doctor's information
router.patch("/", async (req, res) => {
  // Get the language from the query parameters, default to 'el' if not provided
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  try {
    const name = xss(req.body.name); // Sanitize inputs
    const specialty = xss(req.body.specialty); // Sanitize inputs

    const errors = [];

    // Validate name
    if (name && !/^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s]*$/.test(name)) {
      errors.push(messages[selectedLanguage].invalidName);
    }

    // Validate specialty
    if (specialty && !/^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s\-',]*$/.test(specialty)) {
      errors.push(messages[selectedLanguage].invalidSpecialty);
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (!name) {
      return res.status(400).json({ error: messages[selectedLanguage].nameRequired });
    }

    // Find the doctor by name
    const doctor = await Doctor.findOne({ name });

    if (!doctor) {
      return res.status(404).json({ error: messages[selectedLanguage].doctorNotFound });
    }

    // Update the specialty if provided
    if (specialty) doctor.specialty = specialty;

    const updatedDoctor = await doctor.save();

    return res.status(200).json({
      message: messages[selectedLanguage].updateSuccess,
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});

module.exports = router;
