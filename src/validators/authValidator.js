'use strict';

const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  teamName: Joi.string().trim().min(1).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

function validate(schema) {
  return function (req, res, next) {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return res.status(422).json({ success: false, error: { message } });
    }
    req.body = value;
    next();
  };
}

module.exports = { registerSchema, loginSchema, validate };
