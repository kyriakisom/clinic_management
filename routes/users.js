const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { check, validationResult } = require('express-validator');
const { isAuthenticated } = require('../middleware/auth'); 

const messages = {
    en: {
        userNotFound: 'User not found.',
        usernameInvalid: 'Username must contain only Latin characters and underscores.',
        firstnameRequired: 'First name is required.',
        firstnameInvalid: 'First name must contain only Latin or Greek characters.',
        lastnameRequired: 'Last name is required.',
        lastnameInvalid: 'Last name must contain only Latin or Greek characters.',
        emailInvalid: 'Invalid email format.',
        idNumberRequired: 'ID number is required.',
        idNumberInvalid: 'ID number must contain only alphanumeric characters.',
        specialtyRequired: 'Specialty is required.',
        specialtyInvalid: 'Specialty must contain only Latin or Greek characters.',
        ssnRequired: 'SSN is required.',
        ssnInvalid: 'SSN must contain exactly 11 digits.',
        usernameTaken: 'Username is already taken.',
        emailTaken: 'Email is already taken.',
        idNumberTaken: 'ID number is already taken.',
        ssnTaken: 'SSN is already taken.',
        updateSuccess: 'User information updated successfully.',
        serverError: 'Server error. Please try again later.',
        invalidCredentials: 'Not valid username or password.',
        usernameRequired: 'Username is required.',
        passwordRequired: 'Password is required.',
        invalidCredentials: 'Invalid username or password.',
        loginSuccessful: 'Login successful.',
        allFieldsRequired: 'Please fill in all the fields.'
    },
    el: {
        userNotFound: 'Ο χρήστης δεν βρέθηκε.',
        usernameInvalid: 'Το όνομα χρήστη πρέπει να περιέχει μόνο λατινικούς χαρακτήρες και κάτω παύλες.',
        firstnameRequired: 'Το όνομα είναι απαραίτητο.',
        firstnameInvalid: 'Το όνομα πρέπει να περιέχει μόνο ελληνικούς ή λατινικούς χαρακτήρες.',
        lastnameRequired: 'Το επώνυμο είναι απαραίτητο.',
        lastnameInvalid: 'Το επώνυμο πρέπει να περιέχει μόνο ελληνικούς ή λατινικούς χαρακτήρες.',
        emailInvalid: 'Μη έγκυρη μορφή email.',
        idNumberRequired: 'Ο αριθμός ταυτότητας είναι απαραίτητος.',
        idNumberInvalid: 'Ο αριθμός ταυτότητας πρέπει να περιέχει μόνο αλφαβητικούς και αριθμητικούς χαρακτήρες.',
        specialtyRequired: 'Η ειδικότητα είναι απαραίτητη.',
        specialtyInvalid: 'Η ειδικότητα πρέπει να περιέχει μόνο ελληνικούς ή λατινικούς χαρακτήρες.',
        ssnRequired: 'Ο ΑΜΚΑ είναι απαραίτητος.',
        ssnInvalid: 'Ο αριθμός κοινωνικής ασφάλισης πρέπει να περιέχει ακριβώς 11 ψηφία.',
        usernameTaken: 'Το όνομα χρήστη είναι ήδη χρησιμοποιούμενο.',
        emailTaken: 'Το email είναι ήδη χρησιμοποιούμενο.',
        idNumberTaken: 'Ο αριθμός ταυτότητας είναι ήδη χρησιμοποιούμενος.',
        ssnTaken: 'Ο ΑΜΚΑ είναι ήδη χρησιμοποιούμενος.',
        updateSuccess: 'Οι πληροφορίες χρήστη ενημερώθηκαν με επιτυχία.',
        serverError: 'Σφάλμα διακομιστή. Παρακαλώ δοκιμάστε ξανά αργότερα.',
        invalidCredentials: 'Μη έγκυρο όνομα χρήστη ή κωδικός πρόσβασης.',
        usernameRequired: 'Το όνομα χρήστη είναι υποχρεωτικό.',
        passwordRequired: 'Ο κωδικός πρόσβασης είναι υποχρεωτικός.',
        invalidCredentials: 'Μη έγκυρο όνομα χρήστη ή κωδικός πρόσβασης.',
        loginSuccessful: 'Επιτυχής σύνδεση.',
        allFieldsRequired: 'Παρακαλώ συμπληρώστε όλα τα πεδία.'
    }
};


