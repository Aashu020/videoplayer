const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Signup
const signup = async (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('Email is already in use');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashed });

  try {
    await user.save();
    res.status(201).send('User created');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Email:', email, 'Password:', password);  // Debugging line

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send('Invalid credentials - email not found');
    }

    // Check if password matches
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send('Invalid credentials - password mismatch');
    }

    // Create JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-jwt-secret', // Use a proper secret key
      { expiresIn: '1h' } // You can adjust expiration time as needed
    );

    // Send the token in response (along with any user details if necessary)
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
};

module.exports = { signup, login };
