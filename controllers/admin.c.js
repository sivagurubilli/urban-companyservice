const axios = require("axios");
let { privateKey, adminEmail } = require("../config/config");
let appUtils = require("../utils/appUtils");
let { getCurrentDateAndTime } = require("../helpers/dates");
let { generateBlankProfileImages, isRequestDataValid, generatePromo } =
  appUtils;
let {
  Slots,
  SlotDiscounts,
  Bookings,
  PromoCode,
  User,
  Payment,
  UploadDocuments,
  Rating
} = require("../models");
const Admin = require("../models/admin.m");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const component = "auth.c";
const { otpExpiryTime, sendSms } = require("../utils/appUtils");
const { generateAccessToken } = require("../middlewares/authentication.mlw");
const moment = require("moment");

exports.adminLogin = async (req, res, next) => {
  try {
    let { username, password, firebaseToken } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      username,
      password,
    };
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    let dbQuery = {};
    // if (email) dbQuery.email = email;
    if (username) dbQuery.username = username;
    let admin = await Admin.findOne(dbQuery);
    if (!admin || admin.isDeleted == true)
      throw {
        statusCode: 401,
        message: "admin not found in our records",
      };

    var passwordIsValid = await bcrypt.compare(password, admin.password);
    if (!passwordIsValid)
      throw {
        statusCode: 401,
        message: "Invalid Password!",
      };

    accessToken = generateAccessToken(admin);

    let adminRes = {
      username: admin.username,
      id: admin.id,
      role: admin.role,
      accessToken,
      isDeleted: admin.isDeleted,
    };
    res.status(200).send({
      status: 1,
      success: true,
      message: "Logged-in successfully",
      data: adminRes,
    });
  } catch (error) {
    next(error);
  }
};

