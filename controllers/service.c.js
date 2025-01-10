let appUtils = require("../utils/appUtils");
let { capitalizeEveryInnerWord,  isRequestDataValid } = appUtils;
let { Services } = require("../models");
const { otpExpiryTime, sendSms } = require("../utils/appUtils");
let { getCurrentDateAndTime } = require("../helpers/dates");
const moment = require("moment");

exports.addService = async (req, res,next) => {
  try {
    let { name, isActive, pricePerHour, gstPercent,slotsLimit, platformCostPercent, mediaLink, categoryId } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      name,
      isActive,
      pricePerHour,
      gstPercent,
      slotsLimit,
      categoryId,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
  if(slotsLimit < 1)  throw {status : 400,  message: "Slots limit should be minimum 1"};
    const services = new Services({
      name: capitalizeEveryInnerWord(name),
      isActive,
      pricePerHour,
      gstPercent,
      platformCostPercent,
      mediaLink,
      categoryId,
      slotsLimit,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
    });

    let data = await services.save();
    if (!data) throw {status  : 500,  message: "Unable to store services.Try again"};
    res.status(200).send({ status: 1, success: true, message: "Adding Services success" ,data:data})
   
  } catch (error) {
    next(error)
  }
};

exports.editService = async (req, res,next) => {
  try {
    let { name, isActive, pricePerHour, gstPercent, slotsLimit,platformCostPercent, mediaLink, categoryId, id } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      name,
      isActive,
      pricePerHour,
      gstPercent,
      slotsLimit,
      categoryId,
      id,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    if(slotsLimit < 1)  throw {status : 400,  message: "Slots limit should be minimum 1"};

let updateServiceData = {
  name,
  pricePerHour,
  gstPercent,
  categoryId,
  slotsLimit,
  isActive,
  updatedAt: currentDateTime}

if(mediaLink)  updateServiceData.mediaLink =mediaLink
if(platformCostPercent)  updateServiceData.platformCostPercent =platformCostPercent


    let data = await Services.findOneAndUpdate({ _id: id }, { $set: updateServiceData }, { new: true, setDefaultsOnInsert: true });
    if (!data) throw  {status:500,message:"Unable to Update services. Try again"}
    res.status(200).send({ status: 1, success: true, message: "Updating Services success" ,data:data})

  } catch (error) {
    next(error)
  }
};

exports.getServices = async (req, res,next) => {
  try {
    let { id, categoryId,limit, page, skip } = Object.assign(req.query);
    //Paginations
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    let filter = { isDeleted: false };
    if (id) {
        filter._id = id;
    }
    if(categoryId){
      filter.categoryId = categoryId;
    }
      skip = (page - 1) * limit;

    // Query the database with pagination options
    const serviceData = await Services.find(filter).skip(skip).limit(limit);
    const totalDataCount = await Services.countDocuments(filter);

    let responseData = {
      status: 1,
      success: true,
      message: "Service data has been fetched successfully",
      data: serviceData,
      dataCount : serviceData.length,
     totalDataCount : totalDataCount
  };
    res.status(200).send(responseData)
  } catch (error) {
    next(error)
  }
};



exports.deleteServices = async (req, res,next) => {
  try {
    let { id } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      id,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    // Update the document to mark it as deleted
    const result = await Services.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true,  updatedAt: currentDateTime } });
    if (!result) throw{ status: 500, message: "Unable to delete Service. Try again" };

    res.status(200).send({ status: 1, success: true, message: "Delete Service success" })

  } catch (error) {
    next(error)
  }
};
