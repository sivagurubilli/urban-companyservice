'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DocumentSchema = new Schema({

    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    aadharImageUrl: String,
    pancardImageUrl: String,
    isDeleted: Boolean,
    isDocumentsVerified: Boolean,
    createdAt: { type: Date },
    updatedAt: { type: Date }
}, {
toObject: { virtuals: true }, toJSON: { virtuals: true } });


//Hiding the secret keys
DocumentSchema.methods.toJSON = function () {
    const documents = this;
    const documentObject = documents.toObject();
    delete documentObject.isDeleted;
    return documentObject;
}

module.exports = mongoose.model('uploaddocuments', DocumentSchema); 