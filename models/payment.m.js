'use strict';

var mongoose = require('mongoose');
var schema = mongoose.Schema;

var paymentSchema = new schema({
  userId: { type: schema.Types.ObjectId, ref: 'users' },
  orderId: { type: String, required: true },
  transactionNo: { type: String },
  transactionPaymentNo: { type: String},
  transactionSignature: { type: String },
  addressId: { type: schema.Types.ObjectId, ref: "savedAddress" },
  discount: { type: Number },
  totalPrice: { type: Number, required: true },
  gstPercent :{ type: Number, required: true },
  gstAmount : { type: Number, required: true },
  invoiceNumber: { type: String,  unique: true, sparse: true },
  invoiceUrl: { type: String},
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ['created', 'paid', 'refunded'] },
  paymentStatus: 0,
  amountPaid: { type: String },
  promoCodeId:{ type: schema.Types.ObjectId, ref: 'promocodes' },
  promoCodeDiscount:{ type: Number},
  amountDue: { type: String },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('payments', paymentSchema);
