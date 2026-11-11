/**
 * User & Settings Controller
 * 
 * Handles user profile retrieval, updating profile details (name, email),
 * and secure password updates with current password verification.
 */

const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

/**
 * Get user profile details
 * Route: GET /api/users/me
 */
async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        cashAccount: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        cashAccount: user.cashAccount ? {
          availableBalance: parseFloat(user.cashAccount.availableBalance.toString()),
          reservedBalance: parseFloat(user.cashAccount.reservedBalance.toString()),
          initialBalance: parseFloat(user.cashAccount.initialBalance.toString()),
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user name and email
 * Route: PATCH /api/users/me
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    const dataToUpdate = {};

    if (name && name.trim()) {
      dataToUpdate.name = name.trim();
    }

    if (email && email.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address.',
        });
      }

      // Check uniqueness if email changed
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing && existing.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'This email is already in use by another account.',
        });
      }

      dataToUpdate.email = normalizedEmail;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field (name or email) to update.',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change account password
 * Route: PATCH /api/users/me/password
 */
async function updatePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current password and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.',
      });
    }

    // Verify current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
};

