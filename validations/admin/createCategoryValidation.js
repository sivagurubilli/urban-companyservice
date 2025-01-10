const Joi = require("joi");

exports.createCategoeryValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().required().messages({
                'string.required': 'name is required',
                'string.empty': 'name must not be empty'
            }),
            logo: Joi.string().required().messages({
                'string.required': 'logo is required',
                'string.empty': 'logo must not be empty'
            }),
            status: Joi.number().integer().required().messages({
                'string.required': 'status is required',
                'string.empty': 'status must not be empty'
            }),
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

