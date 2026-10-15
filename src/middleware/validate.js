const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const formatIssues = (issues) =>
  issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));

// Validates (and coerces) req[source] against a zod schema.
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    let input = req[source];

    if (source === 'query') {
      // Treat empty query values (?search=&status=) as "not provided".
      input = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== ''));
    }

    const result = schema.safeParse(input);
    if (!result.success) {
      const errors = formatIssues(result.error.issues);
      return next(new ApiError(400, errors[0]?.message || 'Validation failed', errors));
    }

    req[source] = result.data;
    return next();
  };

// Use with router.param('id', objectIdParam)
const objectIdParam = (req, res, next, value) =>
  /^[a-f\d]{24}$/i.test(value) && mongoose.isValidObjectId(value)
    ? next()
    : next(new ApiError(400, 'Invalid id'));

module.exports = { validate, objectIdParam };
