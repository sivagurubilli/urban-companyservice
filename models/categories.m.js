'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var categorySchema = new Schema({
  name: { type: String, required: true },
  logo: { type: String, required: true },
  status: { type: Number, required: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date },
  updatedAt: { type: Date }
}, {
  toObject: { virtuals: true }, toJSON: { virtuals: true }
});

module.exports = mongoose.model('categories', categorySchema);