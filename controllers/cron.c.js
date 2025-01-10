
let appUtils = require('../utils/appUtils')
let { fetchHoursDuration, fetchAllPartnersBySlotWiseQuery, generateAvailablePartnersQuery, splitTimeRange, capitalizeEveryInnerWord, responseJson, sendMail, sendMailTo, encryptData, isRequestDataValid, generateId, generateOtp, sendOtp } = appUtils
let { Coupons, Bookings, PromoCode, Slots, State, SupportDocuments, User, Role, Otp, Services } = require('../models')
const { generateDayOfWeek, otpExpiryTime, sendSms } = require('../utils/appUtils');
const moment = require('moment')
const schedule = require('node-schedule');
let { getCurrentDateAndTime } = require("../helpers/dates");


//Here It will run for every 30 minutes
exports.runCouponsCronJob = () => {
    console.log("Coupons Cron Job has started")
    schedule.scheduleJob('*/30 * * * *', async () => {
        console.log('Running a coupons cron job every 30 minutes');
        // let currentDate = moment(new Date()).format('YYYY-MM-DD');
        let currentDate = new Date();

        console.log({ currentDate });

        let data = await promoCode.find({ isDeleted: false })
        for (let x of data) {
            if (currentDate.getTime() > x.startDate.getTime() && currentDate.getTime() < x.endDate.getTime()) x.isActive = true
            else x.isActive = false
            console.log({ isActive: x.isActive })
            await promoCode.findOneAndUpdate({ _id: x._id }, { $set: { isActive: x.isActive } })
        }
        console.log('Coupons Cron Job has been completed');
    });
}


//Here It will run for every 30 minutes
exports.runDeleteExpiredCartsJob = () => {
    console.log("Delete Cart Cron Job has started")
    schedule.scheduleJob('*/15 * * * *', async () => {
        console.log('Running a coupons cron job every 15 minutes');
        let currentDateTime = getCurrentDateAndTime();

        // Calculate the date that is 15 minutes ahead of the current date
        const fifteenMinutesBeyond = new Date(currentDateTime - 15 * 60000);
        console.log({ fifteenMinutesBeyond })
        let bookingIds = await Bookings.find({ status: "addedtocart", updatedAt: { $lte: fifteenMinutesBeyond } }).distinct('_id');
        console.log({ Idslength: bookingIds.length })
        let data = await Bookings.deleteMany({ _id: { $in: bookingIds } });
        console.log('Delete Cart Cron Job has been completed');
    });
}