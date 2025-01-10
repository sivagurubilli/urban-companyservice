const Joi = require("joi");

exports.savedAddressValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            addressType: Joi.string().trim().required(),
            location: Joi.object({
                type: Joi.string().valid('Point').required(),
                coordinates: Joi.array().items(Joi.number()).min(2).max(2)
            }),
            landmark: Joi.string().trim(),
            doorNumber: Joi.string().trim().required(),
            streetName: Joi.string().trim().required(),
            city: Joi.string().trim().required(),
            state: Joi.string().trim().required(),
            pincode: Joi.string().trim().length(6).pattern(/^[0-9]{6}$/).required(), // Enforcing 6-digit format
            country: Joi.string().valid('India').default('India').required(),

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
