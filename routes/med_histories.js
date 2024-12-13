// Import required modules and models
const csv = require('csv-parser');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const pdfkit = require('pdfkit');
const MedicalHistory = require('../models/med_history');
const User = require('../models/user');
const Patient = require('../models/patient');
const { isAuthenticated } = require('../middleware/auth'); // Ensure this middleware is properly implemented
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const path = require('path');
const xss = require('xss'); // Import XSS library

router.use(fileUpload());

const messages = {
  
    en: {
      ssnRequired: "Social Security Number is required.",
      healthProblemsRequired: "Detected health problems are required.",
      treatmentRequired: "Treatment is required.",
      patientNotFound: "Patient not found. Please check your social security number!",
      serverError: "Internal Server Error",
      noHistoriesFound: "No medical histories found for the given Social Security Number.",
    noFileUploaded: "No file uploaded.",
    errorSavingFile: "Error saving the file.",
    invalidData: "Invalid data: ",
    duplicateRecord: "Duplicate record: ",
    patientNotFound: "Patient not found for SSN: ",
    errorProcessingRecord: "Error processing record: ",
    csvProcessedSuccessfully: "CSV file processed successfully.",
    uploadSuccessful: "Patient history uploaded successfully.",
    errorProcessingFile: "Error processing file.",
    errorUploading: "Error uploading patient history.",
    noHistoriesFound: "No medical history found for this social security number.",
    title: "Patient Medical History",
    downloadDate: "Downloaded on",
    record: "Record",
    ssn: "Social Security Number",
    healthProblems: "Detected Health Problems",
    treatment: "Treatment",
    patientName: "Patient Name",
    dateCreated: "Date Created",
    footerName: "General Medical Center 'Medilife'",
    footerContact: "Tel.: 22730-14859 | Email: aegean@gmail.com | Fax: 254 478 2458",
    serverError: "Internal Server Error",
    ssnRequired: "Social Security Number is required.",
    atLeastOneFieldRequired: "At least one field is required to update.",
    recordNotFound: "No medical history record found for the provided Social Security Number.",
    idRequired: "ID is required",
    recordNotFound: "No history record found with the provided ID",
    recordDeleted: "Medical history record has been deleted",
    userNotFound: "User not found.",
    noMedicalHistoryFound: "No medical history found.",
    accessDenied: "Access denied.",
    recordNotFound: "Medical history not found"
    },
    el: {
      ssnRequired: "Ο αριθμός κοινωνικής ασφάλισης είναι υποχρεωτικός.",
      healthProblemsRequired: "Τα ανιχνευθέντα προβλήματα υγείας είναι υποχρεωτικά.",
      treatmentRequired: "Η θεραπεία είναι υποχρεωτική.",
      patientNotFound: "Ο ασθενής δεν βρέθηκε. Παρακαλώ ελέγξτε τον αριθμό κοινωνικής ασφάλισης!",
      serverError: "Εσωτερικό σφάλμα διακομιστή",
      noHistoriesFound: "Δεν βρέθηκαν ιατρικά ιστορικά για το δοθέν ΑΜΚΑ.",
      noFileUploaded: "Δεν έχει ανέβει κανένα αρχείο.",
      errorSavingFile: "Σφάλμα κατά την αποθήκευση του αρχείου.",
      invalidData: "Μη έγκυρα δεδομένα: ",
      duplicateRecord: "Διπλότυπο αρχείο: ",
      patientNotFound: "Ο ασθενής δεν βρέθηκε για το ΑΜΚΑ: ",
      errorProcessingRecord: "Σφάλμα κατά την επεξεργασία του αρχείου: ",
      csvProcessedSuccessfully: "Το αρχείο CSV επεξεργάστηκε με επιτυχία.",
      uploadSuccessful: "Η ιστορία του ασθενούς ανέβηκε με επιτυχία.",
      errorProcessingFile: "Σφάλμα κατά την επεξεργασία του αρχείου.",
      errorUploading: "Σφάλμα κατά την ανάρτηση της ιστορίας του ασθενούς.",
      noHistoriesFound: "Δεν βρέθηκαν ιατρικά ιστορικά για αυτόν τον αριθμό κοινωνικής ασφάλισης.",
      title: "Ιατρικό Ιστορικό Ασθενούς",
      downloadDate: "Λήφθηκε στις",
      record: "Εγγραφή",
      ssn: "Αριθμός Κοινωνικής Ασφάλισης",
      healthProblems: "Ανιχνευμένα Υγειονομικά Προβλήματα",
      treatment: "Θεραπεία",
      patientName: "Όνομα Ασθενούς",
      dateCreated: "Ημερομηνία Δημιουργίας",
      footerName: "Γενικό Ιατρικό Κέντρο 'Medilife'",
      footerContact: "Τηλ.: 22730-14859 | Email: aegean@gmail.com | Φαξ: 254 478 2458",
      serverError: "Εσωτερικό Σφάλμα Διακομιστή",
      ssnRequired: "Απαιτείται Αριθμός Κοινωνικής Ασφάλισης.",
      atLeastOneFieldRequired: "Απαιτείται τουλάχιστον ένα πεδίο για να ενημερωθεί.",
      recordNotFound: "Δεν βρέθηκε ιατρικό ιστορικό για τον παρεχόμενο Αριθμό Κοινωνικής Ασφάλισης.",
      idRequired: "Το ID είναι απαραίτητο",
      recordNotFound: "Δεν βρέθηκε εγγραφή ιστορικού με το παρεχόμενο ID",
      recordDeleted: "Η εγγραφή ιατρικού ιστορικού έχει διαγραφεί",
      userNotFound: "Ο χρήστης δεν βρέθηκε.",
      noMedicalHistoryFound: "Δεν βρέθηκε ιατρικό ιστορικό.",
      accessDenied: "Πρόσβαση απαγορευμένη.",
      recordNotFound: "Δεν βρέθηκε εγγραφή ιστορικού"
    }
  
  
}

