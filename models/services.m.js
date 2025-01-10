'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var servicesSchema = new Schema({
    name: { type: String, trim: true,required:true },
    isActive: { type: Boolean, default: true },
    mediaLink: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
    pricePerHour:{type:Number,required:true},
    gstPercent: {type:Number,required:true},
    categoryId: { type: Schema.Types.ObjectId, ref: "Categories",required:true },
    platformCostPercent: { type: Number, default: 0 },
    slotsLimit: { type: Number, default: 0, required: true ,min: 1},
    createdAt: { type: Date },
    updatedAt: { type: Date }
}, { toObject: { virtuals: true }, toJSON: { virtuals: true } });


//Hiding the secret keys
servicesSchema.methods.toJSON = function () {
    const services = this;
    const serviceObject = services.toObject();
    delete serviceObject.isDeleted;
    return serviceObject;
}

module.exports = mongoose.model('services', servicesSchema);