const Joi = require("joi");

exports.createSlotsValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            startTime: Joi.string().required(),
            endTime: Joi.string().required(),
            day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
            isActive: Joi.boolean().required(),
        
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

