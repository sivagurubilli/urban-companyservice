const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const bookingSchema = new mongoose.Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: "users" },
    slots: [{ type: Schema.Types.ObjectId, ref: "slots", required: true }],
    serviceId: { type: Schema.Types.ObjectId, ref: "services", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "categories", required: true },
    addressId: { type: Schema.Types.ObjectId, ref: "savedAddress" },
    date: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    status: { type: String, enum: ['partnerassigned', 'confirmed', 'completed','cancelled', 'addedtocart'], default: 'addedtocart' },
    partnerAccepted:{ type: Boolean, default:false },
    totalPriceWithoutGst: { type: Number, required: true },
    gstPercent: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    discount: { type: Number, required: true },
    slotsDiscount: { type: Number, required: true },
    slotsPercentage: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    groupBooking: { type: Boolean, required: true },
    transactionNo: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: "payments" },
    paymentStatus: { type: Number },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

const Booking = mongoose.model('bookings', bookingSchema);

module.exports = Booking;
