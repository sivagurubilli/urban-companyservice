'use strict';

var mongoose = require('mongoose');
var schema = mongoose.Schema;

var couponSchema = new schema({
    couponCode: { type: String, trim: true },
    description: { type: String },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: false },
    discountPercent: Number,
    maximumTimesToUse: Number,
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date },
updatedAt: { type: Date }
}, {  toObject: { virtuals: true }, toJSON: { virtuals: true } });

//Hiding the secret keys
couponSchema.methods.toJSON = function () {
    const coupons = this;
    const couponObject = coupons.toObject();

    delete couponObject.isDeleted;
    return couponObject;
}

module.exports = mongoose.model('coupons', couponSchema);