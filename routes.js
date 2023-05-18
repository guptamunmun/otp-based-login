const express = require("express");
const User = require("./db");
const nodemailer = require('nodemailer');
const jwt= require("jsonwebtoken")

const router = express.Router();






// Generate OTP
function generateOTP(length) {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    otp += digits[randomIndex];
  }

  return otp;
}

// Save OTP to the database
async function saveOtpToDatabase(email, otp, otpExpiry,otpRequestTime) {
  try {
    let user = await User.findOne({ email });

    if (!user) {
      // Create a new user document if not found
      user = new User({ email, otp, otpExpiry,otpRequestTime });
    } else {
      // Update the existing user document
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.otpRequestTime = otpRequestTime;
    }

    // Save the user document
    await user.save();

    return user;
  } catch (error) {
    console.error('Error saving OTP to database:', error);
    throw error;
  }
}


// Generate OTP API
router.post('/generate-otp', async (req, res) => {
    const { email } = req.body;

    let testAccount = await nodemailer.createTestAccount();
    // Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
});
  //send otp by email
function sendOtpByEmail(email, otp) {
  const mailOptions = {
  from: '"Fred Foo 👻" <foo@example.com>', // sender address
  to: email, // list of receivers
  subject: 'OTP for Login',
  text: `Your OTP is: ${otp}`,
  }
  
    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Error sending OTP email:', err);
      }
    });
  }
    const lastOtpRequestTime = await User.findOne({ email }).select('otpRequestTime');
    const currentTime = Date.now();
  
    if (lastOtpRequestTime && currentTime - lastOtpRequestTime.otpRequestTime < 60000) {
      return res.status(429).json({ message: 'Please wait for 1 minute before generating a new OTP.' });
    }
  
    const user = await User.findOne({ email });
    // if (!user) {
    //     return res.status(404).json({ message: 'User not found.' });
    //   }
    if (user && user.blockedUntil && user.blockedUntil > currentTime) {
      const blockDuration = Math.ceil((user.blockedUntil - currentTime) / 1000 / 60); // Calculate the remaining block duration in minutes
      console.log('Blocked Until:', user.blockedUntil);  // Log the value of blockedUntil
      return res.status(403).json({ message: `Your account is blocked. Please try again after ${blockDuration} minute(s).`, blockedUntil: user.blockedUntil });
    }
  
    const otp = generateOTP(6); // Generate a 6-digit OTP
    const otpExpiry = new Date(Date.now() + 300000); // OTP valid for 5 minutes
    const otpRequestTime = Date.now();
    await sendOtpByEmail(email, otp); // Sending OTP by email
  
    const save = await saveOtpToDatabase(email, otp, otpExpiry, otpRequestTime);
    res.status(200).json({ ...save.toObject(), otpRequestTime });
  });
  
  


// Handle invalid OTP attempts
async function handleInvalidOtp(email) {
    const user = await User.findOne({ email });
  
    if (user) {
      user.consecutiveFailedAttempts += 1;
      if (user.consecutiveFailedAttempts >= 5) {
        user.blockedUntil = new Date(Date.now() + 3600000); // Blocked for 1 hour
        user.consecutiveFailedAttempts = 0;
      }
      console.log(user.blockedUntil)
      await user.save();
    }
  }
  
  // Function to generate JWT token
  function generateJwtToken(email) {
    // Set the payload with the user email or any other relevant data
    const payload = { email };
  
    // Sign the token with a secret key and set the expiration time
    const token = jwt.sign(payload, 'your_secret_key', { expiresIn: '1h' });
  
    return token;
  }

  async function clearOtpFromDatabase(email) {
    try {
      await User.findOneAndDelete({ email });
    } catch (error) {
      console.error('Error clearing OTP from the database:', error);
      throw error;
    }
  }
  
  
  // Express route for user login
  router.post('/login', async (req, res) => {
    const { email, otp } = req.body;
  
    // Validate the OTP and check if it is still valid (within the 5-minute window)
    const otpData = await User.findOne({ email });
    if (!otpData || otpData.otp !== otp || otpData.otpExpiry < Date.now()) {
      // Invalid OTP
      await handleInvalidOtp(email); // Implement invalid OTP handling (e.g., track consecutive wrong attempts)
  
      return res.status(401).json({ message: 'Invalid OTP.' });
    }
  
    // Clear the OTP from the database since it has been successfully used
  await clearOtpFromDatabase(email);
  
    // Generate a JWT token for the user and send it back
    const token = generateJwtToken(email); // Implement your JWT token generation logic
  
    res.json({ token });
  });
  


module.exports = router;
