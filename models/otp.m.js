'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var otpSchema = new Schema({
  mobileNo: { type: String },
  otp: String,
  role: { type: String, enum: ['user', 'admin', 'partner'] },
  createdAt: { type: Date, expires: '15m', default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Otp', otpSchema);

