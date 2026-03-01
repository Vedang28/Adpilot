'use strict';

const express = require('express');
const { register, login, validateRegister, validateLogin, forgotPassword, resetPassword } = require('../controllers/authController');
const { demoLogin } = require('../controllers/demoController');

const router = express.Router();

router.post('/register',        validateRegister, register);
router.post('/login',           validateLogin,    login);
router.post('/forgot-password',                   forgotPassword);
router.post('/reset-password',                    resetPassword);
router.post('/demo-login',                        demoLogin); // public — no auth middleware

module.exports = router;
