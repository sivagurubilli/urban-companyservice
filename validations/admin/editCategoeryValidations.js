const Joi = require("joi");

exports.editCategoeryValidations = async (req, res, next) => {
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
            id: Joi.string().required().messages({
                'string.required': 'id is required',
                'string.empty': 'id must not be empty'
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

