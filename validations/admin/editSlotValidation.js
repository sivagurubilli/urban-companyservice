const Joi = require("joi");

exports.editSlotsValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            startTime: Joi.string().required(),
            endTime: Joi.string().required(),
            day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
            isActive: Joi.boolean().required(),
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

