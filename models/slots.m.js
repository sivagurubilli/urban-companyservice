'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var slotSchema = new Schema({
    startTime: String,
    endTime: String,
    day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        lowercase: true
    },
    isActive: Boolean,
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date },
updatedAt: { type: Date }
}, { 
toObject: { virtuals: true }, toJSON: { virtuals: true } });

//Hiding the secret keys
slotSchema.methods.toJSON = function () {
    const slots = this;
    const slotObject = slots.toObject();
    delete slotObject.isDeleted;
    return slotObject;
}


module.exports = mongoose.model('slots', slotSchema); 