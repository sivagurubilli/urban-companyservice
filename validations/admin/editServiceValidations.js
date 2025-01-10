const Joi = require("joi");

exports.editServiceValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().trim().required(),
    isActive: Joi.boolean().default(true),
    mediaLink: Joi.array().items(),
    pricePerHour: Joi.number().required(),
    gstPercent: Joi.number().required(),
    categoryId: Joi.string().trim().required(),
    platformCostPercent: Joi.number().default(0),
    slotsLimit: Joi.number().min(1).required().messages({
        'number.base': 'slotsLimit must be a number',
        'number.required': 'slotsLimit is required',
        'number.empty': 'slotsLimit must not be empty',
        'number.min': 'slotsLimit must be at least 1'
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

