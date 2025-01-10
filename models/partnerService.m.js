'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const partnerSeviceSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: "services" },
  userId: { type: Schema.Types.ObjectId, ref: "users" },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date },
  updatedAt: { type: Date }
}, {
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

const PartnerSevice = mongoose.model('PartnerService', partnerSeviceSchema);
module.exports = PartnerSevice;