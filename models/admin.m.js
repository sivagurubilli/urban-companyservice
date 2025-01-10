'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:{ type: String },
  isDeleted:{type:Boolean,default:false},
  createdAt: { type: Date },
  updatedAt: { type: Date }
}, {
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});


const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;