const {
  Bookings,
  Slots,
  SavedAddress,
  Services,
  PromoCode,
  Categories,
  Payment,
  ServiceOtp,
  UserPromoCode,
  Rating,
  User,
} = require("../models");
const Razorpay = require("razorpay");
let config = require("../config/config");
let appUtils = require("../utils/appUtils");
let { getCurrentDateAndTime } = require("../helpers/dates");
let {
  isRequestDataValid,
  calculatePrice,
  generatePromo,
  makePayment,
  calculateDistance,
  invoiceGen,
  mergeSlots,
  generateInvoice,
} = appUtils;
const moment = require("moment");
const crypto = require("crypto");

// Controller function to handle booking process
// Controller function to handle booking process
exports.bookSlots = async (req, res, next) => {
  try {
    const { slotId, categoryId, serviceId, date, location } = req.body;
    const userId = req.user._id;
    let currentDateTime = getCurrentDateAndTime();
    const requiredFields = { categoryId, slotId, serviceId, date, location };
    const requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw new Error(requestDataValid);

    if (!slotId || slotId.length === 0) {
      throw { status: 400, message: "Slot ID array cannot be empty" };
    }

    const hasDuplicates = new Set(slotId).size !== slotId.length;
    if (hasDuplicates) {
      throw { status: 400, message: "Slot IDs cannot contain duplicates" };
    }
    const category = await Categories.findOne({ _id: categoryId, isDeleted: false });
    if (!category) {
      throw { status: 404, message: "Category not found" };
    }

    const service = await Services.findOne({ _id: serviceId, categoryId: categoryId, isActive: true, isDeleted: false });
    if (!service) {
      throw { status: 404, message: "Services not found" };
    }
    const slots = await Slots.find({ _id: { $in: slotId }, isActive: true, isDeleted: false }).sort({ startTime: 1, endTime: 1 })
    if (slots.length !== slotId.length) {
      throw { status: 400, message: "One or more slots are not available for booking." };
    }
  
  
    for (let i = 0; i < slots.length - 1; i++) {
      const currentSlot = slots[i];
      const nextSlot = slots[i + 1];
    
      if (currentSlot.endTime != nextSlot.startTime) {
        throw { status: 400, message: "Slots must have continous start and end times" };
      }
    }
    const fifteenMinutesAgo = new Date(currentDateTime - 15 * 60 * 1000) // Calculate 15 minutes ago

    const isAlreadyBooked = await Bookings.find({
      serviceId: serviceId,
      userId: userId,
      date: date,
      slots: { $in: slotId },
      status: 'addedtocart',
      isDeleted: false,
      updatedAt: { $gte: fifteenMinutesAgo } // Ensure created within the last 15 minutes
    });

    
    if (isAlreadyBooked.length > 0) throw { status: 409, message: "One or more slots are already added to cart." }

    const BookingData = await Bookings.find({ userId: userId, serviceId: serviceId, date: date, status: 'addedtocart', isDeleted: false })

    // Check if the last booking exists and if the last slot in that booking ends at the same time the first slot in the current slotId array starts
    if (BookingData && BookingData.length > 0) {
      const allSlots = [];

      // Collect all slots from existing bookings
      for (let i = 0; i < BookingData.length; i++) {
        let slotstimes = await Slots.find({
          _id: { $in: BookingData[i].slots },
        });
        allSlots.push(...slotstimes);
      }

      allSlots.sort((a, b) => a.startTime - b.startTime);
      let currentslotstimes = await Slots.find({ _id: { $in: slotId } });
      // Check if any slots can be merged with the current slots
      let mergedSlots = mergeSlots(allSlots, currentslotstimes);
      if (mergedSlots?.length > 0) {
        const slotStartTimes = mergedSlots.map((slot) => slot.startTime);
        const slotEndTimes = mergedSlots.map((slot) => slot.endTime);
        const bookingsWithSlotsStart = await Bookings.find({ paymentStatus: 0, status: "addedtocart" }).populate({
          path: "slots",
          match: { startTime: { $in: slotEndTimes } },
        });
        const bookingsWithSlotsEnd = await Bookings.find({ paymentStatus: 0, status: "addedtocart" }).populate({
          path: "slots",
          match: { endTime: { $in: slotStartTimes } },
        });
        const bookingsWithMatchingSlotsStart = bookingsWithSlotsStart.flatMap(
          (booking) =>
            booking.slots.map((slot) => {
              if (slot._id) return booking;
            })
        );
        const bookingsWithMatchingSlotsEnd = bookingsWithSlotsEnd.flatMap(
          (booking) =>
            booking.slots.map((slot) => {
              if (slot._id) return booking;
            })
        );
        let updatedBooking = {};
        updatedBooking.slots = mergedSlots.map((el) => el.id);
        const {
          totalPrice,
          gstPercent,
          gstAmount,
          slotDiscount,
          totalPriceWithoutGst,
          slotsPercentage,
        } = await calculatePrice(mergedSlots, serviceId);
        let discountPrice = 0;

        if (slotDiscount === 1) {
          discountPrice = totalPrice * (slotsPercentage / 100);
        }
        updatedBooking.totalPrice = totalPrice;
        updatedBooking.finalPrice = totalPrice - discountPrice;
        updatedBooking.gstPercent = gstPercent;
        updatedBooking.gstAmount = gstAmount;
        updatedBooking.discount = discountPrice;
        updatedBooking.slotsDiscount = slotDiscount;
        updatedBooking.totalPriceWithoutGst = totalPriceWithoutGst;
        updatedBooking.slotsPercentage = slotsPercentage;
        var updatebookingResponse;

        if (
          bookingsWithMatchingSlotsStart.length > 0 &&
          bookingsWithMatchingSlotsEnd.length > 0
        ) {
          const deleteBooking = await Bookings.findOneAndDelete({
            _id: bookingsWithMatchingSlotsStart[0]._id,
          });

          if (!deleteBooking) {
            throw {
              status: 500,
              message: "Unable to make the booking. Try again",
            };
          }
          let combinedSlots = [];
          for (var i = 0; i < updatedBooking.slots.length; i++) {
            if (!combinedSlots.includes(updatedBooking.slots[i])) {
              combinedSlots.push(updatedBooking.slots[i]);
            }
          }
          for (var j = 0; j < deleteBooking.slots.length; j++) {
            if (!combinedSlots.includes(deleteBooking.slots[j].toString())) {
              combinedSlots.push(deleteBooking.slots[j].toString());
            }
          }
          // Update updatedBooking.slots with unique values
          updatedBooking.slots = combinedSlots;

          updatebookingResponse = await Bookings.findOneAndUpdate(
            { _id: bookingsWithMatchingSlotsEnd[0]._id, paymentStatus: 0 },
            { $set: updatedBooking, updatedAt: currentDateTime },
            { new: true }
          );
        } else if (bookingsWithMatchingSlotsStart.length > 0) {
          updatebookingResponse = await Bookings.findOneAndUpdate(
            { _id: bookingsWithMatchingSlotsStart[0]._id, paymentStatus: 0 },
            { $set: updatedBooking, updatedAt: currentDateTime },
            { new: true }
          );
        } else if (bookingsWithMatchingSlotsEnd.length > 0) {
          updatebookingResponse = await Bookings.findOneAndUpdate(
            { _id: bookingsWithMatchingSlotsEnd[0]._id, paymentStatus: 0 },
            { $set: updatedBooking, updatedAt: currentDateTime },
            { new: true }
          );
        }

        if (!updatebookingResponse)
          throw {
            status: 500,
            message: "Unable to update the Booking slot. Try again",
          };
        // Return the updated booking
        return res.status(200).send({
          status: 1,
          message: 'Booking updated successfully',
          data: {
            bookingDetails: updatebookingResponse,
          }
        });
      }

    }
    const { totalPrice, gstPercent, gstAmount, slotDiscount, totalPriceWithoutGst, slotsPercentage } = await calculatePrice(slotId, serviceId);
    let discountPrice = 0;

    if (slotDiscount === 1) {
      discountPrice = totalPrice * (slotsPercentage / 100);
    }
    // Create booking record 
    const booking = await Bookings.create({
      userId: userId,
      slots: slotId,
      serviceId: serviceId,
      categoryId: categoryId,
      date: date,
      totalPrice: parseInt(totalPrice),
      finalPrice: parseInt(totalPrice) - discountPrice,
      gstPercent: parseInt(gstPercent),
      gstAmount: parseInt(gstAmount),
      slotsDiscount: slotDiscount,
      discount: 0,
      groupBooking: false,
      totalPriceWithoutGst: totalPriceWithoutGst,
      slotsPercentage: slotsPercentage,
      location: location,
      status: 'addedtocart',
      paymentStatus: 0,
      createdAt: currentDateTime,
      updatedAt: currentDateTime
    });

    if (!booking) throw { status: 500, message: "Unable to Book the slot. Try again" }

    res.status(200).send({
      status: 1,
      message: 'Booking successful',
      data: {
        bookingDetails: booking,
      }
    });
  } catch (error) {
    next(error);
  }
};



