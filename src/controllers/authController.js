'use strict';

const authService = require('../services/authService');
const { registerSchema, loginSchema, validate } = require('../validators/authValidator');
const logger = require('../config/logger');

const validateRegister = validate(registerSchema);
const validateLogin = validate(loginSchema);

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: { message: 'email is required' } });
    // Always succeeds from the caller's perspective (prevents email enumeration)
    await authService.forgotPassword(email).catch((err) => {
      logger.error('forgotPassword error', { err: err.message });
    });
    return res.status(200).json({ success: true, data: { message: 'If that email exists, a reset link has been sent.' } });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: { message: 'token and password are required' } });
    }
    await authService.resetPassword(token, password);
    return res.status(200).json({ success: true, data: { message: 'Password updated successfully.' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, validateRegister, validateLogin, forgotPassword, resetPassword };
