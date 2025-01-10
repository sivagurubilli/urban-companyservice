'use strict';

var mongoose = require('mongoose');
var schema = mongoose.Schema;

var ratingSchema = new schema({
    userId: { type: schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: schema.Types.ObjectId, ref: 'bookings' },
    partnerId: { type: schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, required: true},
    review: String,
    date: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date },
updatedAt: { type: Date }
}, {
 toObject: { virtuals: true }, toJSON: { virtuals: true } });

//Hiding the secret keys
ratingSchema.methods.toJSON = function () {
    const rating = this;
    const ratingObject = rating.toObject();
    delete ratingObject.isDeleted;
    return ratingObject;
}

module.exports = mongoose.model('ratings', ratingSchema);