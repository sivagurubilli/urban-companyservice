const Joi = require("joi");

exports.editSlotDiscountValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            slotsCount: Joi.number().required().min(1).messages({
                'number.required': 'slotsCount is required',
                'number.empty': 'slotsCount must not be empty',
                'number.min': 'slotsCount must be at least 1'
            }),
            serviceId: Joi.string().required().messages({
                'string.required': 'serviceId is required',
                'string.empty': 'serviceId must not be empty'
            }),
            percentage: Joi.number().default(0).required().messages({
                'number.required': 'percentage is required',
                'number.empty': 'percentage must not be empty'
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

