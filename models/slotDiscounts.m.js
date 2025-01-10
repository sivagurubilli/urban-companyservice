'use strict';

var mongoose = require('mongoose');
var schema = mongoose.Schema;

var slotDiscountSchema = new schema({
    slotsCount: { type: Number, required: true, min: 1 },
    serviceId: { type: schema.Types.ObjectId, ref: 'services',required:true },
    percentage: { type: Number, default: 0,required:true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('slotdiscounts', slotDiscountSchema);
