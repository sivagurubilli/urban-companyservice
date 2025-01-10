const { isRequestDataValid } = require("../utils/appUtils");
const { Slots ,Services} = require("../models");
let { getCurrentDateAndTime } = require("../helpers/dates");

// Controller function to add a new slot
exports.addSlot = async (req, res, next) => {
  try {
    let { startTime, endTime, day, isActive } = Object.assign(req.body, req.query, req.params);

    let currentDateTime = getCurrentDateAndTime();
    let requiredFields = { startTime, endTime, day, isActive };
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]|24:00$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        throw { status: 400, message: "Invalid time format. Please use HH:MM in 24-hour format." };
    }
    

    // Convert start time and end time strings to Date objects for comparison
    const startTimeObj = new Date(`2000-01-01T${startTime}`);
    const endTimeObj = new Date(`2000-01-01T${endTime}`);
    // Ensure end time is not less than start time

     if (endTimeObj <= startTimeObj ) {
      throw { status: 400, message: "End time should be greater than Start time." };
    }
  

    const existingSlot = await Slots.findOne({ startTime, endTime, day: day.toLowerCase() , isActive:true,
      isDeleted:false});
    if (existingSlot) {
      throw { status: 409, message: "Slot already exists for the given day." };
    }

    const intersectingSlots = await Slots.find({
      day: day.toLowerCase(),
      isActive:true,
      isDeleted:false,
      $or: [
        { startTime: { $gte: startTime, $lt: endTime } }, // New slot starts during existing slot
        { endTime: { $gt: startTime, $lte: endTime } },   // New slot ends during existing slot
        { $and: [{ startTime: { $lte: startTime } }, { endTime: { $gte: endTime } }] } // New slot is within existing slot
      ]
    });

      if (intersectingSlots.length > 0) {
        throw { status: 400, message: "Slot intersects with existing slot. Please choose a different time." };
      }
  
    const slot = new Slots({
      startTime,
      endTime,
      day:day.toLowerCase(),
      isActive,
      createdAt: currentDateTime,
      updatedAt: currentDateTime
    });

    const savedSlot = await slot.save();
    if (!savedSlot) throw { status: 500, message: "Unable to create slot" };
    res.status(200).send({ status: 1, success: true, message: "Slot added successfully", data: savedSlot });
  } catch (error) {
  
    next(error);
  }
};

// Controller function to edit an existing slot
exports.editSlot = async (req, res, next) => {
  try {
  
    let { startTime, endTime, day, isActive, id } = Object.assign(req.body, req.query, req.params);

    let currentDateTime = getCurrentDateAndTime();
    let requiredFields = { startTime, endTime, day, isActive, id };
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]|24:00$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        throw { status: 400, message: "Invalid time format. Please use HH:MM in 24-hour format." };
    }

    // Convert start time and end time strings to Date objects for comparison
    const startTimeObj = new Date(`2000-01-01T${startTime}`);
    const endTimeObj = new Date(`2000-01-01T${endTime}`);

    // Ensure end time is not less than start time
    if (endTimeObj <= startTimeObj ) {
      throw { status: 400, message: "End time should be greater than Start time." };
    }
    const existingSlot = await Slots.findOne({ startTime, endTime, day: day.toLowerCase() , isActive:true,
      isDeleted:false});
    if (existingSlot) {
      throw { status: 400, message: "Slot already exists for the given day." };
    }
    const intersectingSlots = await Slots.find({
        day: day.toLowerCase(),
        isActive:true,
        isDeleted:false,
        $or: [
          { startTime: { $gte: startTime, $lt: endTime } }, // New slot starts during existing slot
          { endTime: { $gt: startTime, $lte: endTime } },   // New slot ends during existing slot
          { $and: [{ startTime: { $lte: startTime } }, { endTime: { $gte: endTime } }] } // New slot is within existing slot
        ]
      });
      if (intersectingSlots.length > 0) {
        throw { status: 400, message: "Slot intersects with existing slot. Please choose a different time." };
      }
  
    let updatedSlotsData = {
      startTime, endTime, day, isActive,
      updatedAt: currentDateTime };


    // Performing the update operation
    let data = await Slots.findOneAndUpdate({ _id: id }, { $set: updatedSlotsData }, { new: true, setDefaultsOnInsert: true });
    if (!data) throw { status: 500, message: "Unable to update slot" };

    res.status(200).send({ status: 1, success: true, message: "Slot updated successfully", data: data });
  } catch (error) {
    next(error);
  }
};

