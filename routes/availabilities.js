const express = require('express');
const fileUpload = require('express-fileupload');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const fs = require('fs');
const Doctor = require('../models/doctor'); // Corrected path
const DoctorAvailability = require('../models/availability'); // Corrected path
const router = express.Router();
const moment = require('moment'); // Import moment.js for date manipulation
const xss = require('xss'); // Import xss library

router.use(fileUpload());

// Μηνύματα για διαφορετικές γλώσσες
const messages = {
    en: {
      noFileUploaded: 'No file uploaded',
      errorSavingFile: 'Error saving file',
      invalidData: 'Invalid data in CSV file',
      invalidOrPastSlotDate: 'Invalid or past slot date',
      noDoctorsFound: 'No doctors found for specialty',
      duplicateAvailability: 'Duplicate availability found and ignored',
      fileUploadSuccess: 'File successfully uploaded and doctor availability saved',
      errorSavingAvailability: 'Error saving doctor availability',
      errorProcessingCSV: 'Error processing CSV file',
      errorUploadingFile: 'Error uploading file',
      invalidRequestBody: 'Invalid request body',
      doctorNotFound: 'Doctor not found',
      noValidSlots: 'No valid slots available',
      overlappingSlots: 'Some slots overlap with existing availability',
      internalServerError: 'Internal Server Error',
      invalidRequestBody: "Invalid request body",
      doctorNotFound: "Doctor not found",
      availabilityNotFound: "Doctor availability not found",
      overlappingSlots: "Some slots overlap with existing availability",
      noValidSlots: "No valid slots available",
    },
    el: {
      noFileUploaded: 'Δεν ανέβηκε αρχείο',
      errorSavingFile: 'Σφάλμα κατά την αποθήκευση του αρχείου',
      invalidData: 'Μη έγκυρα δεδομένα στο αρχείο CSV',
      invalidOrPastSlotDate: 'Μη έγκυρη ή παρελθούσα ημερομηνία ώρας',
      noDoctorsFound: 'Δεν βρέθηκαν γιατροί για την ειδικότητα',
      duplicateAvailability: 'Βρέθηκε επαναλαμβανόμενη διαθεσιμότητα και αγνοήθηκε',
      fileUploadSuccess: 'Το αρχείο ανέβηκε επιτυχώς και η διαθεσιμότητα των γιατρών αποθηκεύτηκε',
      errorSavingAvailability: 'Σφάλμα κατά την αποθήκευση της διαθεσιμότητας των γιατρών',
      errorProcessingCSV: 'Σφάλμα κατά την επεξεργασία του αρχείου CSV',
      errorUploadingFile: 'Σφάλμα κατά την ανέβασμα του αρχείου',
      invalidRequestBody: 'Μη έγκυρο σώμα αιτήματος',
      doctorNotFound: 'Ο γιατρός δεν βρέθηκε',
      noValidSlots: 'Δεν υπάρχουν έγκυροι χρόνοι διαθεσιμότητας',
      overlappingSlots: 'Ορισμένοι χρόνοι επικαλύπτονται με υπάρχουσες διαθεσιμότητες',
      internalServerError: 'Εσωτερικό σφάλμα διακομιστή',
      invalidRequestBody: "Μη έγκυρο σώμα αιτήματος",
        doctorNotFound: "Γιατρός δεν βρέθηκε",
        availabilityNotFound: "Η διαθεσιμότητα του γιατρού δεν βρέθηκε",
        overlappingSlots: "Ορισμένες χρονικές διαθέσεις επικαλύπτονται με υπάρχουσες διαθεσιμότητες",
        noValidSlots: "Δεν υπάρχουν έγκυρες χρονικές διαθέσιμες",
    }
  };

  router.post('/upload-doctor-availability-csv', async (req, res) => {
    const language = req.query.language || 'el';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    try {
        if (!req.files || !req.files.file) {
            console.error("No file uploaded");
            return res.status(400).json({ error: messages[selectedLanguage].noFileUploaded });
        }

        const file = req.files.file;
        const filePath = './uploads/' + xss(file.name);

        file.mv(filePath, async (err) => {
            if (err) {
                console.error("Error saving file:", err);
                return res.status(500).send(messages[selectedLanguage].errorSavingFile);
            }

            let specialtySlots = {};
            let specialtyNames = {};

            try {
                fs.createReadStream(filePath)
                    .pipe(csv({ separator: ';', mapHeaders: ({ header }) => header.trim() })) // Trim headers
                    .on('data', (data) => {
                        try {
                            // Log the data to see how it is parsed
                            console.log("Data Row:", data);

                            // Ensure field names match both Greek and English possibilities
                            const specialty = xss(data['Ειδικότητα'] || data['specialty']);
                            const date = xss(data['Ημερομηνία'] || data['date']);
                            const time = xss(data['Ώρα'] || data['time']);
                            const name = xss(data['Όνομα'] || data['name']);

                            // Log the processed fields
                            console.log(`Specialty: ${specialty}, Date: ${date}, Time: ${time}, Name: ${name}`);

                            if (!specialty || !date || !time || !name) {
                                console.error("Invalid data:", data);
                                return;
                            }

                            const slotDateTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm:ss');
                            const now = moment();

                            if (!slotDateTime.isValid() || slotDateTime.isBefore(now)) {
                                console.error("Invalid or past slot date:", `${date} ${time}`);
                                return;
                            }

                            if (!specialtySlots[specialty]) {
                                specialtySlots[specialty] = [];
                            }

                            specialtySlots[specialty].push({
                                date: date,
                                time: time
                            });

                            if (!specialtyNames[specialty]) {
                                specialtyNames[specialty] = name;
                            }
                        } catch (err) {
                            console.error("Error processing slot data:", err);
                        }
                    })
                    .on('end', async () => {
                        try {
                            for (let specialty in specialtySlots) {
                                const doctors = await Doctor.find({ specialty: xss(specialty) });

                                if (doctors.length === 0) {
                                    console.error("No doctors found for specialty:", specialty);
                                    continue;
                                }

                                for (let doctor of doctors) {
                                    const uniqueSlots = specialtySlots[specialty].filter((slot, index, self) =>
                                        index === self.findIndex((s) => (
                                            s.date === slot.date && s.time === slot.time
                                        ))
                                    );

                                    for (let slot of uniqueSlots) {
                                        const existingAvailability = await DoctorAvailability.findOne({
                                            name: specialtyNames[specialty],
                                            specialty: specialty,
                                            'slots.date': slot.date,
                                            'slots.time': slot.time
                                        });

                                        if (existingAvailability) {
                                            console.log("Duplicate availability found and ignored:", slot);
                                            continue;
                                        }

                                        const newAvailability = new DoctorAvailability({
                                            doctor: doctor._id,
                                            specialty: specialty,
                                            slots: [{ date: slot.date, time: slot.time }],
                                            name: specialtyNames[specialty]
                                        });

                                        await newAvailability.save();
                                    }
                                }
                            }

                            console.log("Doctor availability saved for all doctors with specified specialties");
                            res.status(200).send(messages[selectedLanguage].fileUploadSuccess);
                        } catch (error) {
                            console.error("Error saving doctor availability:", error);
                            res.status(500).send(messages[selectedLanguage].errorSavingAvailability);
                        } finally {
                            fs.unlink(filePath, (err) => {
                                if (err) console.error('Error removing file:', err);
                            });
                        }
                    });
            } catch (error) {
                console.error("Error processing CSV file:", error);
                res.status(500).send(messages[selectedLanguage].errorProcessingCSV);
            }
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).send(messages[selectedLanguage].errorUploadingFile);
    }
});


// Route to create doctor availability
router.post("/", async (req, res) => {
    // Get the language from query parameters or default to 'el'
    const language = req.query.language || 'el';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'el';

    try {
        const slots = req.body.slots.map(slot => ({
            date: xss(slot.date),
            time: xss(slot.time)
        }));
        const specialty = xss(req.body.specialty);
        const name = xss(req.body.name);

        // Validate the request body
        if (!specialty || !slots || !Array.isArray(slots) || slots.length === 0 || !name) {
            return res.status(400).json({ errors: [messages[selectedLanguage].invalidRequestBody] });
        }

        // Check if any doctor exists with the given specialty and name
        const doctor = await Doctor.findOne({ specialty, name });

        if (!doctor) {
            return res.status(404).json({ errors: [messages[selectedLanguage].doctorNotFound] });
        }

        // Validate slots - Ensure future dates and times
        const now = moment();
        const validSlots = slots.filter(slot => {
            const slotDateTime = moment(`${slot.date} ${slot.time}`, 'YYYY-MM-DD HH:mm:ss');
            return slotDateTime.isValid() && slotDateTime.isAfter(now);
        });

        if (validSlots.length === 0) {
            return res.status(400).json({ errors: [messages[selectedLanguage].noValidSlots] });
        }

        // Check for overlapping slots
        const existingAvailabilities = await DoctorAvailability.find({ specialty, name });
        const existingSlots = existingAvailabilities.flatMap(av => av.slots);

        const overlappingSlots = validSlots.filter(slot => {
            return existingSlots.some(existingSlot => 
                existingSlot.date === slot.date && existingSlot.time === slot.time
            );
        });

        if (overlappingSlots.length > 0) {
            return res.status(400).json({ errors: [messages[selectedLanguage].overlappingSlots] });
        }

        // Create new availability
        const newAvailability = new DoctorAvailability({
            specialty,
            name,
            slots: validSlots.map(slot => ({
                date: slot.date,
                time: slot.time
            }))
        });

        await newAvailability.save();

        return res.status(201).json(newAvailability);
    } catch (error) {
        console.error("Unhandled error:", error);
        return res.status(500).json({ errors: [messages[selectedLanguage].internalServerError] });
    }
});

router.put("/:id", async (req, res) => {
    // Εξαγωγή γλώσσας από τα query parameters, προεπιλεγμένη γλώσσα είναι 'en'
    const language = req.query.language || 'en';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'en';

    try {
        const id = req.params.id; // Ανάκτηση του ID από τα παραμέτρους του URL
        const slots = req.body.slots.map(slot => ({
            date: xss(slot.date), // Αποθηκεύεται ως string
            time: xss(slot.time)  // Αποθηκεύεται ως string
        }));
        const specialty = xss(req.body.specialty);
        const name = xss(req.body.name);

        // Validate the request body
        if (!id || !specialty || !slots || !Array.isArray(slots) || slots.length === 0 || !name) {
            return res.status(400).json({ errors: [messages[selectedLanguage].invalidRequestBody] });
        }

        // Check if any doctor exists with the given specialty and name
        const doctor = await Doctor.findOne({ specialty, name });

        if (!doctor) {
            return res.status(404).json({ errors: [messages[selectedLanguage].doctorNotFound] });
        }

        // Εύρεση της υπάρχουσας εγγραφής DoctorAvailability με βάση το ID του schema
        const existingAvailability = await DoctorAvailability.findOne({ id });

        if (!existingAvailability) {
            return res.status(404).json({ errors: [messages[selectedLanguage].availabilityNotFound] });
        }

        // Αναζήτηση για επικαλυπτόμενες διαθεσιμότητες με την ίδια ειδικότητα και όνομα γιατρού
        const overlappingAvailabilities = await DoctorAvailability.find({
            specialty: existingAvailability.specialty,
            name: existingAvailability.name,
            id: { $ne: id }, // Exclude the current document being updated
            slots: {
                $elemMatch: {
                    date: { $in: slots.map(slot => slot.date) },
                    time: { $in: slots.map(slot => slot.time) }
                }
            }
        });

        // Αν βρέθηκαν επικαλυπτόμενες διαθεσιμότητες, έλεγχος για συγκεκριμένα slots
        const overlappingSlots = slots.filter(slot =>
            overlappingAvailabilities.some(avail =>
                avail.slots.some(existingSlot =>
                    existingSlot.date === slot.date && existingSlot.time === slot.time
                )
            )
        );

        if (overlappingSlots.length > 0) {
            return res.status(400).json({ errors: [messages[selectedLanguage].overlappingSlots] });
        }

        // Validate slots - Ensure future dates and times
        const now = moment();
        const validSlots = slots.filter(slot => {
            const slotDateTime = moment(`${slot.date} ${slot.time}`, 'YYYY-MM-DD HH:mm:ss');
            return slotDateTime.isValid() && slotDateTime.isAfter(now);
        });

        if (validSlots.length === 0) {
            return res.status(400).json({ errors: [messages[selectedLanguage].noValidSlots] });
        }

        // Ενημέρωση της υπάρχουσας διαθεσιμότητας με τα νέα slots
        existingAvailability.slots = validSlots.map(slot => ({
            date: slot.date, // Αποθηκεύεται ως string
            time: slot.time  // Αποθηκεύεται ως string
        }));

        // Αποθήκευση των αλλαγών
        await existingAvailability.save();

        return res.status(200).json(existingAvailability);
    } catch (error) {
        console.error("Unhandled error:", error);
        return res.status(500).json({ errors: [messages[selectedLanguage].serverError] });
    }
});




router.get("/find-by-name", async (req, res) => {
    // Get the language from query parameters or default to 'en'
    const language = req.query.language || 'en';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'en';

    try {
        // Retrieve all availabilities
        const availabilities = await DoctorAvailability.find({});

        // Check if any availabilities were found
        if (availabilities.length === 0) {
            const message = selectedLanguage === 'el' ? 'Δεν βρέθηκαν διαθεσιμότητες' : 'No availabilities found';
            return res.status(404).json({ error: message });
        }

        return res.status(200).json(availabilities);
    } catch (error) {
        console.error("Unhandled error:", error);
        const message = selectedLanguage === 'el' ? 'Εσωτερικό σφάλμα διακομιστή' : 'Internal Server Error';
        return res.status(500).json({ error: message });
    }
});


router.get("/:id", async (req, res) => {
    // Get the language from query parameters or default to 'en'
    const language = req.query.language || 'en';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'en';

    try {
        // Retrieve the doctor availability by ID
        const doctorId = req.params.id;

        // Search for availability by ID
        const availability = await DoctorAvailability.findOne({ id: doctorId });

        // Check if availability was found
        if (!availability) {
            const message = selectedLanguage === 'el' ? 'Δεν βρέθηκε διαθεσιμότητα για το δοθέν ID' : 'No availability found for the given ID';
            return res.status(404).json({ error: message });
        }

        // Return the availability details
        return res.status(200).json(availability);
    } catch (error) {
        console.error("Unhandled error:", error);
        const message = selectedLanguage === 'el' ? 'Εσωτερικό σφάλμα διακομιστή' : 'Internal Server Error';
        return res.status(500).json({ error: message });
    }
});



router.delete('/', async (req, res) => {
    // Get the language from query parameters or default to 'en'
    const language = req.query.language || 'en';
    const selectedLanguage = ['en', 'el'].includes(language) ? language : 'en';

    try {
        const id = xss(req.body.id);

        console.log("Sanitized request body:", { id });

        if (!id) {
            console.log("Missing id in request body");
            const message = selectedLanguage === 'el' ? 'Το ID είναι απαραίτητο στο σώμα του αιτήματος' : 'ID is required in request body';
            return res.status(400).json({ error: message });
        }

        // Find and delete the DoctorAvailability record with the given id
        const result = await DoctorAvailability.findOneAndDelete({ id });

        console.log("Deletion result:", result);

        if (!result) {
            const message = selectedLanguage === 'el' ? 'Δεν βρέθηκε διαθεσιμότητα για διαγραφή' : 'Doctor Availability not found';
            return res.status(404).json({ error: message });
        }

        const successMessage = selectedLanguage === 'el' ? 'Η διαθεσιμότητα του γιατρού διαγράφηκε με επιτυχία' : 'Doctor Availability successfully deleted';
        return res.status(200).json({ message: successMessage });
    } catch (error) {
        console.error("Unhandled error:", error);
        const errorMessage = selectedLanguage === 'el' ? 'Εσωτερικό σφάλμα διακομιστή' : 'Internal Server Error';
        return res.status(500).json({ error: errorMessage });
    }
});


module.exports = router;
