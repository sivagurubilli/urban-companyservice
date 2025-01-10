'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var skillSchema = new Schema({
    name: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    mediaLink: [{ type: String }],
    serviceId: { type: Schema.Types.ObjectId, ref: 'Services' },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date },
    updatedAt: { type: Date }
}, { 
toObject: { virtuals: true }, toJSON: { virtuals: true } });



//Hiding the secret keys
skillSchema.methods.toJSON = function () {
    const skills = this;
    const skillObject = skills.toObject();
    delete skillObject.isDeleted;
    return skillObject;
}

module.exports = mongoose.model('skills', skillSchema); 