exports.deletefromCart = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user._id;
    let currentDateTime = getCurrentDateAndTime();
    const requiredFields = { bookingId };
    const requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw new Error(requestDataValid);

    const booking = await Bookings.findOneAndUpdate({ _id: bookingId, status: "addedtocart" }, { $set: { isDeleted: true, updatedAt: currentDateTime } }, { new: true })
    if (!booking) throw { status: 500, message: "Unable to delete the booking. Try again" }

    res.status(200).send({
      status: 1,
      message: 'Booking data successfully deleted ',
      data: {
        bookingDetails: booking,
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.GetAllCartItems = async (req, res, next) => {
  try {

    const userId = req.user._id;
    // Query the database with pagination options
    let filter = { isDeleted: false, status: "addedtocart", }
    if (userId) {
      filter.userId = userId
    }
    let currentDateTime = getCurrentDateAndTime();
    const fifteenMinutesAgo = new Date(currentDateTime - 15 * 60 * 1000);
    console.log(fifteenMinutesAgo)
    // Add the condition to filter items updated within the last 15 minutes
    filter.updatedAt = { $gte: fifteenMinutesAgo };

    const allCartItems = await Bookings.find(filter).populate('serviceId').populate("categoryId").populate({ path: 'slots', options: { sort: { startTime: 1 } } });
    let totalPrice = 0
    let totalPriceWithoutgst = 0;
    let gstAmount = 0;
    let gstPercent = 0;
    let discount = 0;
    if (allCartItems.length > 0) {
      totalPrice = allCartItems.reduce((total, currentItem) => total + currentItem.finalPrice, 0);
      totalPriceWithoutgst = allCartItems.reduce((total, currentItem) => total + currentItem.totalPriceWithoutGst, 0);
      gstAmount = allCartItems.reduce((total, currentItem) => total + currentItem.gstAmount, 0);
      gstPercent = allCartItems.reduce((total, currentItem) => total + currentItem.gstPercent, 0);
      discount = allCartItems.reduce((total, currentItem) => total + currentItem.discount, 0);
    }

    const data = {
      allCartItems: allCartItems.map(item => ({
        ...item.toJSON(),
         categoeryName : item?.categoryId?.name || "",
        serviceName: item?.serviceId?.name || 'Unknown',
        serviceIcon: item?.serviceId?.mediaLink || 'Default Icon URL',
        slotsCount: item?.slots?.length || 0,
        startTime: item?.slots[0]?.startTime,
        endTime: item?.slots[item?.slots.length - 1]?.endTime
      })),
      totalPrice: totalPrice,
      totalPriceWithoutgst: totalPriceWithoutgst,
      gstAmount: gstAmount,
      discount: discount,
      gstPercent: gstPercent
    }
    res.status(200).send({ status: 1, success: true, message: "Cart items data has been fetched successfully", data: data })
  } catch (error) {
    next(error)
  }
};


exports.validatePromocode = async (req, res, next) => {
  try {
    let { promocode } = Object.assign(req.body, req.query, req.params);
    let requiredFields = { promocode };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);

    if (requestDataValid !== true) throw Error(requestDataValid);
    let userId = req.user._id;
    // Find the promo code by its code
    const promoCodeData = await PromoCode.findOne({
      promoCode: promocode,
      isValid: true,
      isDeleted: false,
      startDate: { $lte: currentDateTime }
    });

    // If promo code not found or isDeleted, throw an error
    if (!promoCodeData) throw { status: 404, message: "Invalid promocode. Please try with another one." };

    if (new Date(promoCodeData.endDate) < new Date(currentDateTime)) {
      throw {
        status: 400,
        message: "Promocode is expired. Please try another with another one.",
      };
    }

    const userPromoCodeDataCount = await UserPromoCode.countDocuments({ promoCodeId: promoCodeData._id, userId });

    // Check if the user has already reached the maximum applies limit
    if (userPromoCodeDataCount >= promoCodeData.maxLimit) {
      throw {
        status: 400,
        message:
          "User has already used the maximum limit for this promo code",
      };
    }
    // Return success response with updated promo code data
    res.status(200).send({
      status: 1,
      message: "Promocode validated successfully",
      data: promoCodeData,

    });
  } catch (error) {
    next(error);
  }
};

exports.initiatePayment = async (req, res, next) => {
  try {
    const { discount, addressId, totalPrice, gstAmount, bookingId, gstPercent, promoCode } = req.body;
    const userId = req.user._id;
    let currentDateTime = getCurrentDateAndTime();
    const requiredFields = { discount, addressId, totalPrice, gstAmount, addressId, bookingId, gstPercent };
    const requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw new Error(requestDataValid);

    let promoCodeData;
    let totalDiscount = discount;
    let totalPriceAfterDiscount = totalPrice - discount;

    if (promoCode) {
      promoCodeData = await PromoCode.findOne({
        promoCode: promoCode,
        isValid: true,
        isDeleted: false,
        startDate: { $lte: currentDateTime }
      });

      if (!promoCodeData) throw { status: 404, message: "Invalid promocode. Please try with another one." };

      if (new Date(promoCodeData.endDate) < new Date(currentDateTime)) {
        throw {
          status: 400,
          message: "Promocode is expired. Please try another with another one.",
        };
      }

      const userPromoCodeDataCount = await UserPromoCode.countDocuments({ promoCodeId: promoCodeData._id, userId });

      // Check if the user has already reached the maximum applies limit
      if (userPromoCodeDataCount >= promoCodeData?.maxLimit) {
        throw {
          status: 400,
          message: "User has already used the maximum limit for this promo code",
        };
      }

      totalDiscount += promoCodeData?.discount || 0;
      totalPriceAfterDiscount -= promoCodeData?.discount || 0;
    }

    const order = await makePayment(userId, totalPriceAfterDiscount);
    if (!order.id) throw { status: 500, message: "Unable to create the order. Try again" }

    const payment = await Payment.create({
      userId: userId,
      addressId: addressId,
      orderId: order.id,
      discount: totalDiscount,
      totalPrice: totalPriceAfterDiscount,
      gstPercent: gstPercent,
      gstAmount: gstAmount,
      paymentStatus: 0,
      status: "created",
      transactionNo: order.id,
      promoCodeId: promoCodeData?._id || undefined,
      promoCodeDiscount: promoCodeData?.discount || undefined,
      createdAt: currentDateTime,
      updatedAt: currentDateTime
    });
    if (!payment) throw { status: 500, message: "Unable to initiate the payment. Try again" }

    let bookings = await Bookings.updateMany({ _id: { $in: bookingId }, isDeleted: false }, { $set: { transactionNo: order.id,addressId:addressId, updatedAt: currentDateTime } });
    if (!bookings.nModified) throw { status: 500, message: "Unable to complete the order. Try again" }

    res.status(200).send({ status: 1, message: 'Payment initiated successfully', data: { paymentDetails: payment, order: order, promoCodeData: promoCodeData } });
  } catch (error) {
    next(error);
  }
};


exports.confirmPayment = async (req, res, next) => {
  try {
    let {
      transactionNo,
      transactionPaymentNo,
      transactionSignature,
      invoiceNumber,
      id,

    } = Object.assign(req.body);
    const userId = req.user._id;
    let currentDateTime = getCurrentDateAndTime();
    const requiredFields = {
      transactionNo,
      transactionPaymentNo,
      transactionSignature,
    };
    const requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw new Error(requestDataValid);

    let isValidtransactionNo = await Payment.findOne({
      transactionNo,
      userId: userId,
      isDeleted: false,
    });
    if (!isValidtransactionNo)
      throw { status: 500, message: "Please provide valid trasactionNo" };
    let signbody = transactionNo + "|" + transactionPaymentNo;
    let expectedSignature = crypto
      .createHmac("sha256", config.razorpay.key_secret)
      .update(signbody.toString())
      .digest("hex");
    console.log(expectedSignature)
    {/*if (expectedSignature != transactionSignature) throw { status: 401, message: "Transaction Signature Not Valid" }; */ }
    invoiceNumber = await generateInvoice(userId, transactionNo);
    if (!invoiceNumber) {
      throw { status: 500, message: "Unable to generate invoice number" };
    }

    const paymentUpdateData = {
      transactionNo,
      transactionPaymentNo,
      transactionSignature,
      paymentStatus: 1,
      invoiceNumber: invoiceNumber,
      updatedAt: currentDateTime,
    };
    let payment = await Payment.findOneAndUpdate(
      { transactionNo, userId: userId },
      { $set: paymentUpdateData, updatedAt: currentDateTime },
      { new: true }
    ).populate([
      { path: "userId", select: "name email mobileNo" },
      { path: "addressId", select: "doorNumber streetName city state pincode" },
    ]);
    const bookingsdetails = await Bookings.find({
      userId: userId, transactionNo,
    }).populate([{ path: "serviceId" }]);

    if (!bookingsdetails)
      throw {
        status: 500,
        message: "Unable to find the service  details. Try again",
      };
    const bookingupdate = await Bookings.updateMany(
      { userId, transactionNo },
      { $set: { paymentStatus: 1, status: "confirmed" } }
    );

    if (!payment || !bookingupdate.nModified )
      throw {
        status: 500,
        message: "Unable to compleate the payment. Try again",
      };


    const userPromoCodedata = await UserPromoCode.create({ promoCodeId: isValidtransactionNo.promoCodeId, userId: userId, updatedAt: currentDateTime, createdAt: currentDateTime })

    if (!userPromoCodedata)
      throw {
        status: 500,
        message: "Unable to compleate the payment. Try again",
      };

    let userAddress = {};
    if (payment && payment.addressId) {
      if (payment.addressId.doorNumber)
        userAddress.doorNumber = payment.addressId.doorNumber;
      if (payment.addressId.streetName)
        userAddress.streetName = payment.addressId.streetName;
      if (payment.addressId.city) userAddress.city = payment.addressId.city;
      if (payment.addressId.state) userAddress.state = payment.addressId.state;
      if (payment.addressId.pincode)
        userAddress.pincode = payment.addressId.pincode;
    }

    // let invoiceData = {
    //   invoiceNumber: payment.invoiceNumber,
    //   invoiceDate: moment(payment.updatedAt).format("DD-MM-YYYY"),
    //   name: payment.userId.name,
    //   mobileNo: payment.userId.mobileNo,
    //   Price: payment.totalPrice,
    //   discount: payment.discount,
    //   totalPrice: payment.totalPrice + payment.discount,
    //   gstAmount: payment.gstAmount,
    //   address: userAddress,
    //   gstPercent: payment.gstPercent,
    //   bookingsdetails: bookingsdetails,
    // };
    // let invoiceUrl = await invoiceGen(invoiceData);
    // if (!invoiceUrl)
    //   throw {
    //     status: 500,
    //     message: "Unable to generate the invoice pdf. Try again",
    //   };
    // let invoicepaymentData = await Payment.findOneAndUpdate(
    //   { _id: payment._id },
    //   { $set: { invoiceUrl } },
    //   { new: true }
    // );

    // if (!invoicepaymentData)
    //   throw {
    //     status: 500,
    //     message: "Unable to update the invoice pdf. Try again",
    //   };
    res.status(200).send({
      status: 1,
      message: "Payment stored successful",
      data: { paymentDetails: payment },
    });
  } catch (error) {
    next(error);
  }
};

// getting  booking history data
exports.getBookingHistory = async (req, res, next) => {
  try {
    let { id, limit, page, skip } = Object.assign(req.query);
    limit = parseInt(limit) || 50;
    page = parseInt(page) || 1;
    // Calculate the number of documents to skip
    skip = (page - 1) * limit;
    const userId = req.user._id;
    // Query the database with pagination options
    let filter = { isDeleted: false, userId: userId ,   paymentStatus: 1};

    if (id) {
      filter._id = id;
    }
    const bookingHistory = await Bookings.find(filter).populate([{ path: "serviceId" },{path:"slots"}]).skip(skip).limit(limit).sort({updatedAt:-1});
    
    if (!bookingHistory)
      throw {
        status: 500,
        message: "Booking history data could not be retrieved. Try again",
      };
    let responseData = {
      status: 1,
      success: true,
      message: "Bookings History data has been fetched successfully",
      data: bookingHistory,
      dataCount: bookingHistory.length,
    };
    let totalDataCount = await Bookings.countDocuments(filter);
    responseData.totalDataCount = totalDataCount;

    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};


exports.getBookingHistory = async (req, res, next) => {
  try {
    let { id, limit, page, skip } = req.query;
    limit = parseInt(limit) || 50;
    page = parseInt(page) || 1;
    // Calculate the number of documents to skip
    skip = (page - 1) * limit;
    const userId = req.user._id;
    // Query the database with pagination options
    let filter = { isDeleted: false, userId: userId, paymentStatus: 1 };

    if (id) {
      filter._id = id;
    }

    const bookingHistory = await Bookings.find(filter)
      .populate([
        { path: "serviceId" },
        { path: "slots" }
      ])
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });

    if (!bookingHistory) {
      throw {
        status: 500,
        message: "Booking history data could not be retrieved. Try again",
      };
    }

    // Fetch ratings separately if they are in a different collection
    const bookingIds = bookingHistory.map(booking => booking._id);
    const ratings = await Rating.find({ bookingId: { $in: bookingIds } });

    // Combine bookings and ratings
    const bookingHistoryWithRatings = bookingHistory.map(booking => {
      const rating = ratings?.find(rating => rating?.bookingId?.equals(booking?._id));
      return { ...booking?.toObject(), rating: rating ? rating?.rating : 0 }; // Assume ratingValue is the field storing the rating
    });

    let responseData = {
      status: 1,
      success: true,
      message: "Bookings History data has been fetched successfully",
      data: bookingHistoryWithRatings,
      dataCount: bookingHistory.length,
    };

    let totalDataCount = await Bookings.countDocuments(filter);
    responseData.totalDataCount = totalDataCount;

    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
}

// getting payment hitory data
exports.getPaymentsHistory = async (req, res, next) => {
  try {
    let { id, limit, page, skip, paymentStatus } = Object.assign(req.query);
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;
    skip = (page - 1) * limit;
    const userId = req.user._id;
    let filter = { isDeleted: false, userId: userId };
    if (id) {
      filter._id = id;
    }
    if (paymentStatus) {
      filter.paymentStatus = parseInt(paymentStatus);
    }
    const PaymentHistory = await Payment.find(filter)
      .populate([{ path: "addressId" }])
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

exports.verifyServiceOtps = async (req, res, next) => {
  try {
   
    let { bookingId, otp,userId } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      bookingId,
      otp,
      userId,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let otpDbBody = { bookingId, otp, userId };
    let otpData = await ServiceOtp.findOne(otpDbBody).lean();
    if (!otpData) {
      throw {
        status: 422,
        message: "The OTP is either incorrect or expired",
      };
    }
    let updatebooking = await Bookings.findOneAndUpdate(
      { _id: bookingId,isDeleted:false },
      { $set: { status: "completed", updatedAt: currentDateTime } },
      { new: true, upsert: true }
    );
    if (!updatebooking) {
      throw { status: 422, message: "Unable to update booking data" };
    }
    res
      .status(200)
      .send({ success: true, message: "OTP verified successfully" });
  } catch (e) {
    next(e);
  }
};

exports.getRazorPayKey = async (req, res, next) => {
  try {
    let data = "noData";
    const { rzp, sendBird } = config;

    if (req.query.rzp) {
      data = {
        key: rzp.key_id,
        secret: rzp.key_secret,
      };
      res.status(200).send({
        status: 1,
        success: true,
        message: "Razorpay Key has been fetched successfully",
        data: data,
      });
    } else
      throw { status: 500, message: "Currently only rzp values available" };
  } catch (error) {
    next(error);
  }
};


exports.invoiceGen = async (req, res, next) => {
  try {
    let invoiceData = {
      invoiceNumber: 'SLA10001221',
      invoiceDate: moment(getCurrentDateAndTime()).format("DD-MM-YYYY"),
      name: 'Teja svss',
      mobileNo: '8332946991',
      Price: '1000.00',
      discount: '0.00',
      totalPrice: '1100.00',
      gstAmount: '100.00',
      address: 'India',
      gstPercent: '10',
      bookingsdetails: {
        serviceId: {
          name: 'Maid',
          pricePerHour: 1000,
          gstPercent: 10,
          gstAmount: 100,
          finalPrice: 1100
        }
      },
    };
    let invoiceUrl = await invoiceGen(invoiceData);
    if (!invoiceUrl)
      throw {
        status: 500,
        message: "Unable to generate the invoice pdf. Try again",
      };
    // let invoicepaymentData = await Payment.findOneAndUpdate(
    //   { _id: payment._id },
    //   { $set: { invoiceUrl } },
    //   { new: true }
    // );

    // if (!invoicepaymentData)
    //   throw {
    //     status: 500,
    //     message: "Unable to update the invoice pdf. Try again",
    //   };
    res.status(200).send({
      status: 1,
      message: "Payment successful",
      data: { paymentDetails: invoiceUrl },
    });
  } catch (error) {
    res.status(500).send({ error })
  }
};


exports.userCancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      bookingId,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const updateBooking = await Bookings.findOneAndUpdate(
      { _id: bookingId, isDeleted: false, status: { $ne: "partnerassigned" } },
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