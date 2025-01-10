'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userpromocodeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  promoCodeId: { type: Schema.Types.ObjectId, ref: 'promocodes' },
  createdAt: { type: Date },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('userpromocodes', userpromocodeSchema);