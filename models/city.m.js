'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var citySchema = new Schema({
    name: {type: String, required: true},
    state: {type: String, required: true},
    createdAt: { type: Date },
updatedAt: { type: Date }
}, {  toObject: { virtuals: true }, toJSON: { virtuals: true } });

module.exports = mongoose.model('City', citySchema);