// Endpoint για τη δημιουργία νέου ιατρικού ιστορικού
router.post('/', async (req, res) => {
  try {
    const { socialSecurityNumber, detectedHealthProblems, treatment, language = 'el' } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    // Καθαρισμός εισόδων
    const cleanedSSN = xss(socialSecurityNumber);
    const cleanedDetectedHealthProblems = xss(detectedHealthProblems);
    const cleanedTreatment = xss(treatment);

    // Επικύρωση παρουσίας απαιτούμενων πεδίων
    if (!cleanedSSN) {
      return res.status(400).json({ error: messages[selectedLanguage].ssnRequired });
    }
    if (!cleanedDetectedHealthProblems) {
      return res.status(400).json({ error: messages[selectedLanguage].healthProblemsRequired });
    }
    if (!cleanedTreatment) {
      return res.status(400).json({ error: messages[selectedLanguage].treatmentRequired });
    }

    // Έλεγχος αν υπάρχει ο ασθενής με βάση το ΑΜΚΑ
    const patient = await Patient.findOne({ socialSecurityNumber: cleanedSSN });
    if (!patient) {
      return res.status(404).json({ error: messages[selectedLanguage].patientNotFound });
    }

    // Δημιουργία νέου ιατρικού ιστορικού
    const newMedicalHistory = new MedicalHistory({
      patient: patient._id, // Χρήση του _id του ασθενούς
      socialSecurityNumber: cleanedSSN,
      detectedHealthProblems: cleanedDetectedHealthProblems,
      treatment: cleanedTreatment
    });

    // Αποθήκευση του ιατρικού ιστορικού στη βάση δεδομένων
    await newMedicalHistory.save();

    // Επιστροφή των λεπτομερειών του νέου ιατρικού ιστορικού
    return res.status(201).json(newMedicalHistory);
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});

// Διαδρομή για εμφάνιση όλων των ιατρικών ιστορικών
router.get('/', async (req, res) => {
  try {
    // Εξαγωγή γλώσσας από τα query parameters
    const language = req.query.language || 'el';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    // Βρίσκουμε όλα τα ιατρικά ιστορικά και γεμίζουμε το πεδίο ασθενούς
    const histories = await MedicalHistory.find().populate('patient', 'name');

    // Χαρτογράφηση των ιστορικών και επιστροφή των απαιτούμενων πεδίων συμπεριλαμβανομένου του custom ID
    const historiesWithDates = histories.map(history => ({
      id: xss(history.id), // Καθαρισμός ID
      socialSecurityNumber: xss(history.socialSecurityNumber), // Καθαρισμός ΑΜΚΑ
      detectedHealthProblems: xss(history.detectedHealthProblems), // Καθαρισμός προβλημάτων υγείας
      treatment: xss(history.treatment), // Καθαρισμός θεραπείας
      patient: history.patient, // Υποθέτοντας ότι τα δεδομένα του ασθενούς είναι ήδη καθαρισμένα
      createdAt: history.createdAt.toISOString() // Διασφάλιση ότι η ημερομηνία είναι σε μορφή ISO 8601
    }));

    // Επιστροφή των ιστορικών
    res.json(historiesWithDates);
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});

// Διαδρομή για λήψη ιατρικών ιστορικών βάσει του ΑΜΚΑ
router.get('/patient', async (req, res) => {
  try {
    const { socialSecurityNumber, language = 'el' } = req.query;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    // Καθαρισμός ΑΜΚΑ
    const cleanedSSN = xss(socialSecurityNumber);

    // Επικύρωση παρουσίας του ΑΜΚΑ
    if (!cleanedSSN) {
      return res.status(400).json({ error: messages[selectedLanguage].ssnRequired });
    }

    // Βρίσκουμε τα ιατρικά ιστορικά με βάση το ΑΜΚΑ
    const histories = await MedicalHistory.find({ socialSecurityNumber: cleanedSSN }).populate('patient', 'name');

    // Χαρτογράφηση των ιστορικών και επιστροφή των απαιτούμενων πεδίων συμπεριλαμβανομένου του custom ID
    const historiesWithDates = histories.map(history => ({
      socialSecurityNumber: xss(history.socialSecurityNumber),
      detectedHealthProblems: xss(history.detectedHealthProblems),
      treatment: xss(history.treatment),
      patient: history.patient,
      createdAt: history.createdAt.toISOString() // Διασφάλιση ότι η ημερομηνία είναι σε μορφή ISO 8601
    }));

    if (historiesWithDates.length > 0) {
      res.json(historiesWithDates);
    } else {
      res.status(404).json({ error: messages[selectedLanguage].noHistoriesFound });
    }
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});

// Διαδρομή για λήψη ιατρικών ιστορικών βάσει του ΑΜΚΑ
router.get('/ssn', async (req, res) => {
  try {
    const { socialSecurityNumber, language = 'el' } = req.query;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    // Καθαρισμός ΑΜΚΑ
    const cleanedSSN = xss(socialSecurityNumber);

    // Επικύρωση παρουσίας του ΑΜΚΑ
    if (!cleanedSSN) {
      return res.status(400).json({ error: messages[selectedLanguage].ssnRequired });
    }

    // Βρίσκουμε τα ιατρικά ιστορικά με βάση το ΑΜΚΑ και γεμίζουμε το πεδίο ασθενή
    const histories = await MedicalHistory.find({ socialSecurityNumber: cleanedSSN }).populate('patient', 'name');

    if (!histories || histories.length === 0) {
      return res.status(404).json({ error: messages[selectedLanguage].noHistoriesFound });
    }

    // Χαρτογράφηση των ιστορικών και επιστροφή των απαιτούμενων πεδίων συμπεριλαμβανομένου του custom ID
    const historiesWithDates = histories.map(history => ({
      id: xss(history.id), // Καθαρισμός ID
      socialSecurityNumber: xss(history.socialSecurityNumber), // Καθαρισμός ΑΜΚΑ
      detectedHealthProblems: xss(history.detectedHealthProblems), // Καθαρισμός προβλημάτων υγείας
      treatment: xss(history.treatment), // Καθαρισμός θεραπείας
      patient: history.patient, // Υποθέτουμε ότι τα δεδομένα ασθενούς είναι ήδη καθαρισμένα
      createdAt: history.createdAt.toISOString() // Διασφάλιση ότι η ημερομηνία είναι σε μορφή ISO 8601
    }));

    res.json(historiesWithDates);
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});
// Route to search medical histories based on keywords and date range
router.get('/search', async (req, res) => {
  try {
    const keywords = xss(req.query.keywords);
    const startDate = xss(req.query.startDate);
    const endDate = xss(req.query.endDate);

    // Check if keywords are provided
    if (!keywords) {
      return res.status(400).send('Keywords are required');
    }

    // Parse the date range
    let dateFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        dateFilter['$gte'] = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        dateFilter['$lte'] = end;
      }
    }

    // Split keywords into an array and build a regex pattern for searching
    const keywordArray = keywords.split(' ').filter(keyword => keyword.trim() !== '');
    const searchPatterns = keywordArray.map(keyword => new RegExp(keyword, 'i'));

    // Build the query object
    const query = {
      $or: [
        { detectedHealthProblems: { $in: searchPatterns } },
        { treatment: { $in: searchPatterns } },
        { socialSecurityNumber: { $in: searchPatterns } }
      ]
    };

    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    // Find medical histories that match the query object
    const histories = await MedicalHistory.find(query).populate('patient', 'name');

    // Return only the fields we want in the response, including creation date and time
    const historiesWithDates = histories.map(history => ({
      socialSecurityNumber: xss(history.socialSecurityNumber),
      detectedHealthProblems: xss(history.detectedHealthProblems),
      treatment: xss(history.treatment),
      patient: history.patient,
      createdAt: history.createdAt.toISOString() // Ensure the date is in ISO 8601 format
    }));

    if (historiesWithDates.length > 0) {
      res.json(historiesWithDates);
    } else {
      res.status(404).send('No medical histories found for the given keywords and date range');
    }
  } catch (error) {
    console.error('Error searching medical histories:', error);
    res.status(500).send('Server error');
  }
});

router.post('/upload-patient-history-csv', async (req, res) => {
  try {
    const { language = 'el' } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: messages[selectedLanguage].noFileUploaded });
    }

    const file = req.files.file;
    const filePath = './uploads/' + file.name;

    file.mv(filePath, async (err) => {
      if (err) {
        console.error(messages[selectedLanguage].errorSavingFile, err);
        return res.status(500).json({ error: messages[selectedLanguage].errorSavingFile });
      }

      try {
        const processedRecords = new Set();

        fs.createReadStream(filePath)
          .pipe(csv({ separator: ';', headers: ['socialSecurityNumber', 'detectedHealthProblems', 'treatment'], skipEmptyLines: true }))
          .on('data', async (data) => {
            try {
              const socialSecurityNumber = xss(data.socialSecurityNumber);
              const detectedHealthProblems = xss(data.detectedHealthProblems);
              const treatment = xss(data.treatment);

              if (!socialSecurityNumber || !detectedHealthProblems || !treatment) {
                console.warn(messages[selectedLanguage].invalidData, JSON.stringify(data));
                return;
              }

              const recordKey = `${socialSecurityNumber}-${detectedHealthProblems}-${treatment}`;
              if (processedRecords.has(recordKey)) {
                console.warn(messages[selectedLanguage].duplicateRecord, recordKey);
                return;
              }
              processedRecords.add(recordKey);

              const patient = await Patient.findOne({ socialSecurityNumber });

              if (patient) {
                const newMedicalHistory = new MedicalHistory({
                  patient: patient._id,
                  socialSecurityNumber,
                  detectedHealthProblems,
                  treatment,
                });

                await newMedicalHistory.save();
              } else {
                console.warn(messages[selectedLanguage].patientNotFound, socialSecurityNumber);
              }
            } catch (error) {
              console.error(messages[selectedLanguage].errorProcessingRecord, error);
            }
          })
          .on('end', () => {
            console.log(messages[selectedLanguage].csvProcessedSuccessfully);
            fs.unlinkSync(filePath);
            res.status(200).json({ message: messages[selectedLanguage].uploadSuccessful });
          });
      } catch (error) {
        console.error(messages[selectedLanguage].errorProcessingFile, error);
        fs.unlinkSync(filePath);
        res.status(500).json({ error: messages[selectedLanguage].errorProcessingFile });
      }
    });
  } catch (error) {
    console.error(messages[selectedLanguage].errorUploading, error);
    res.status(500).json({ error: messages[selectedLanguage].errorUploading });
  }
});

