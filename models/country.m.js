'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var countrySchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date },
updatedAt: { type: Date }
}, { toJSON: { virtuals: true } });

module.exports = mongoose.model('Country', countrySchema);

// new country
// {
//     'name' : 'India'
// }
