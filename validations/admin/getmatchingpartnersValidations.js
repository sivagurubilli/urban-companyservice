const Joi = require("joi");

exports.getmatchingValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
          
            longitude: Joi.number().required().messages({
                'longitude.required': 'longitude is required',
                'longitude.empty': 'longitude must not be empty'
            }),
            latitude: Joi.number().required().messages({
                'latitude.required': 'latitude is required',
                'latitude.empty': 'latitude must not be empty'
            }),
            slots :Joi.array().items(Joi.string().trim()).required(),

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