router.post('/download-patient-history/pdf', async (req, res) => {
  try {
    const { socialSecurityNumber, language } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el'; // Υποστήριξη μόνο για 'en' και 'el'
    const cleanedSSN = xss(socialSecurityNumber);

    const histories = await MedicalHistory.find({ socialSecurityNumber: cleanedSSN }).populate('patient', 'name');

    if (!histories || histories.length === 0) {
      return res.status(404).json({
        message: selectedLanguage === 'el'
          ? 'Δεν βρέθηκε ιστορικό ασθενούς για αυτόν τον αριθμό κοινωνικής ασφάλισης.'
          : 'No medical history found for this social security number.'
      });
    }

    const doc = new pdfkit();

    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=patient_history_${selectedLanguage}.pdf`);
    doc.pipe(res);

    const logoPath = path.join(__dirname, 'logo.png');
    doc.image(logoPath, 50, 45, { width: 100 });

    // Προσθήκη custom γραμματοσειράς
    const fontPath = path.join(__dirname, 'fonts', 'SourceSansPro-Regular.otf');
    doc.font(fontPath); // Εδώ θα βάλεις τη γραμματοσειρά που υποστηρίζει ελληνικά

    const title = selectedLanguage === 'el' ? 'Ιστορικό Ασθενούς' : 'Patient Medical History';
    const downloadDateText = selectedLanguage === 'el' ? 'Ημερομηνία Λήψης' : 'Downloaded on';
    const footerName = selectedLanguage === 'el' ? 'Γενικό Ιατρικό Κέντρο "Medilife"' : 'General Medical Center "Medilife"';
    const footerContact = selectedLanguage === 'el'
      ? 'Τηλ.: 22730-14859 | Email: aegean@gmail.com | Fax: 254 478 2458'
      : 'Tel.: 22730-14859 | Email: aegean@gmail.com | Fax: 254 478 2458';

    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`${downloadDateText}: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    histories.forEach((history, index) => {
      const recordText = selectedLanguage === 'el' ? `Αρχείο ${index + 1}` : `Record ${index + 1}`;
      const ssnLabel = selectedLanguage === 'el' ? 'Αριθμός Κοινωνικής Ασφάλισης' : 'Social Security Number';
      const healthProblemsLabel = selectedLanguage === 'el' ? 'Διαγνωσθέντα Προβλήματα Υγείας' : 'Detected Health Problems';
      const treatmentLabel = selectedLanguage === 'el' ? 'Θεραπεία' : 'Treatment';
      const dateCreatedLabel = selectedLanguage === 'el' ? 'Ημερομηνία Δημιουργίας' : 'Date Created';

      doc.fontSize(12).text(recordText, { align: 'left' });
      doc.text(`${ssnLabel}: ${xss(history.socialSecurityNumber)}`);
      doc.text(`${healthProblemsLabel}: ${xss(history.detectedHealthProblems)}`);
      doc.text(`${treatmentLabel}: ${xss(history.treatment)}`);
      doc.text(`${dateCreatedLabel}: ${history.createdAt.toISOString()}`);
      doc.moveDown(1);
    });

    doc.moveDown(2);
    doc.fontSize(10).text(footerName, { align: 'center' });
    doc.text(footerContact, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Error downloading patient history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/download-patient-history/excel', async (req, res) => {
  try {
    const { socialSecurityNumber, language = 'el' } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
    const cleanedSSN = xss(socialSecurityNumber);

    // Βρίσκουμε τα ιατρικά ιστορικά που ταιριάζουν με το ΑΜΚΑ και κάνουμε populate το πεδίο ασθενή
    const histories = await MedicalHistory.find({ socialSecurityNumber: cleanedSSN }).populate('patient', 'name');

    if (!histories || histories.length === 0) {
      return res.status(404).json({ message: messages[selectedLanguage].noHistoriesFound });
    }

    // Δημιουργία βιβλίου Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(messages[selectedLanguage].worksheetTitle);

    worksheet.columns = [
      { header: messages[selectedLanguage].ssnHeader, key: 'socialSecurityNumber', width: 30 },
      { header: messages[selectedLanguage].healthProblemsHeader, key: 'detectedHealthProblems', width: 30 },
      { header: messages[selectedLanguage].treatmentHeader, key: 'treatment', width: 30 },
      { header: messages[selectedLanguage].patientNameHeader, key: 'patientName', width: 30 },
      { header: messages[selectedLanguage].dateCreatedHeader, key: 'dateCreated', width: 30 }
    ];

    histories.forEach((history) => {
      worksheet.addRow({
        socialSecurityNumber: xss(history.socialSecurityNumber),
        detectedHealthProblems: xss(history.detectedHealthProblems),
        treatment: xss(history.treatment),
        patientName: history.patient.name,
        dateCreated: history.createdAt.toISOString(),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=patient_history.xlsx');

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error(messages[selectedLanguage].serverError, error);
    res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});

router.post('/download-patient-history/one/pdf', async (req, res) => {
  try {
    const { historyId, language } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el'; // Υποστήριξη μόνο για 'en' και 'el'

    // Έλεγχος εγκυρότητας ID
    if (!historyId || historyId.length !== 4) {
      return res.status(400).json({ 
          message: selectedLanguage === 'el' ? 'Μη έγκυρος κωδικός ID.' : 'Invalid ID.' 
      });
    }

    const cleanedId = xss(historyId);
    const history = await MedicalHistory.findOne({ id: cleanedId }).populate('patient', 'name'); // Αναζητούμε με το πεδίο id

    if (!history) {
      return res.status(404).json({
        message: selectedLanguage === 'el' 
          ? 'Δεν βρέθηκε το ιατρικό ιστορικό για το συγκεκριμένο κωδικό ID.' 
          : 'No medical history found for this ID.'
      });
    }

    const doc = new pdfkit();

    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=patient_history_${selectedLanguage}.pdf`);
    doc.pipe(res);

    const logoPath = path.join(__dirname, 'logo.png');
    doc.image(logoPath, 50, 45, { width: 100 });

    // Προσθήκη custom γραμματοσειράς
    const fontPath = path.join(__dirname, 'fonts', 'SourceSansPro-Regular.otf');
    doc.font(fontPath);

    const title = selectedLanguage === 'el' ? 'Ιστορικό Ασθενούς' : 'Patient Medical History';
    const downloadDateText = selectedLanguage === 'el' ? 'Ημερομηνία Λήψης' : 'Downloaded on';
    const footerName = selectedLanguage === 'el' ? 'Γενικό Ιατρικό Κέντρο "Medilife"' : 'General Medical Center "Medilife"';
    const footerContact = selectedLanguage === 'el'
      ? 'Τηλ.: 22730-14859 | Email: aegean@gmail.com | Fax: 254 478 2458'
      : 'Tel.: 22730-14859 | Email: aegean@gmail.com | Fax: 254 478 2458';

    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`${downloadDateText}: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    const ssnLabel = selectedLanguage === 'el' ? 'Αριθμός Κοινωνικής Ασφάλισης' : 'Social Security Number';
    const healthProblemsLabel = selectedLanguage === 'el' ? 'Διαγνωσθέντα Προβλήματα Υγείας' : 'Detected Health Problems';
    const treatmentLabel = selectedLanguage === 'el' ? 'Θεραπεία' : 'Treatment';
    const dateCreatedLabel = selectedLanguage === 'el' ? 'Ημερομηνία Δημιουργίας' : 'Date Created';

    doc.fontSize(12).text(`${ssnLabel}: ${xss(history.socialSecurityNumber)}`);
    doc.text(`${healthProblemsLabel}: ${xss(history.detectedHealthProblems)}`);
    doc.text(`${treatmentLabel}: ${xss(history.treatment)}`);
    doc.text(`${dateCreatedLabel}: ${history.createdAt.toISOString()}`);
    doc.moveDown(2);

    doc.fontSize(10).text(footerName, { align: 'center' });
    doc.text(footerContact, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Error downloading patient history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/download-patient-history/one/excel', async (req, res) => {
  try {
    const { historyId, language } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';
    
    // Έλεγχος εγκυρότητας ID
    if (!historyId || historyId.length !== 4) {
      return res.status(400).json({ 
          message: selectedLanguage === 'el' ? 'Μη έγκυρος κωδικός ID.' : 'Invalid ID.' 
      });
    }

    const cleanedId = xss(historyId);

    // Αναζητούμε την συγκεκριμένη εγγραφή με βάση το ID
    const history = await MedicalHistory.findOne({ id: cleanedId }).populate('patient', 'name'); // Χρησιμοποιούμε το πεδίο id

    if (!history) {
      return res.status(404).json({
        message: selectedLanguage === 'el'
          ? 'Δεν βρέθηκε το ιατρικό ιστορικό για το συγκεκριμένο κωδικό ID.'
          : 'No medical history found for this ID.'
      });
    }

    // Δημιουργία βιβλίου Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(selectedLanguage === 'el' ? 'Ιστορικό Ασθενούς' : 'Patient History');

    worksheet.columns = [
      { header: selectedLanguage === 'el' ? 'Αριθμός Κοινωνικής Ασφάλισης' : 'Social Security Number', key: 'socialSecurityNumber', width: 30 },
      { header: selectedLanguage === 'el' ? 'Διαγνωσθέντα Προβλήματα Υγείας' : 'Detected Health Problems', key: 'detectedHealthProblems', width: 30 },
      { header: selectedLanguage === 'el' ? 'Θεραπεία' : 'Treatment', key: 'treatment', width: 30 },
      { header: selectedLanguage === 'el' ? 'Όνομα Ασθενούς' : 'Patient Name', key: 'patientName', width: 30 },
      { header: selectedLanguage === 'el' ? 'Ημερομηνία Δημιουργίας' : 'Date Created', key: 'dateCreated', width: 30 }
    ];

    worksheet.addRow({
      socialSecurityNumber: xss(history.socialSecurityNumber),
      detectedHealthProblems: xss(history.detectedHealthProblems),
      treatment: xss(history.treatment),
      patientName: history.patient.name,
      dateCreated: history.createdAt.toISOString(),
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=patient_history.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading patient history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.patch("/", async (req, res) => {
  try {
    const { socialSecurityNumber, detectedHealthProblems, treatment, language = 'el' } = req.body;
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    // Ensure that the socialSecurityNumber is provided
    if (!socialSecurityNumber) {
      return res.status(400).json({ error: messages[selectedLanguage].ssnRequired });
    }

    // Ensure at least one field to update is provided
    if (!detectedHealthProblems && !treatment) {
      return res.status(400).json({ error: messages[selectedLanguage].atLeastOneFieldRequired });
    }

    // Find the most recent medical history record for the given socialSecurityNumber
    const medicalHistory = await MedicalHistory.findOne({ socialSecurityNumber: xss(socialSecurityNumber) })
      .sort({ createdAt: -1 });

    if (!medicalHistory) {
      return res.status(404).json({ error: messages[selectedLanguage].recordNotFound });
    }

    // Update the fields if they are provided
    if (detectedHealthProblems) {
      medicalHistory.detectedHealthProblems = xss(detectedHealthProblems);
    }
    if (treatment) {
      medicalHistory.treatment = xss(treatment);
    }

    // Save the updated medical history to the database
    await medicalHistory.save();

    // Respond with the updated medical history details
    return res.status(200).json(medicalHistory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages[selectedLanguage].serverError });
  }
});



router.delete('/', async (req, res) => {
  try {
    const { id, language = 'el' } = req.body; // Εξαγωγή του id και της γλώσσας από το σώμα του αιτήματος
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    if (!id) {
      return res.status(400).json({ message: messages[selectedLanguage].idRequired });
    }

    // Βρίσκουμε και διαγράφουμε την εγγραφή με το συγκεκριμένο 'id'
    const removedRecord = await MedicalHistory.findOneAndDelete({ id: xss(id) });

    if (!removedRecord) {
      return res.status(404).json({ message: messages[selectedLanguage].recordNotFound });
    }

    res.json({
      message: messages[selectedLanguage].recordDeleted,
      deletedRecord: removedRecord,
    });
  } catch (error) {
    res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});


// Route to get user medical history based on socialSecurityNumber
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const { language = 'el' } = req.query; // Εξαγωγή της γλώσσας από τα query params
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    // Find the user by the session's userId
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: messages[selectedLanguage].userNotFound });
    }

    // If the user is a patient, retrieve their medical history based on socialSecurityNumber
    if (user.role === 'Patient') {
      // Find the medical history associated with this patient's socialSecurityNumber
      const medicalHistory = await MedicalHistory.find({ socialSecurityNumber: xss(user.ssn) });

      // If no medical history is found
      if (!medicalHistory.length) {
        return res.status(404).json({ message: messages[selectedLanguage].noMedicalHistoryFound });
      }

      // Include medical history in the response
      const historyInfo = medicalHistory.map(history => ({
        id: history.id, // Προσθέτουμε το ID του ιστορικού
        detectedHealthProblems: history.detectedHealthProblems,
        treatment: history.treatment,
        createdAt: history.createdAt,
        socialSecurityNumber: history.socialSecurityNumber,
      }));

      return res.status(200).json(historyInfo);
    } else {
      return res.status(403).json({ message: messages[selectedLanguage].accessDenied });
    }
  } catch (error) {
    console.error('Error retrieving medical history:', error);
    res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});

// Route to get the medical history by its unique ID
router.get("/medical-history/:id", async (req, res) => {
  try {
    const { language = 'el' } = req.query; // Εξαγωγή της γλώσσας από τα query params
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    const historyId = xss(req.params.id); // Ανάγνωση του μοναδικού ID της ιατρικής ιστορίας από τις παραμέτρους URL

    // Find the medical history by the unique ID
    const find_med_history = await MedicalHistory.findOne({ id: historyId });

    if (!find_med_history) {
      return res.status(404).json({ message: messages[selectedLanguage].recordNotFound });
    }

    // Return the medical history record
    return res.status(200).json(find_med_history);
  } catch (error) {
    console.error('Error fetching medical history:', error);
    return res.status(500).json({ message: messages[selectedLanguage].serverError });
  }
});




// Export the router
module.exports = router;