'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var supportDocumentSchema = new Schema({

    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    aadharNumber: String,
    pancardNumber: String,
    liveImageUrl: String,
    covidCertificateUrl: String,
    aadharFrontImageUrl: String,
    addharBackImageUrl: String,
    pancardImageUrl: String,
    comments: String,
    isDeleted: Boolean,
    isDocumentsVerified: Boolean,
    comments: String,
    createdAt: { type: Date },
    updatedAt: { type: Date }
}, {
toObject: { virtuals: true }, toJSON: { virtuals: true } });


//Hiding the secret keys
supportDocumentSchema.methods.toJSON = function () {
    const documents = this;
    const documentObject = documents.toObject();

    delete documentObject.isDeleted;
    return documentObject;
}

module.exports = mongoose.model('supportdocuments', supportDocumentSchema); 