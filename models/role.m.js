'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var roleSchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date },
updatedAt: { type: Date }
}, { 
toObject: { virtuals: true }, toJSON: { virtuals: true } });

module.exports = mongoose.model('Role', roleSchema);
