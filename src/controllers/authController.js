'use strict';

const authService = require('../services/authService');
const { registerSchema, loginSchema, validate } = require('../validators/authValidator');

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

module.exports = { register, login, validateRegister, validateLogin };
