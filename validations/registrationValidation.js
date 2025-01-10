const Joi = require('joi');
exports.registrationValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().trim().required().messages({
                'string.empty': 'Name is required',
                'any.required': 'Name is required'
            }),
            mobileNo: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
                'string.pattern.base': 'Mobile number must be 10 digits long',
                'string.empty': 'Mobile number is required',
                'any.required': 'Mobile number is required'
            }),
            gender: Joi.string().trim().required().valid('male', 'female','others').messages({
                'any.only': 'Gender must be either "male" or "female" or "others',
                'string.empty': 'Gender is required',
                'any.required': 'Gender is required'
            }),
            email: Joi.string().trim().email().messages({
                'string.email': 'Invalid email format',

            }),
            address: Joi.object({
                doorNumber: Joi.string().trim(),
                streetName: Joi.string().trim(),
                city: Joi.string().trim(),
                state: Joi.string().trim(),
                pincode: Joi.string().trim(),
                country: Joi.string().trim()
            }),
            
            firebaseToken: Joi.string().trim(),
            role: Joi.string().trim().valid('user', 'partner').required().messages({
                'any.only': 'Role must be either "user" or "partner"',
                'any.required': 'Role is required'
            }),
            imageUrl: Joi.string().trim(),
            dob: Joi.date(),
            about: Joi.string().trim(),
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

