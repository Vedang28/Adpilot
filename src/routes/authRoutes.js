'use strict';

const express = require('express');
const { register, login, validateRegister, validateLogin, forgotPassword, resetPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register',        validateRegister, register);
router.post('/login',           validateLogin,    login);
router.post('/forgot-password',                   forgotPassword);
router.post('/reset-password',                    resetPassword);

module.exports = router;
