let appUtils = require("../utils/appUtils");
let { isRequestDataValid,generateOtp } = appUtils;
let { PartnerService, Services,SavedAddress, Bookings,User ,Slots,ServiceOtp,UploadDocuments} = require("../models");
let { getCurrentDateAndTime } = require("../helpers/dates");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
let { privateKey } = require("../config/config");
const { Types } = require('mongoose');


// Controller function to store services for partners
exports.storePartnerServices = async (req, res, next) => {
  try {
    let { serviceId } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      serviceId,
    };
    const userId = req.user._id;
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    serviceId = mongoose.Types.ObjectId(serviceId);
    const serviceExists = await Services.findOne({ _id: serviceId, isDeleted: false });
    if (!serviceExists) throw { status: 404, message: "Service data not found  with serviceId" };
    const serviceExists2 = await PartnerService.findOne({ serviceId: serviceId, userId: userId, isDeleted: false });
    if (serviceExists2) throw { status: 409, message: "Service already added to this user" };
    const partnerService = new PartnerService({
      serviceId,
      userId,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
    });

    const savedPartnerService = await partnerService.save();

    if (!savedPartnerService) throw { status: 500, message: "Unable to store partner services.Try again" }
    res.status(200).send({ status: 1, success: true, message: "Partner service stored successfully", data: savedPartnerService })
  } catch (error) {
    next(error);
  }
};

// Controller function to fetch stored services for partners
exports.fetchPartnerServices = async (req, res, next) => {
  try {
    let { id,limit, page } = Object.assign(req.query);

    const userId = req.user._id;
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;
    skip = (page - 1) * limit;

    const filter = { userId:userId, isDeleted: false };
    if (id) {
        filter._id = id;
    }

    const partnerServices = await PartnerService.find(filter).skip(skip).limit(parseInt(limit)).populate("serviceId"); // Populate the service details
    const totalDataCount = await PartnerService.countDocuments(filter)
    let responseData = {
      status: 1,
      success: true,
      message: "Partner Services data has been fetched successfully",
      data:partnerServices,
      dataCount:partnerServices.length,
      totalDataCount:totalDataCount
  };
  
    res.status(200).send(responseData)
  } catch (error) {
    next(error);
  }
};


// Controller function to set availability for partners
exports.addSlotstoAvailability = async (req, res, next) => {
  try {
    let { availability } = Object.assign(req.body, req.query, req.params);
    let { user } = req

      const requiredFields = {availability} ;
      const requestDataValid = isRequestDataValid(requiredFields, req.reqId);
      if (requestDataValid !== true) throw Error(requestDataValid);
    if(availability.length === 0){
  throw { status: 404, message: "Please provide slots" };
}

const hasDuplicates = new Set(availability).size !== availability.length;
if (hasDuplicates) {
    throw { status: 400, message: "Slot IDs cannot contain duplicates" };
}

const userAvailability = user.availability.map(slot => slot.slotId);

// Check if any of the new availability slots are already in user.availability
const duplicates = availability.filter(slotId => userAvailability.includes(slotId));
if (duplicates.length > 0) {
  throw { status: 400, message: "One or more slots are already assigned to the user" };
}
      const slots = await Slots.find({ _id: { $in: availability }, isDeleted: false, isActive: true });

      // Check if all slots exist or not
      if (slots.length !== availability.length) {
        throw { status: 404, message: "One or more slots not available" };
      }

      const availabilityNew = slots.map(slot => ({
        slotId:slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        day: slot.day,
        isActive: slot.isActive
      }));
      // Add the availability of all found slots to the user
      const updatedUser = await User.findOneAndUpdate({ _id: user._id },{ $push: { availability: { $each: availabilityNew } } },{ new: true } );
  if (!updatedUser) {
    throw { status: 500, message: "Failed to update partner availability." };
  }
  
    res.status(200).send({ status: 1, success: true, message: "Availability set successfully", data: updatedUser.availability });
  } catch (error) {

    next(error);
  }
};

