'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var promocodeSchema = new Schema({
  promoCode: { type: String },
  maxLimit: { type: Number },
  discount: { type: Number },
  startDate: { type: Date },
  endDate: { type: Date },
  isValid: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('promocodes', promocodeSchema);