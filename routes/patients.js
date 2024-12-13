const express = require("express");
const User = require('../models/user');
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const Patient = require("../models/patient");
const Med_histories = require("../models/med_history");
const Appointment = require("../models/appointment");

const fs = require("fs");
const path = require("path");
const app = express();
const fileUpload = require('express-fileupload');
const xss = require('xss');
const iconv = require('iconv-lite');

router.use(fileUpload());
const messages = {
  en: {
    noFileUploaded: 'No file uploaded.',
    fileSaveError: 'Error saving the file.',
    fileProcessingError: 'Error processing the CSV file.',
    csvProcessed: `The CSV file was successfully processed.`,
    patientSaveError: 'Error saving new patients.',
    fileDeleteError: 'Error deleting the file.',
    ssnRequired: 'Social Security Number is required.',
    firstNameRequired: 'First name is required.',
    lastNameRequired: 'Last name is required.',
    invalidSSN: 'Invalid Social Security Number.',
    invalidFirstName: 'Invalid first name.',
    invalidLastName: 'Invalid last name.',
    patientExists: 'A patient with this Social Security Number already exists.',
    serverError: 'Internal Server Error',
    idRequired: 'ID is required and must be 5 digits.',
    patientNotFound: 'Patient not found.',
    patientDeleted: 'Patient deleted successfully.',
    serverError: 'Internal server error.',
  },
  el: {
    noFileUploaded: 'Δεν ανέβηκε κανένα αρχείο.',
    fileSaveError: 'Σφάλμα κατά την αποθήκευση του αρχείου.',
    fileProcessingError: 'Σφάλμα κατά την επεξεργασία του αρχείου CSV.',
    csvProcessed: `Το αρχείο CSV επεξεργάστηκε επιτυχώς.`,
    patientSaveError: 'Σφάλμα κατά την αποθήκευση νέων ασθενών.',
    fileDeleteError: 'Σφάλμα κατά την αφαίρεση του αρχείου.',
    ssnRequired: 'Ο αριθμός κοινωνικής ασφάλισης είναι υποχρεωτικός.',
    firstNameRequired: 'Το όνομα είναι υποχρεωτικό.',
    lastNameRequired: 'Το επώνυμο είναι υποχρεωτικό.',
    invalidSSN: 'Μη έγκυρος αριθμός κοινωνικής ασφάλισης.',
    invalidFirstName: 'Μη έγκυρο όνομα.',
    invalidLastName: 'Μη έγκυρο επώνυμο.',
    patientExists: 'Ένας ασθενής με αυτόν τον αριθμό κοινωνικής ασφάλισης υπάρχει ήδη.',
    serverError: 'Εσωτερικό σφάλμα διακομιστή',
    idRequired: 'Το ID είναι υποχρεωτικό και πρέπει να είναι 5 ψηφία.',
    patientNotFound: 'Ο ασθενής δεν βρέθηκε.',
    patientDeleted: 'Ο ασθενής διαγράφηκε με επιτυχία.',
    serverError: 'Εσωτερικό σφάλμα διακομιστή.',
  }
};
router.post('/upload-csv', async (req, res) => {
  try {
    const language = req.body.language || 'el';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    if (!req.files || !req.files.file) {
      const message = messages[selectedLanguage].noFileUploaded;
      return res.status(400).json({ error: message });
    }

    const file = req.files.file;
    const filePath = './uploads/' + xss(file.name);

    file.mv(filePath, async (err) => {
      if (err) {
        const message = messages[selectedLanguage].fileSaveError;
        return res.status(500).send(message);
      }

      try {
        const csvData = [];
        const existingSocialSecurityNumbers = new Set();

        const existingPatients = await Patient.find({}, 'socialSecurityNumber');
        existingPatients.forEach(patient => {
          existingSocialSecurityNumbers.add(patient.socialSecurityNumber);
        });

        fs.createReadStream(filePath)
          .pipe(iconv.decodeStream('utf8'))
          .pipe(csv({ separator: ';' }))
          .on('data', (data) => {
            console.log('Headers in data:', Object.keys(data));
            const cleanFirstName = xss(data['Όνομα'] || data['firstName'] || data['FirstName']);
            const cleanLastName = xss(data['Επίθετο'] || data['lastName'] || data['LastName']);
            const cleanSSN = xss(data['ΑΜΚΑ'] || data['socialSecurityNumber'] || data['SocialSecurityNumber']);
          
            console.log(`Parsed Data: ${cleanFirstName}, ${cleanLastName}, ${cleanSSN}`);
          
            if (cleanFirstName && cleanLastName && cleanSSN) {
              if (!existingSocialSecurityNumbers.has(cleanSSN)) {
                csvData.push({ firstName: cleanFirstName, lastName: cleanLastName, socialSecurityNumber: cleanSSN });
              }
            }
          })
          
          .on('end', async () => {
            if (csvData.length > 0) {
              try {
                for (const patientData of csvData) {
                  const newPatient = new Patient(patientData);
                  await newPatient.save();
                }
                const successMessage = messages[selectedLanguage].csvProcessed;
                res.status(200).send(successMessage);
              } catch (error) {
                const errorMessage = messages[selectedLanguage].patientSaveError;
                res.status(500).send(errorMessage);
              } finally {
                fs.unlink(filePath, (err) => {
                  if (err) {
                    const deleteErrorMessage = messages[selectedLanguage].fileDeleteError;
                    console.error(deleteErrorMessage, err);
                  }
                });
              }
            } else {
              res.status(200).send(messages[selectedLanguage].noNewPatients || 'No new patients to add.');
            }
          });
      } catch (error) {
        const errorMessage = messages[selectedLanguage].fileProcessingError;
        console.error(errorMessage, error);
        res.status(500).send(errorMessage);
      }
    });
  } catch (error) {
    const errorMessage = messages[selectedLanguage].fileSaveError;
    console.error(errorMessage, error);
    res.status(500).send(errorMessage);
  }
});