exports.removeSlotstoAvailability = async (req, res, next) => {
  try {
    let { availability } = Object.assign(req.body, req.query, req.params);
    let { user } = req

      const requiredFields = {availability} ;
      const requestDataValid = isRequestDataValid(requiredFields, req.reqId);
      if (requestDataValid !== true) throw Error(requestDataValid);
    if(availability.length === 0){
  throw { status: 404, message: "Please provide slots" };
}

const hasDuplicates = new Set(availability).size !== availability.length;
if (hasDuplicates) {
    throw { status: 400, message: "Slot IDs cannot contain duplicates" };
}
      const slots = await Slots.find({ _id: { $in: availability }, isDeleted: false, isActive: true });

      // Check if all slots exist
      if (slots.length !== availability.length) {
        throw { status: 404, message: "One or more slots not available" };
      }
      const availabilityIds = slots.map(slot => slot._id);
      const updatedUser = await User.findOneAndUpdate({ _id: user._id }, { $pull: { availability: { slotId: { $in: availabilityIds } } } },  { new: true });
  
  if (!updatedUser) {
    throw { status: 500, message: "Failed to update partner availability." };
  }
  
    res.status(200).send({ status: 1, success: true, message: "Partner Availability updated successfully", data: updatedUser.availability });
  } catch (error) {

    next(error);
  }
};

// Create a new saved address
exports.addPartnerAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { doorNumber, streetName, city, state, pincode, country,addressType,  location } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      doorNumber, streetName, city,addressType, state, pincode, country
    }
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const isAlreadyAddressExist = await SavedAddress.findOne({ userId, isDeleted: false });
    if (isAlreadyAddressExist) throw { status: 409, message: "Address  is already added." }

    let savedAddressData = {
      location,
      doorNumber,
      streetName,
      city,
      state,
      pincode,
      country,
      addressType,
      userId,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,

    }
    const updatepartnerlocation = await User.findOneAndUpdate({_id:userId},{ $set: {location:location}}, { new: true, setDefaultsOnInsert: true });
    const savedAddress = await SavedAddress.create(savedAddressData);
    if (!savedAddress || !updatepartnerlocation) throw { status: 500, message: "Unable to save Address details. Try again" };
    res.status(200).send({ success: true, message: "Address added successfully", data: savedAddress });
  } catch (error) {
    next(error);
  }
};

// Get all saved addresses for the authenticated user
exports.getPartnerAddresses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { id, limit, page, skip } = Object.assign(req.query);

    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    // Calculate the number of documents to skip

    const filter = { userId: userId, isDeleted: false };
    if (id) {
      filter._id = id;
    }
    skip = (page - 1) * limit;

    const savedAddresses = await SavedAddress.find(filter).skip(skip).limit(limit);
    const totalDataCount = await SavedAddress.countDocuments(filter);

    let responseData = {
      status: 1,
      success: true,
      message: "Addresses  has been fetched successfully",
      data: savedAddresses,
      dataCount: savedAddresses.length,
      totalDataCount: totalDataCount
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
}


// Update a saved address by ID for the authenticated user
exports.updatePartnerAddress = async (req, res, next) => {
  try {
    const  userId  = req.user._id;
    let { doorNumber, streetName, city, state, pincode, country, id,addressType, location } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      doorNumber, streetName, city, state, pincode,addressType, country, id
    }
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid)

    let updateSavedAdresData = {
      doorNumber,
      streetName,
      city,
      state,
      pincode,
      country,
      id,
      addressType,
      updatedAt: currentDateTime,

    };
    if (location) updateSavedAdresData.location = location;
  
    const updatepartnerlocation = await User.findOneAndUpdate({_id:userId},{ $set: {location:location} }, { new: true, setDefaultsOnInsert: true });
    let data = await SavedAddress.findOneAndUpdate({ _id: id }, { $set: updateSavedAdresData }, { new: true, setDefaultsOnInsert: true });
    if (!data ||!updatepartnerlocation) throw { status: 500, message: "Unable to Update Address details. Try again" }

    res.status(200).send({ success: true, message: "Address details updated successfully", data: data });
  } catch (error) {
    next(error);
  }
};

// Delete a saved address by ID for the authenticated user
exports.deletePartnerAddressById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { id } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      id,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    const result = await SavedAddress.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, updatedAt: currentDateTime } });
    if (!result) throw { status: 500, message: "Unable to delete the address. Try again." }

    res.status(200).send({ success: true, message: 'Address deleted successfully', data: result });
  } catch (error) {
    next(error);
  }
};

