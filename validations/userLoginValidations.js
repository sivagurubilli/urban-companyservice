const Joi = require('joi');

exports.userLoginValidations = async (req, res, next) => {
    try {
const schema = Joi.object({
  
    mobileNo: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
        'string.pattern.base': 'Mobile number must be 10 digits long',
        'string.empty': 'Mobile number is required',
        'any.required': 'Mobile number is required'
    }),
    firebaseToken: Joi.string().trim(),
    role: Joi.string().trim().valid('user', 'partner').required().messages({
        'any.only': 'Role must be either "user" or "partner"',
        'any.required': 'Role is required'
    }),
    
    location: Joi.object({
        type: Joi.string().valid('Point'),
        coordinates: Joi.array().items(Joi.number()).min(2).max(2)
    })
})
    let { error } = schema.validate(req.body)
    if (error) {
        let message = error.details[0].message;
        throw { status: 400, message: message || "Payload request error" }
    }
    else next();
} catch (error) {
    next(error)
}
}

