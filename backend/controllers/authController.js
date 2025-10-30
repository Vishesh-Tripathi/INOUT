import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const register = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username, email, and password are required'
    });
  }

  // Check if user already exists
  const existingUserByUsername = await User.findByUsername(username);
  if (existingUserByUsername) {
    return res.status(409).json({
      success: false,
      message: 'Username already exists'
    });
  }

  const existingUserByEmail = await User.findByEmail(email);
  if (existingUserByEmail) {
    return res.status(409).json({
      success: false,
      message: 'Email already exists'
    });
  }

  // Create user
  const user = await User.create({ username, email, password, role });
  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  // console.log(username,password);


  // Validate required fields
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  // Validate user credentials
  const user = await User.validateCredentials(username, password);
  // console.log(user)
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }

  // Generate token
  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toPublicJSON(),
      token
    }
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  // Verify current password
  const isValidPassword = await User.validateCredentials(req.user.username, currentPassword);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  const user = await User.findById(req.user._id);
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is required for verification'
    });
  }

  // Verify current password
  const isValidPassword = await User.validateCredentials(req.user.username, currentPassword);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  const user = await User.findById(req.user._id);
  let updatedFields = [];

  // Update username if provided
  if (newUsername && newUsername !== user.username) {
    // Check if username is already taken
    const existingUser = await User.findByUsername(newUsername);
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }
    user.username = newUsername;
    updatedFields.push('username');
  }

  // Update password if provided
  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }
    user.password = newPassword;
    updatedFields.push('password');
  }

  if (updatedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid fields to update'
    });
  }

  await user.save();

  res.json({
    success: true,
    message: `${updatedFields.join(' and ')} updated successfully`,
    data: {
      user: user.toPublicJSON()
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  // In a more sophisticated setup, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
});