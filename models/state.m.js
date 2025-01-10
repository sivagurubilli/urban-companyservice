'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var stateSchema = new Schema({
  name: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date },
  updatedAt: { type: Date }
}, { 
toObject: { virtuals: true }, toJSON: { virtuals: true } });

//Hiding the secret keys
stateSchema.methods.toJSON = function () {
  const state = this;
  const stateObject = state.toObject();

  delete stateObject.isDeleted;
  return stateObject;
}


module.exports = mongoose.model('State', stateSchema);

