
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var cronTaskSchema = new Schema({
    time: String,
    data: String,
    date: String,
    jobNumber: String,
    tag: String,
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Hc_Consultation' },
    fitnessChallengeId: { type: Schema.Types.ObjectId, ref: 'FitnessChallenge' },
    createdAt: { type: Date },
updatedAt: { type: Date }
}, { toObject: { virtuals: true }, toJSON: { virtuals: true } });

module.exports = mongoose.model('CronTask', cronTaskSchema);