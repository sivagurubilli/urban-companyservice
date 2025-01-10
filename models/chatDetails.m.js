'use strict';

var mongoose = require('mongoose');

var schema = mongoose.Schema;

var chatDetailsSchema = new schema({
	channelId: { type: String },
	userId: { type: String },
	expertId: { type: String },
	createdAt: { type: Date },
updatedAt: { type: Date }
}, {});

module.exports = mongoose.model('Chat', chatDetailsSchema);

// let testData = {
// 	"channelId":"61fb80d21ebf134380f14b31",
//     "userId":"91gb90d21ebg134380f14b32",
//     "expertId":"91gb90d21ebg134380f14b32",
// }