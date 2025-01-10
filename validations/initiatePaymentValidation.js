const Joi = require('joi');

exports.initiatePaymentValidations = async (req, res, next) => {
    try {
        const schema = Joi.object({
            addressId : Joi.string().trim(),
            bookingId :Joi.array().items(Joi.string().trim()),
            discount: Joi.number().integer().required().messages({
                'number.integer': 'Discount must be an integer',
                'number.base': 'Please enter a valid discount',
                'number.required': "Discount is required",
                'number.empty': 'Please enter your disocount',
            }),
            totalPrice: Joi.number().integer().required().messages({
                'number.integer': 'Total Price must be an integer',
                'number.base': 'Please enter a valid Total Price',
                'number.required': "Total Price is required",
                'number.empty': 'Please enter your Total Price',
            }),
            gstAmount: Joi.number().integer().required().messages({
                'number.integer': 'Gst Amount must be an integer',
                'number.base': 'Please enter a valid Gst Amount',
                'number.required': "Gst Amount is required",
                'number.empty': 'Please enter your Gst Amount',
            }),
            gstPercent: Joi.number().integer().required().messages({
                'number.integer': 'Gst Percent must be an integer',
                'number.base': 'Please enter a valid Gst Percent',
                'number.required': "Gst Percent is required",
                'number.empty': 'Please enter your Gst Percent',
            }),
        })
        let { error } = schema.validate(req.body)
        if (error) {
            let message = error.details[0].message;
             throw { status: 400, message: message || "Payload request error" }}
        else next();
    } catch (error) {
        next(error)
    }
}
