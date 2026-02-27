'use strict';

const { failure } = require('../common/response');

/**
 * Factory: returns Express middleware that validates req.body (or other targets)
 * against a Joi schema.
 *
 * Usage: router.post('/', validate(mySchema), controller)
 */
function validate(schema, target = 'body') {
  return function (req, res, next) {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return failure(res, message, 422, 'VALIDATION_ERROR');
    }

    req[target] = value;
    next();
  };
}

module.exports = validate;