// Controller function to get all slots
exports.getSlots = async (req, res, next) => {
  try {
    let { day,id, limit, page, skip,serviceId } = Object.assign( req.query);
 
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    // Calculate the number of documents to skip
    const filter = { isDeleted: false };
    if (id) {
        filter._id = id;
    }

    if(day){ filter.day = day}
      skip = (page - 1) * limit;

    const slotsData = await Slots.find(filter).sort({ startTime: 1, endTime: 1 }).skip(skip).limit(limit);
    const slotscount = await Slots.countDocuments(filter)
    const servicedata = await Services.find({_id:serviceId})
    const totalDataCount = await Slots.countDocuments({ isDeleted: false })
    let responseData = {
      status: 1,
      success: true,
      message: "Slots Data  has been fetched successfully",
      data:slotsData,
      slotscount:slotscount,
      servicedata:servicedata,
    dataCount : slotsData.length,
 totalDataCount : totalDataCount
  };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

// Controller function to delete a slot
exports.deleteSlot = async (req, res, next) => {
  try {
  
    let { id } = Object.assign(req.body, req.query, req.params);
    let requiredFields = { id };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    const result = await Slots.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, updatedAt: currentDateTime} });
    if (!result) throw { status: 500, message: "Unable delete the slot. Try again" };
    res.status(200).send({ status: 1, success: true, message: "Slot deleted successfully" });
  } catch (error) {
  
    next(error);
  }
};


//fetch slots api for user

exports.getSlotsforUser = async (req, res, next) => {
  try {
    let { id, limit, page, skip ,day,
      serviceId
    } = Object.assign(req.query);
    limit = parseInt(limit) || 50;
    page = parseInt(page) || 1;

    // Calculate the number of documents to skip
    let filters = {isDeleted:false,isActive:true}
    if(day){
      filters.day = day
    }
    if(id){
      filters._id = id
    }
    skip = (page - 1) * limit;
    const slotsData = await Slots.find(filters).sort({ startTime: 1, endTime: 1 }).skip(skip).limit(limit);
    const servicedata = await Services.find({_id:serviceId})
        const slotscount = await Slots.countDocuments(filters)

   let  totalDataCount = await Slots.countDocuments({ isDeleted: false })
    let responseData = {
      status: 1,
      success: true,
      message: "Slots data has been fetched successfully",
      data: slotsData,
      slotscount:slotscount,
      servicedata:servicedata,
      dataCount : slotsData.length,
      totalDataCount : totalDataCount
  };
  
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};


exports.getSlotscountforday = async (req, res, next) => {
  try {
    let { id, limit, page, skip, serviceId } = Object.assign(req.query);
    limit = parseInt(limit) || 50;
    page = parseInt(page) || 1;

    // Calculate the number of documents to skip
    let filters = { isDeleted: false, isActive: true };

    if (id) {
      filters._id = id;
    }
    skip = (page - 1) * limit;

    // Aggregate slots by the day field and count the number of slots for each day
    const slotsData = await Slots.aggregate([
      { $match: filters },
      {
        $group: {
          _id: "$day",
          count: { $sum: 1 },
        }
      },
    ]);

    // Format the grouped results
    const slotsByDay = slotsData.map(slot => ({
      day: slot._id,
      count: slot.count,
    }));

    const servicedata = await Services.find({ _id: serviceId });
    const totalDataCount = await Slots.countDocuments({ isDeleted: false });

    let responseData = {
      status: 1,
      success: true,
      message: "Slots data has been fetched successfully",
      data: slotsByDay,
      servicedata: servicedata,
      totalDataCount: totalDataCount
    };

    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};