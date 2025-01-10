const Joi = require("joi");

exports.updateNewMobileValidation = async (req, res, next) => {
    try {
        const schema = Joi.object({
            mobileNo: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
                'string.pattern.base': 'Mobile number must be 10 digits long',
                'string.empty': 'Mobile number is required',
                'any.required': 'Mobile number is required'
            }),
        }).unknown(false).messages({
            'object.unknown': 'Unknown field: "{#key}" is not allowed in payload'
        });
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