router.post("/", async (req, res) => {
  try {
    const { socialSecurityNumber, firstName, lastName, language = 'el' } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
    const errors = [];

    // Επικύρωση παρουσίας απαιτούμενων πεδίων
    if (!socialSecurityNumber) {
      errors.push(messages[selectedLanguage].ssnRequired);
    }
    if (!firstName) {
      errors.push(messages[selectedLanguage].firstNameRequired);
    }
    if (!lastName) {
      errors.push(messages[selectedLanguage].lastNameRequired);
    }

    // Επικύρωση μορφής και μήκους αριθμού κοινωνικής ασφάλισης
    if (
      socialSecurityNumber &&
      (socialSecurityNumber.length !== 11 || /[^0-9]/.test(socialSecurityNumber))
    ) {
      errors.push(messages[selectedLanguage].invalidSSN);
    }

    // Καθαρισμός και επικύρωση ονόματος και επωνύμου
    const cleanFirstName = xss(firstName);
    const cleanLastName = xss(lastName);

    if (cleanFirstName !== firstName || !/^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s]*$/.test(firstName)) {
      errors.push(messages[selectedLanguage].invalidFirstName);
    }
    if (cleanLastName !== lastName || !/^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s]*$/.test(lastName)) {
      errors.push(messages[selectedLanguage].invalidLastName);
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const existingPatient = await Patient.findOne({ socialSecurityNumber });
    if (existingPatient) {
      return res.status(400).json({ error: messages[selectedLanguage].patientExists });
    }

    const newPatient = new Patient({
      socialSecurityNumber: xss(socialSecurityNumber),
      firstName: cleanFirstName,
      lastName: cleanLastName,
    });

    await newPatient.save();
    return res.status(201).json(newPatient);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});