exports.uploadDocuments = async (req, res,next) => {
  try {
    const userId = req.user._id;
    let {  aadharImageUrl,       pancardImageUrl, } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      aadharImageUrl,
            pancardImageUrl
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let documentsData = await UploadDocuments.findOne({ userId,isDeleted:false });
    if (documentsData && documentsData.isDocumentsVerified == true)
      throw {status:400,message:"Documents already uploaded"}

    let documents = {
      userId,
      aadharImageUrl,
      pancardImageUrl,
      isDocumentsVerified: false,
      isDeleted: false,
      updatedAt:currentDateTime 

    };
  
    documentsData = await UploadDocuments.create(documents);
    if (!documentsData) throw {status:500,message:"Unable to submit documents.Try again"}
    await User.findOneAndUpdate({ _id: userId }, { $set: { isDocumentsUploaded: true } }, { new: true } );
    res.status(200).send({ success: true, message: 'Documents uploaded successfully', data: documentsData });
  } catch (e) {
   next(e)
}
}

exports.updateDocuments = async (req, res,next) => {
  try {
    const userId = req.user._id;
    let {  aadharImageUrl,       pancardImageUrl, } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      aadharImageUrl,
            pancardImageUrl
    };
    let currentDateTime = getCurrentDateAndTime()
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);


    let documentsData = await UploadDocuments.findOne({ userId,isDeleted:false});
    if (documentsData && documentsData.isDocumentsVerified == true)
      throw {status:400,message:"Documents already verified"}

    let documents = {
      aadharImageUrl,
      pancardImageUrl,
      updatedAt:currentDateTime 
    };
  
    documentsData = await UploadDocuments.findOneAndUpdate({ userId },{  $set: documents }, { new: true } );   
     if (!documentsData) throw {status:500,message:"Unable to submit documents.Try again"}
    await User.findOneAndUpdate({ _id: userId }, { $set: { isDocumentsUploaded: true } }, { new: true } );
    res.status(200).send({ success: true, message: 'Documents updates successfully', data: documentsData });
  } catch (e) {
   next(e)
}
}


exports.getDocuments = async (req, res,next) => {
  try {
    const userId = req.user._id;
  
    let documentsData = await UploadDocuments.findOne({ userId,isDeleted:false});
    if(!documentsData) throw {status:500,message:"unable to get the documents"}

    res.status(200).send({ success: true, message: 'Documents fetched successfully', data: documentsData });
  } catch (e) {
   next(e)
}
}


exports.getPartnerBookings = async (req, res,next) => {
  try {
    const userId = req.user._id;
  
    let bookingsData = await Bookings.find({ partnerId:userId,isDeleted:false}).populate("serviceId").populate("addressId").populate("userId").populate({path:"slots"}).sort({updatedAt:-1});
    if(!bookingsData) throw {status:500,message:"There are no bookings allotted to you"}

    res.status(200).send({ success: true, message: 'Bookings data fetched successfully', data: bookingsData });
  } catch (e) {
   next(e)
}
}


exports.acceptPartnerBookings = async (req, res,next) => {
  try {
    const userId = req.user._id;
    let {  bookingId,accept} = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      bookingId,
      accept
    };
    let currentDateTime = getCurrentDateAndTime()
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let bookingsData = await Bookings.findOneAndUpdate({ _id:bookingId,partnerId:userId,isDeleted:false},{$set:{partnerAccepted:accept,updatedAt:currentDateTime}}, { new: true });
    if(!bookingsData) throw {status:500,message:" Unable to update partner acceptence"}

    res.status(200).send({ success: true, message: 'Partner acceptence updated successfully', data: bookingsData });
  } catch (e) {
   next(e)
}
}




exports.compleatedService = async (req, res,next) => {
  try {
  
    let {  userId,bookingId} = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      userId,bookingId
      
    };
    const partnerId = req.user._id;
    let currentDateTime = getCurrentDateAndTime()
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

   let otp = generateOtp();
    let otpData = await ServiceOtp.findOneAndUpdate({ userId }, { $set: { userId,bookingId,otp,updatedAt:currentDateTime} }, { new: true, upsert: true }).lean();
    if (!otpData) throw {status:500,message:"Unable to send otp. Try again"}
    res.status(200).send({ success: true, message: 'Otp  successfully delivered to customer' });
  } catch (e) {
   next(e)
}
}