router.post('/signup', async (req, res) => {
    try {
        console.log('Request body:', req.body); // Log the request body
        
        const { username, firstname, lastname, idnumber, email, password, role, ssn, specialty, language } = req.body;
        
        const validLanguages = ['en', 'el'];
        const selectedLanguage = validLanguages.includes(language) ? language : 'el';
        
        // Patterns for Latin and Greek characters
        const usernamePattern = /^[A-Za-z_]+$/; // Only Latin characters and underscores for username
        const namePattern = /^[A-Za-zΆ-ώΑ-Ωα-ω\s]+$/; // Allows Latin and Greek characters with spaces
        const idNumberPattern = /^[A-Za-zΑ-Ωα-ω0-9]+$/; // Latin/Greek letters and digits
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard email pattern
        const ssnPattern = /^\d{11}$/; // 11-digit SSN


        const errors = [];

        // Validation for required fields
        if (!username || !firstname || !lastname || !idnumber || !email || !password || !role) {
            return res.status(400).json({ errors: [messages[selectedLanguage].allFieldsRequired] });
        }


        // Username validation
        if (!usernamePattern.test(username)) {
            errors.push(messages[selectedLanguage].usernameInvalid);
        }
        
        // Validate firstname and lastname
        if (!namePattern.test(firstname)) {
            errors.push(messages[selectedLanguage].firstnameInvalid);
        }
        if (!namePattern.test(lastname)) {
            errors.push(messages[selectedLanguage].lastnameInvalid);
        }

        // ID number validation
        if (!idNumberPattern.test(idnumber)) {
            errors.push(messages[selectedLanguage].idNumberInvalid);
        }

        // Email validation
        if (!emailPattern.test(email)) {
            errors.push(messages[selectedLanguage].emailInvalid);
        }

        // Check for existing user with the same username, email, id number, or SSN
        const existingUser = await User.findOne({
            $or: [{ username }, { email }, { idNumber: idnumber }, { ssn }]
        });

        if (existingUser) {
            if (existingUser.username === username) {
                errors.push(messages[selectedLanguage].usernameTaken);
            }
            if (existingUser.email === email) {
                errors.push(messages[selectedLanguage].emailTaken);
            }
            if (existingUser.idNumber === idnumber) {
                errors.push(messages[selectedLanguage].idNumberTaken);
            }
            if (role === 'Patient' && existingUser.ssn === ssn) {
                errors.push(messages[selectedLanguage].ssnTaken);
            }
        }

        // Additional validations for role-specific fields
        if (role === 'Patient' && (!ssn || !ssnPattern.test(ssn))) {
            errors.push(messages[selectedLanguage].ssnInvalid);
        }

        if (role === 'Doctor' && specialty && !namePattern.test(specialty)) {
            errors.push(messages[selectedLanguage].specialtyInvalid);
        }

        // Return errors if there are any
        if (errors.length > 0) {
            return res.status(400).json({ errors }); // Send validation errors to the frontend
        }
        
        // Hash password and create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            firstname,
            lastname,
            idNumber: idnumber,
            email,
            password: hashedPassword,
            role,
            ssn,
            specialty
        });

        await newUser.save();
        res.status(201).json({ message: messages[selectedLanguage].registrationSuccess });
    } catch (error) {
        console.error('Σφάλμα κατά την εγγραφή:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: messages['en'].usernameTaken });
        }
        res.status(500).json({ message: messages[selectedLanguage].serverError });
    }
});


// Login route with language support
router.post('/login', async (req, res) => {
    try {
        const { username, password, language } = req.body;

        // Validate language
        const validLanguages = ['en', 'el'];
        const selectedLanguage = validLanguages.includes(language) ? language : 'en';

        if (!username) {
            return res.status(400).json({ message: messages[selectedLanguage].usernameRequired });
        }
        
        if (!password) {
            return res.status(400).json({ message: messages[selectedLanguage].passwordRequired });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: messages[selectedLanguage].invalidCredentials });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: messages[selectedLanguage].invalidCredentials });
        }

        req.session.userId = user._id; // Set user ID in session

        const userInfo = {
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            idNumber: user.idNumber,
            email: user.email,
            role: user.role,
        };

        if (user.role === 'Patient') {
            userInfo.ssn = user.ssn;
        } else if (user.role === 'Doctor') {
            userInfo.specialty = user.specialty;
        }

        res.status(200).json({ message: messages[selectedLanguage].loginSuccessful, user: userInfo });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: messages[selectedLanguage].serverError });
    }
});
// router.post('/checkUsername', (req, res) => {
//     const { username } = req.body;

//     // Λογική για τον έλεγχο του username στη βάση δεδομένων
//     db.collection('users').findOne({ username: username }, (err, user) => {
//         if (err) {
//             return res.status(500).json({ error: 'Internal Server Error' });
//         }

