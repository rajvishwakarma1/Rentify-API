const Joi = require('joi');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const data = req[property];
    const { error, value } = schema.validate(data, { abortEarly: false, allowUnknown: false, stripUnknown: true });
    if (error) {
      error.isJoi = true;
      return next(error);
    }
    req[property] = value;
    return next();
  };
}

const patterns = {
  id: () => Joi.string().trim().regex(/^[a-f\d]{24}$/i).message('must be a valid 24-char hex ObjectId'),
};

module.exports = { validate, patterns };
