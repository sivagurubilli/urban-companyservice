'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var otpSchema = new Schema({
  otp: String,
 bookingId:{ type: Schema.Types.ObjectId, ref: 'Booking' },
 userId:{ type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, expires: '15m' },
  updatedAt: { type: Date, expires: '15m' }
}, { 
  toObject: { virtuals: true }, toJSON: { virtuals: true } });
  

module.exports = mongoose.model('ServiceOtp', otpSchema);

