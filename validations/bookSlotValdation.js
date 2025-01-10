const Joi = require("joi");

exports.bookSlotValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            categoryId: Joi.string().required().trim(),
            slotId: Joi.array().items(Joi.string().trim()).required(),
            serviceId: Joi.string().required().trim(),
            date: Joi.date().iso().required(),
            location: Joi.object({
            coordinates: Joi.array().items(Joi.number()).min(2).max(2)
            })
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


exports.editbookSlotValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            categoryId: Joi.string().required().trim(),
            slotId: Joi.array().items(Joi.string().trim()).required(),
            serviceId: Joi.string().required().trim(),
            date: Joi.date().iso().required(),
            bookingId: Joi.string().required().trim(),
            location: Joi.object({
            coordinates: Joi.array().items(Joi.number()).min(2).max(2)
            })
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
