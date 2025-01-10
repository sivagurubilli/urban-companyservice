'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var notificationSchema = new Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date },
updatedAt: { type: Date }
}, { toObject: { virtuals: true }, toJSON: { virtuals: true } });

module.exports = mongoose.model('Notification', notificationSchema);