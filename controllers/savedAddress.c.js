
const { isRequestDataValid } = require("../utils/appUtils");
const { SavedAddress ,User} = require("../models");
let { getCurrentDateAndTime } = require("../helpers/dates");

// Create a new saved address
exports.createSavedAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { doorNumber, streetName, city, state, pincode, country, addressType, location } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      doorNumber, streetName, city, state, pincode, country
    }
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    const isAlreadyAddressTypeExist = await SavedAddress.findOne({ userId, addressType, isDeleted: false });
    if (isAlreadyAddressTypeExist) throw { status: 409, message: "Address type is already taken. Try another one" }

    let savedAddressData = {
      location,
      addressType,
      doorNumber,
      streetName,
      city,
      state,
      pincode,
      country,
      userId,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,

    }
    const savedAddress = await SavedAddress.create(savedAddressData);
    const updatepartnerlocation = await User.findOneAndUpdate({_id:userId},{ $set: {location:location} }, { new: true, setDefaultsOnInsert: true });
    if (!savedAddress || !updatepartnerlocation) throw { status: 500, message: "Unable to save Address details. Try again" };
    res.status(200).send({ success: true, message: "Address added successfully", data: savedAddress });
  } catch (error) {
    next(error);
  }
};

// Get all saved addresses for the authenticated user
exports.getSavedAddresses = async (req, res, next) => {
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
      message: "Addresses data has been fetched successfully",
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
exports.updateSavedAddressById = async (req, res, next) => {
  try {
    const  userId  = req.user._id;
    let { doorNumber, streetName, city, state, pincode, country, id, location, addressType } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      doorNumber, streetName, city, state, pincode, country, id
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
      location,
      id,
      updatedAt: currentDateTime,

    };
    if (location) updateSavedAdresData.location = location;
    if (addressType) {
      const isAlreadyAddressTypeExist = await SavedAddress.findOne({ userId, addressType, isDeleted: false });
      if (isAlreadyAddressTypeExist && (isAlreadyAddressTypeExist._id).toString() !== id.toString()) throw { status: 409, message: "Address type is already taken. Try another one" }
      updateSavedAdresData.addressType = addressType;
    }
    const updatepartnerlocation = await User.findOneAndUpdate({_id:userId},{ $set: {location:location} }, { new: true, setDefaultsOnInsert: true });
    let data = await SavedAddress.findOneAndUpdate({ _id: id }, { $set: updateSavedAdresData }, { new: true, setDefaultsOnInsert: true });
    console.log(data,updatepartnerlocation)

    if (!data || !updatepartnerlocation) throw { status: 500, message: "Unable to Update Address details. Try again" }
    res.status(200).send({ success: true, message: "Address details updated successfully", data: data });
  } catch (error) {
    next(error);
  }
};

// Delete a saved address by ID for the authenticated user
exports.deleteSavedAddressById = async (req, res, next) => {
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
