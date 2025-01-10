const mongoose = require('mongoose');

// Define schema for savedAddress model
const savedAddressSchema = new mongoose.Schema({
    addressType: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number], default: undefined }
    },
    landmark:{type:String},
    doorNumber: { type: String, required: true },
    streetName: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India', enum: ['India'] },
    isDeleted: { type: Boolean, default: false },
    createdAt: {type: Date},
    updatedAt: {type: Date}
});
const SavedAddress = mongoose.model('savedAddress', savedAddressSchema);
module.exports = SavedAddress;