router.delete("/", async (req, res) => {
  // Get the language from query parameters or default to 'el'
  const language = req.query.language || 'el';
  const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

  try {
      const id = xss(req.body.id);

      console.log("Sanitized request body:", { id });

      // Validate the id
      if (!id || !/^\d{5}$/.test(id)) {
          const message = selectedLanguage === 'el' ? 'Το ID είναι απαραίτητο και πρέπει να έχει 5 ψηφία' : 'ID is required and must be 5 digits long';
          return res.status(400).json({ error: message });
      }

      // Find and delete the patient by ID
      const deletedPatient = await Patient.findOneAndDelete({ id });
      
      console.log("Deletion result:", deletedPatient);

      if (!deletedPatient) {
          const message = selectedLanguage === 'el' ? 'Δεν βρέθηκε ασθενής με το δεδομένο ID' : 'Patient not found with the given ID';
          return res.status(404).json({ error: message });
      }

      const successMessage = selectedLanguage === 'el' ? 'Ο ασθενής διαγράφηκε με επιτυχία' : 'Patient successfully deleted';
      return res.status(200).json({ message: successMessage });
  } catch (error) {
      console.error("Unhandled error:", error);
      const errorMessage = selectedLanguage === 'el' ? 'Εσωτερικό σφάλμα διακομιστή' : 'Internal Server Error';
      return res.status(500).json({ error: errorMessage });
  }
});



router.patch("/", async (req, res) => {
  try {
    const { socialSecurityNumber, firstName, lastName, language = 'el' } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
    const errors = [];

    // Έλεγχος μορφής ΑΜΚΑ (11 ψηφία)
    const socialSecurityNumberRegex = /^\d{11}$/;
    if (!socialSecurityNumber || !socialSecurityNumberRegex.test(socialSecurityNumber)) {
      errors.push(messages[selectedLanguage].invalidSSN);
    }

    // Έλεγχος για λατινικούς και ελληνικούς χαρακτήρες
    const nameRegex = /^[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώ\s]+$/;
    const cleanFirstName = firstName ? xss(firstName) : "";
    const cleanLastName = lastName ? xss(lastName) : "";

    if (firstName && !nameRegex.test(cleanFirstName)) {
      errors.push(messages[selectedLanguage].invalidFirstName);
    }

    if (lastName && !nameRegex.test(cleanLastName)) {
      errors.push(messages[selectedLanguage].invalidLastName);
    }

    // Επιστροφή σφαλμάτων εάν υπάρχουν
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Βρίσκουμε τον ασθενή από το ΑΜΚΑ
    const patient = await Patient.findOne({ socialSecurityNumber });
    if (!patient) {
      return res.status(404).json({ errors: [messages[selectedLanguage].patientNotFound] });
    }

    // Ενημέρωση των στοιχείων αν είναι παρόντα
    if (firstName) patient.firstName = cleanFirstName;
    if (lastName) patient.lastName = cleanLastName;

    // Σώζουμε τον ενημερωμένο ασθενή
    const updatedPatient = await patient.save();

    return res.status(200).json(updatedPatient);
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});


// Διαδρομή για εμφάνιση όλων των πληροφοριών για ασθενείς
router.get("/display", async (req, res) => {
  try {
    const { language = 'el' } = req.query; // Λήψη γλώσσας από το query string
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    const patients = await Patient.find({});
    if (!patients || patients.length === 0) {
      return res.status(404).json({ error: messages[selectedLanguage].noPatientsFound });
    }

    return res.status(200).json(patients);
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});


// Διαδρομή για λήψη πληροφοριών ασθενούς βάσει ID
router.get('/patients/:id', async (req, res) => {
  try {
    const { language = 'el' } = req.query; // Λήψη γλώσσας από το query string
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    // Λήψη του ID του ασθενούς από τα URL parameters
    const patientId = req.params.id;
    
    // Εύρεση του ασθενούς βάσει ID
    const patient = await Patient.findOne({ id: patientId });
    
    // Αν δεν βρεθεί ο ασθενής, επιστροφή 404
    if (!patient) {
      return res.status(404).json({ message: messages[selectedLanguage].patientNotFound });
    }
    
    // Αποστολή των λεπτομερειών του ασθενούς ως JSON response
    res.status(200).json(patient);
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});



module.exports = router;