//         if (user) {
//             return res.json({ isUnique: false }); // Το username υπάρχει ήδη
//         }

//         return res.json({ isUnique: true }); // Το username είναι διαθέσιμο
//     });
// });
router.post('/checkUsername', async (req, res) => {
    const { username } = req.body;
    
    try {
        const user = await User.findOne({ username });
        if (user) {
            return res.status(200).json({ exists: true });
        }
        res.status(200).json({ exists: false });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to get user information with language support
router.get('/getUserInfo', isAuthenticated, async (req, res) => {
    try {
        // Extract language from query parameters, default to 'en'
        const language = req.query.language || 'en';
        const validLanguages = ['en', 'el'];
        const selectedLanguage = validLanguages.includes(language) ? language : 'en';

        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: messages[selectedLanguage].userNotFound });
        }

        const userInfo = {
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            idNumber: user.idNumber,
            email: user.email,
            role: user.role,
        };

        if (user.role === 'Patient') {
            userInfo.ssn = user.ssn;
        } else if (user.role === 'Doctor') {
            userInfo.specialty = user.specialty;
        }

        res.status(200).json(userInfo);
    } catch (error) {
        console.error('Error retrieving user information:', error);
        res.status(500).json({ message: messages['en'].serverError });
    }
});

router.put('/updateUserInfo', [
    isAuthenticated,
    async (req, res) => {
        try {
            const language = req.query.language || 'en';
            const validLanguages = ['en', 'el'];
            const selectedLanguage = validLanguages.includes(language) ? language : 'en';

            console.log('Selected language:', selectedLanguage);

            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.status(404).json({ message: messages[selectedLanguage].userNotFound });
            }

            console.log('User found:', user);

            // Χρήση πιο περιεκτικού regex για ελληνικούς και λατινικούς χαρακτήρες
            const greekLatinRegex = /^[A-Za-zΆ-ώΑ-Ωα-ω\s]+$/;

            // Validate fields
            await check('username')
                .optional()
                .notEmpty().withMessage(messages[selectedLanguage].usernameInvalid)
                .matches(/^[A-Za-zΑ-Ωα-ω_]+$/).withMessage(messages[selectedLanguage].usernameInvalid)
                .run(req);

            await check('firstname')
                .optional()
                .notEmpty().withMessage(messages[selectedLanguage].firstnameRequired)
                .matches(greekLatinRegex).withMessage(messages[selectedLanguage].firstnameInvalid)
                .run(req);

            await check('lastname')
                .optional()
                .notEmpty().withMessage(messages[selectedLanguage].lastnameRequired)
                .matches(greekLatinRegex).withMessage(messages[selectedLanguage].lastnameInvalid)
                .run(req);

            await check('email')
                .optional()
                .isEmail().withMessage(messages[selectedLanguage].emailInvalid)
                .run(req);

            await check('idNumber')
                .optional()
                .notEmpty().withMessage(messages[selectedLanguage].idNumberRequired)
                .matches(/^[A-Za-zΑ-Ωα-ω\d]+$/).withMessage(messages[selectedLanguage].idNumberInvalid)
                .run(req);

            if (user.role === 'Doctor') {
                await check('specialty')
                    .optional()
                    .notEmpty().withMessage(messages[selectedLanguage].specialtyRequired)
                    .matches(greekLatinRegex).withMessage(messages[selectedLanguage].specialtyInvalid)
                    .run(req);
            }

            if (user.role === 'Patient') {
                await check('ssn')
                    .notEmpty().withMessage(messages[selectedLanguage].ssnRequired)
                    .isLength({ min: 11, max: 11 }).withMessage(messages[selectedLanguage].ssnLength)
                    .isNumeric().withMessage(messages[selectedLanguage].ssnNumeric)
                    .run(req);
            }

            // Check validation results
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('Validation Errors:', errors.array());
                return res.status(400).json({ errors: errors.array() });
            }

            // Extract new values from the request body
            const { username, firstname, lastname, email, idNumber, ssn, specialty } = req.body;

            // Check for unique constraints
            if (username && username !== user.username) {
                console.log('Checking username uniqueness:', username);
                const existingUser = await User.findOne({ username });
                if (existingUser) {
                    return res.status(400).json({ message: messages[selectedLanguage].usernameTaken });
                }
            }

            if (email && email !== user.email) {
                console.log('Checking email uniqueness:', email);
                const existingEmail = await User.findOne({ email });
                if (existingEmail) {
                    return res.status(400).json({ message: messages[selectedLanguage].emailTaken });
                }
            }

            if (idNumber && idNumber !== user.idNumber) {
                console.log('Checking ID number uniqueness:', idNumber);
                const existingIdNumber = await User.findOne({ idNumber });
                if (existingIdNumber) {
                    return res.status(400).json({ message: messages[selectedLanguage].idNumberTaken });
                }
            }

            if (ssn && user.role === 'Patient' && ssn !== user.ssn) {
                console.log('Checking SSN uniqueness:', ssn);
                const existingSsn = await User.findOne({ ssn });
                if (existingSsn) {
                    return res.status(400).json({ message: messages[selectedLanguage].ssnTaken });
                }
            }

            // Proceed with updating user information
            user.username = username || user.username;
            user.firstname = firstname || user.firstname;
            user.lastname = lastname || user.lastname;
            user.email = email || user.email;
            user.idNumber = idNumber || user.idNumber;
            user.ssn = ssn || user.ssn;
            user.specialty = specialty || user.specialty;

            await user.save();
            res.json({ message: messages[selectedLanguage].updateSuccess });
        } catch (error) {
            console.error('Server error:', error);
            res.status(500).json({ message: messages[selectedLanguage].serverError, error });
        }
    }
]);

