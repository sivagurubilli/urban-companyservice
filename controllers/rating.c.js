let appUtils = require('../utils/appUtils')
let { checkPartnerAvailableOrNotBySlotwise, fetchHoursDuration, fetchAllPartnersBySlotWiseQuery, generateAvailablePartnersQuery, splitTimeRange, capitalizeEveryInnerWord, responseJson, sendMail, sendMailTo, encryptData, isRequestDataValid, generateId, generateOtp, sendOtp } = appUtils
let { Rating, BookingHistory, Bookings } = require('../models');
const { getCurrentDateAndTime } = require('../helpers/dates');


exports.storeRating = async (req, res, next) => {
    try {
      const { bookingId, review, rating, date } = req.body;
      const userId = req.user._id;
      if (rating <= 0 || rating >5) {
        throw { status: 400, message: "Rating must be greater than 0 an less than 5" };
      }
  
      let requiredFields = {
        rating,bookingId,date
      };
      let currentDateTime = getCurrentDateAndTime();
      let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
      if (requestDataValid !== true) throw Error(requestDataValid);
    
      // Find the booking
      const bookingData = await Bookings.findOne({ _id: bookingId, isDeleted: false ,status:"completed",paymentStatus:1,partnerAccepted:true});
      if (!bookingData || String(bookingData.userId) !== String(userId)) {
        throw { status: 404, message: "Invalid bookingId or user mismatch. Try with another" };
      }
  
      // Prepare rating data
      let ratingData = {
        userId: userId,
        partnerId: bookingData.partnerId,
        bookingId: bookingId,
        rating: rating,
        date: date,
      };
  
      if (review) {
        ratingData.review = review;
      }
  
      // Check if a rating already exists for the booking
      let ratingsData = await Rating.findOne({ bookingId: bookingId });
  
      if (ratingsData) {
        // Update the existing rating
        ratingsData.rating = rating;
        ratingsData.date = date;
        if (review) {
          ratingsData.review = review;
        }
        ratingsData = await ratingsData.save();
      } else {
        // Create a new rating
        ratingsData = new Rating(ratingData);
        await ratingsData.save();
      }
  
      res.status(200).send({ success: true, message: 'Rating Submitted Successfully', data: ratingsData });
    } catch (error) {
      next(error);
    }
  };




exports.fetchRatings = async (req, res,next) => {

    try {
        let {
          
            partnerId,
            bookingId,
            date,
            id, limit, page, skip
        } = Object.assign(req.body, req.query, req.params)

               let userId = req.user._id
        limit = limit ? parseInt(limit) : 100
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)
        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (userId) dbQuery.userId = userId;
        if (partnerId) dbQuery.partnerId = partnerId;
        if (date) dbQuery.created_at = date;
        if (bookingId) dbQuery.bookingId = bookingId;

        let data = await Rating.find(dbQuery)
        if(!data) throw {status:404,message:"Unable find the ratings"}
        data = JSON.parse(JSON.stringify(data));
        let allRatings = data.reduce((sum, item) => sum + parseFloat(item.rating), 0)
        let avgRating = allRatings / data.length;
        res.status(200).send({ success: true, message: 'Rating data fetch  Successfully', totalRating: allRatings,avgRating:avgRating, reviewsCount: data.length, reviewsData: data });

    }
    catch (e) {
      next(e)
    }
}