exports.addSlotDiscount = async (req, res, next) => {
  try {
    let { slotsCount, serviceId, percentage } = Object.assign(
      req.body,
      req.query,
      req.params
    );
    let requiredFields = {
      slotsCount,
      serviceId,
      percentage,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    if (slotsCount < 1 || slotsCount > 20)
      throw {
        status: 400,
        message: "slotsCount should be minimum 1 and maximum 20",
      };

    let body = {
      slotsCount,
      serviceId,
      percentage,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
    };

    const slotsDiscountExits = await SlotDiscounts.find({
      serviceId: serviceId,
    });
    if (slotsDiscountExits.length > 0) {
      throw {
        status: 409,
        message: "Slot discount already added for this service ID",
      };
    }
    const data = await SlotDiscounts.create(body);

    if (!data)
      throw {
        status: 500,
        message: "Unable to store slots discount. Try again",
      };
    res.status(200).send({
      status: 1,
      success: true,
      message: "Adding slots discount success",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.editSlotDiscount = async (req, res, next) => {
  try {
    let { slotsCount, serviceId, id, percentage } = Object.assign(
      req.body,
      req.query,
      req.params
    );
    let requiredFields = {
      slotsCount,
      serviceId,
      id,
      percentage,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    if (slotsCount < 1 || slotsCount > 20)
      throw {
        status: 400,
        message: "slotsCount should be minimum 1 and maximum 20",
      };

    let slotsDiscountsData = {
      slotsCount,
      serviceId,
      percentage,
      updatedAt: currentDateTime,
    };
    const slotsDiscountExits = await SlotDiscounts.find({
      serviceId: serviceId,
      slotsCount: slotsCount,
      percentage: percentage,
    });
    if (slotsDiscountExits.length > 0) {
      throw {
        status: 409,
        message: "Slot discount already added for this service ID ",
      };
    }
    let data = await SlotDiscounts.findOneAndUpdate(
      { _id: id,isDeleted:false },
      { $set: slotsDiscountsData, updatedAt: currentDateTime, },
      { new: true }
    );
    if (!data)
      throw {
        status: 500,
        message: "Unable to update slots discount. Try again",
      };
    res.status(200).send({
      status: 1,
      success: true,
      message: "Update slots discount success",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSlotDiscount = async (req, res, next) => {
  try {
    let { id, limit, page, skip } = Object.assign(req.query);
    //Paginations
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    let filter = { isDeleted:false};
    if (id) {
     
      filter._id = id;
    }

    skip = (page - 1) * limit;

    // Query the database with pagination options
    const discountData = await SlotDiscounts.find(filter)
      .populate("serviceId")
      .skip(skip)
      .limit(limit);
    const totalDataCount = await SlotDiscounts.countDocuments(filter);
    let responseData = {
      status: 1,
      success: true,
      message: "Slots discount data has been fetched successfully",
      data: discountData,
      dataCount: discountData.length,
      totalDataCount: totalDataCount,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.deleteSlotDiscount = async (req, res, next) => {
  try {
    let { id } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      id,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const result = await SlotDiscounts.deleteOne({ _id: id });
    if (!result)
      throw {
        status: 500,
        message: "Unable delete the Slot Discount. Try again.",
      };

    res.status(200).send({
      status: 1,
      success: true,
      message: "Delete Slot discount success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getallbookings = async (req, res, next) => {
  try {
    let { id, limit, page, skip } = req.query;
    // Paginations
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    let filter = {
      isDeleted: false,
      paymentStatus: 1,
      // status: "confirmed",
      // partnerAccepted: false,
    };
    if (id) {
      filter._id = id;
    }

    skip = (page - 1) * limit;

    // Query the database with pagination options
    const bookingsData = await Bookings.find(filter)
      .populate("serviceId")
      .populate("userId")
      .populate([{ path: "slots" }])
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });

    const totalDataCount = await Bookings.countDocuments(filter);

    if (!bookingsData) {
      throw {
        status: 500,
        message: "Bookings data could not be retrieved. Try again",
      };
    }

    // Fetch ratings separately if they are in a different collection
    const bookingIds = bookingsData.map(booking => booking._id);
    const ratings = await Rating.find({ bookingId: { $in: bookingIds } });

    // Combine bookings and ratings
    const bookingsDataWithRatings = bookingsData.map(booking => {
      const rating = ratings.find(rating => rating.bookingId.equals(booking._id));
      return { ...booking.toObject(), rating: rating ? rating.ratingValue : 0 }; // Assume ratingValue is the field storing the rating
    });

    let responseData = {
      status: 1,
      success: true,
      message: "Bookings data has been fetched successfully",
      data: bookingsDataWithRatings,
      dataCount: bookingsDataWithRatings.length,
      totalDataCount: totalDataCount,
    };

    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.getmatchingpartner = async (req, res, next) => {
  try {
    let { slots, latitude, longitude } = Object.assign(req.query);
    let requiredFields = {
      slots,
      latitude,
      longitude,
    };
    slots = JSON.parse(slots);
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    if (!slots || !Array.isArray(slots)) {
      return res
        .status(400)
        .send({ status: 0, message: "Slots must be provided as an array" });
    }
    const userLocation = {
      type: "Point",
      coordinates: [parseFloat(latitude), parseFloat(longitude)],
    };
    const maxDistanceMeters = 500 * 100;
    const bookedPartnerIds = await Bookings.find({
      $or: [
        { status: "partnerassigned" },
        { status: "cancelled" },
        {status:"completed"},
      ],
     
      slots: { $in: slots }
    }).distinct("partnerId");

    
    // Find users within the specified distance and with matching availability slots
    const partnersdata = await User.aggregate([
      {
        $geoNear: {
          near: userLocation,
          distanceField: "distance",
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: {
            isDeleted: false,
            role: "partner",
            isVerified: true,
            availability: { $ne: [] },
            "availability.slotId": { $all: slots },
            _id: { $nin: bookedPartnerIds },
          },
          key: "location.coordinates",
        },
      },
      {
        $addFields: {
          distanceKm: { $divide: ["$distance", 1000] },
        },
      },
      {
        $sort: { distanceKm: 1 },
      },
    ]);

    const responseData = {
      status: 1,
      success: true,
      message: "Partners data has been fetched successfully",
      data: partnersdata,
      dataCount: partnersdata.length,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.allotPartner = async (req, res, next) => {
  try {
    const { bookingId, partnerId } = Object.assign(
      req.body,
      req.query,
      req.params
    );
    let requiredFields = {
      bookingId,
      partnerId,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const updateBooking = await Bookings.findOneAndUpdate(
      { _id: bookingId, isDeleted:false },
      {
        $set: {
          partnerId: partnerId,
          status: "partnerassigned",
          updatedAt: currentDateTime,
        },
      },
      { new: true }
    );

    if (!updateBooking)
      throw {
        status: 500,
        message: "Unable to update the partner id to booking details",
      };

    const responseData = {
      status: 1,
      success: true,
      message: "Allocated to partner successfully",
      data: updateBooking,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      bookingId,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const updateBooking = await Bookings.findOneAndUpdate(
      { _id: bookingId , isDeleted:false},
      { $set: { status: "cancelled", updatedAt: currentDateTime } },
      { new: true }
    );
    if (!updateBooking)
      throw { status: 500, message: "Unable to cancel the booking." };

    const responseData = {
      status: 1,
      success: true,
      message: "Booking  has been cancelled successfully",
      data: updateBooking,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.verifyPartnerProfile = async (req, res, next) => {
  try {
    const { userId } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      userId,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const verifiedpartner = await User.findOneAndUpdate(
      { _id: userId, isDeleted:false },
      { $set: { isVerified: true, updatedAt: currentDateTime } },
      { new: true }
    );
    const verifiedDocuments = await UploadDocuments.findOneAndUpdate(
      { userId: userId },
      { $set: { isDocumentsVerified: true, updatedAt: currentDateTime } },
      { new: true }
    );
    console.log(verifiedpartner, verifiedDocuments);
    if (!verifiedDocuments || !verifiedpartner)
      throw { status: 500, message: "Unable to verify the partner." };

    const responseData = {
      status: 1,
      success: true,
      message: "partner verified successfully",
      data: verifiedDocuments,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.getAllPartnerdetails = async (req, res, next) => {
  try {
    let { id, limit, page, skip } = Object.assign(req.query);
    //Paginations
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    let filter = { isDeleted: false, role: "partner" };
    if (id) {
      filter._id = id;
    }

    skip = (page - 1) * limit;

    const PartnerData = await User.find(filter).skip(skip).limit(limit).sort({updatedAt:-1});
    const totalDataCount = await User.countDocuments(filter);

    const responseData = {
      status: 1,
      success: true,
      message: "partner data fetched successfully",
      data: PartnerData,
      dataCount: PartnerData.length,
      totalDataCount: totalDataCount,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.getPartenerDocuments = async (req, res, next) => {
  try {
    let { id, userId, limit, page, skip } = Object.assign(req.query);
    //Paginations
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    let filter = { isDeleted: false };
    if (userId) {
      filter.userId = userId;
    }
    if (id) {
      filter._id = id;
    }
    skip = (page - 1) * limit;
    const PartnerData = await UploadDocuments.find(filter)
      .skip(skip)
      .limit(limit);
    const totalDataCount = await UploadDocuments.countDocuments(filter);

    const responseData = {
      status: 1,
      success: true,
      message: "Documents fetched successfully",
      data: PartnerData,
      dataCount: PartnerData.length,
      totalDataCount: totalDataCount,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.createPromocode = async (req, res, next) => {
  try {
    let { maxLimit, endDate, startDate, promoCode, discount } = Object.assign(
      req.body,
      req.query,
      req.params
    );
    let requiredFields = {
      maxLimit,
      promoCode,
      endDate,
      startDate,
      discount,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    // Create a new promocode instance
    // let promocode = await  generatePromo(6)

    let promocodedata = await PromoCode.findOne({ promoCode: promoCode });

    if (promocodedata) {
      throw { status: 409, message: "This promo code already exists" };
    }

    const PromocodeData = await PromoCode.create({
      promoCode,
      maxLimit,
      startDate,
      endDate,
      isValid: true,
      discount,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
    });

    if (!PromocodeData)
      throw { status: 500, message: "Unable to create the promocode" };
    res.status(200).send({
      status: 1,
      message: "Promo code created successfully",
      data: PromocodeData,
    });
  } catch (error) {
    next(error);
  }
};

exports.editPromocode = async (req, res, next) => {
  try {
    let { maxLimit, promoCode, endDate, startDate, discount, id } =
      Object.assign(req.body, req.query, req.params);
    let requiredFields = { id };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);

    if (requestDataValid !== true) throw Error(requestDataValid);

    const updateBody = { updatedAt: currentDateTime };

    if (maxLimit) updateBody.maxLimit = maxLimit;
    if (discount) updateBody.discount = discount;
    if (startDate) updateBody.startDate = startDate;
    if (endDate) updateBody.endDate = endDate;
    if (promoCode) updateBody.promocode = promoCode;

    const PromocodeData = await PromoCode.findOneAndUpdate({ _id: id , isDeleted:false}, { $set: { ...updateBody } }, { new: true });

    if (!PromocodeData) {
      throw { status: 500, message: "Unable to update the promocode" };
    }

    res.status(201).send({
      status: 1,
      message: "Promo code updated successfully",
      data: PromocodeData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPromocodes = async (req, res, next) => {
  try {
    let { id, limit, page, skip } = Object.assign(req.query);
    //Paginations
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    let filter = { isDeleted: false };
    if (id) {
      filter._id = id;
    }

    skip = (page - 1) * limit;
    // Create a new promocode instance
    //let promocode = await  generatePromo(6)
    const PromocodeData = await PromoCode.find(filter);
    const totalDataCount = await PromoCode.countDocuments(filter);
    if (!PromocodeData) {
      throw { status: 500, message: "Unable to get the promocode data" };
    }
    res.status(201).send({
      status: 1,
      message: "Promo code fetch successfully",
      data: PromocodeData,
      dataCount: PromocodeData.length,
      totalDataCount: totalDataCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllCustomersdetails = async (req, res, next) => {
  try {
    let { id, limit, page, skip } = Object.assign(req.query);
    //Paginations
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    let filter = { isDeleted: false, role: "user" };
    if (id) {
      filter._id = id;
    }
    skip = (page - 1) * limit;
    const UserData = await User.find(filter).skip(skip).limit(limit).sort({updatedAt:-1});
    const totalDataCount = await User.countDocuments(filter);

    const responseData = {
      status: 1,
      success: true,
      message: "User data fetched successfully",
      data: UserData,
      dataCount: UserData.length,
      totalDataCount: totalDataCount,
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

exports.deletePromocodes = async (req, res, next) => {
  try {
    let { id } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      id,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    // Create a new promocode instance
    //let promocode = await  generatePromo(6)
    const PromocodeData = await PromoCode.findOneAndUpdate(
      { _id: id },
      { $set: { isDeleted: true, updatedAt: currentDateTime } },
      { new: true }
    );
    if (!PromocodeData) {
      throw { status: 500, message: "Unable to delete the promo code" };
    }
    res.status(200).send({
      status: 1,
      message: "Successfully deleted the promocode",
      data: PromocodeData,
    });
  } catch (error) {
    next(error);
  }
};

exports.adminPaymentsHistory = async (req, res, next) => {
  try {
    let { id, limit, page, skip, paymentStatus } = Object.assign(req.query);
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;
    skip = (page - 1) * limit;
    const userId = req.user._id;
    let filter = { isDeleted: false };
    if (id) {
      filter._id = id;
    }
    if (paymentStatus) {
      filter.paymentStatus = parseInt(paymentStatus);
    }
    const PaymentHistory = await Payment.find(filter)
      .populate([{ path: "addressId" ,path:"userId"}])
      .skip(skip)
      .limit(limit).sort({updatedAt:-1});
    if (!PaymentHistory)
      throw {
        status: 500,
        message: "Payment history data could not be retrieved. Try again",
      };
    let responseData = {
      status: 1,
      success: true,
      message: "Payment History data has been fetched successfully",
      data: PaymentHistory,
      dataCount: PaymentHistory.length,
    };
    let totalDataCount = await Payment.countDocuments(filter);
    responseData.totalDataCount = totalDataCount;
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};