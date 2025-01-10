'use strict';

var mongoose = require('mongoose');
var schema = mongoose.Schema;

var userSchema = new schema({
  name: { type: String, trim: true },
  mobileNo: { type: String, index: true, trim: true },
  gender: { type: String, trim: true, lowercase: true },
  isVerified: { type: Boolean, default: false },
  email: String,
  isDocumentsUploaded: Boolean,
  isDocumentsVerified: Boolean,
  address: {
    doorNumber: String,
    streetName: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  role: { type: String, required: true, enum: ["user", "partner"] },
  imageUrl: String,
  dob: Date,
  about: String,
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number], default: undefined }
  },
  firebaseToken: String,
  isAdminApproved: Boolean,
  availability: {
    type: [{
      slotId: String,
      startTime: String,
      endTime: String,
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        lowercase: true
      },
      isActive: Boolean
    }],
    sparse: true
  },
  isAdminApproved: Boolean,
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date },
  updatedAt: { type: Date }

}, {
  toObject: { virtuals: true }, toJSON: { virtuals: true }
});

userSchema.index({ "location.coordinates": "2dsphere" })


//Hiding the secret keys
userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.isDeleted;
  return userObject;
}

module.exports = mongoose.model('users', userSchema);



