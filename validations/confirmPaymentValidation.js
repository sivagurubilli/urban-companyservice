const Joi = require('joi');

exports.confirmPaymentValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
         
            transactionNo: Joi.string().trim().required()
            .messages({
                'string.required': 'Transaction number is required',
                'string.empty': 'Please provide valid transaction number'
            }),
            transactionPaymentNo: Joi.string().trim().required()
            .messages({
                'string.required': 'Transaction Payment number is required',
                'string.empty': 'Please provide valid transaction payment number'
            }),
            transactionSignature: Joi.string().trim().required()
            .messages({
                'string.required': 'transactionSignature is required',
                'string.empty': 'Please provide valid transaction signature'
            })
        })
        let { error } = schema.validate(req.body)
        if (error) {
            let message = error.details[0].message;
            throw { status: 400, message: message || "Payload request error" }
        }
        else next();
    } catch (error) {
        next(error)
    }
}
