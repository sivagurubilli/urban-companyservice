const Joi = require("joi");


exports.verifyNewMobileOtpValidation = async (req, res, next) => {
    try {
        const schema = Joi.object({
            mobileNo: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
                'string.pattern.base': 'Mobile number must be 10 digits long',
                'string.empty': 'Mobile number is required',
                'any.required': 'Mobile number is required'
            }),
            otp: Joi.string().trim().required().pattern(/^\d+$/).min(7).max(7).messages({
                'string.pattern.base': 'Please enter a valid otp',
                'string.empty': 'Please enter otp',
                'string.min': 'Otp must have exactly 7 digits',
                'string.max': 'Otp must have exactly 7 digits'
            })
        }).unknown(false)
            .messages({
                'object.unknown': 'Unknown field: "{#key}" is not allowed in payload'
            });

        //Validating Schema
        let { error } = schema.validate(req.body);
        if (error) {
            let message = error.details[0].message;
            throw { status: 400, message: message || "Payload request error" }
        }
        else next();
    } catch (error) {
        next(error)
    }
}