router.post('/forgot-password', async (req, res) => {
    const { email, language = 'en' } = req.body;  // Capture email and language preference from the request body
    
    // Determine the correct language for messages
    const langMessages = messages[language] || messages['en'];  // Default to English if the language is not found

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: langMessages.userNotFound });
        }

        // Store the reset password email in the session
        req.session.resetPasswordEmail = email;

        // Respond with a language-specific success message
        res.json({ message: langMessages.passwordResetLinkSent });
    } catch (error) {
        res.status(500).json({ message: langMessages.serverError });
    }
});

// Route για αλλαγή κωδικού πρόσβασης
router.post('/changepassword', async (req, res) => {
    try {
        const { username, oldpassword, newpassword, language } = req.body;

        // Επαλήθευση γλώσσας
        const validLanguages = ['en', 'el'];
        const selectedLanguage = validLanguages.includes(language) ? language : 'el';

        // Εύρεση χρήστη βάσει username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: messages[selectedLanguage].userNotFound });
        }

        // Έλεγχος αν ο παλιός κωδικός είναι σωστός
        const isMatch = await bcrypt.compare(oldpassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: messages[selectedLanguage].oldPasswordIncorrect });
        }

        // Κρυπτογράφηση του νέου κωδικού
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newpassword, salt);

        // Ενημέρωση του χρήστη με το νέο κωδικό
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: messages[selectedLanguage].passwordChanged });
    } catch (error) {
        console.error('Error during password change:', error);
        res.status(500).json({ message: messages[selectedLanguage].serverError });
    }
});

// Handle contact form submission
router.post('/contact', (req, res) => {
    const { email, subject, message } = req.body;

    // Simple validation
    if (!email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Here, you could add logic to send an email or save the message in a database
    // For now, we'll just log the message and return a success response
    console.log('Contact Form Submission:', { email, subject, message });

    // Simulate a success response
    return res.status(200).json({ success: 'Message sent successfully!' });
});

router.get('/get', async (req, res) => {
    try {
        // Extract language from query parameters, default to 'el'
        const language = req.query.language || 'el';
        const validLanguages = ['en', 'el'];
        const selectedLanguage = validLanguages.includes(language) ? language : 'el';

        // Search for user by SSN
        const user = await User.findOne({ ssn: req.query.ssn });
        if (!user) {
            return res.status(404).json({ message: messages[selectedLanguage].userNotFound });
        }

        // Check if the user is a Patient
        if (user.role !== 'Patient') {
            return res.status(403).json({ message: messages[selectedLanguage].accessDenied });
        }

        // Return patient information
        const userInfo = {
            firstname: user.firstname,
            lastname: user.lastname,
            idNumber: user.idNumber,
            email: user.email,
            role: user.role,
            ssn: user.ssn
        };

        res.status(200).json(userInfo);
    } catch (error) {
        console.error('Error retrieving user information:', error);
        res.status(500).json({ message: messages[selectedLanguage].serverError });
    }
});

router.post('/logout', (req, res) => {
    // Extract language from query parameters, default to 'el'
    const language = req.query.language || 'el';
    const validLanguages = ['en', 'el'];
    const selectedLanguage = validLanguages.includes(language) ? language : 'el';

    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(400).send(messages[selectedLanguage].logoutError);
            } else {
                res.send(messages[selectedLanguage].logoutSuccess);
            }
        });
    } else {
        res.status(400).send(messages[selectedLanguage].noSession);
    }
});


module.exports = router;
