let appUtils = require("../utils/appUtils");
let { isRequestDataValid } = appUtils;
let { Categories } = require("../models");
const { otpExpiryTime, sendSms } = require("../utils/appUtils");
let { getCurrentDateAndTime } = require("../helpers/dates");

exports.addCategories = async (req, res, next) => {
  try {
    let { name, logo, status } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      name,
      logo,
      status,
    };

    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    const category = new Categories({
      name,
      logo,
      status,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
    });

    // Save the category to the database
    const data = await category.save();

    if (!data) throw { status: 500, message: "Unable to store Categories. Try again" }
    res.status(200).send({ status: 1, success: true, message: "Adding Categories Success", data: data })

  } catch (error) {
    next(error)
  }
};

exports.editCategories = async (req, res, next) => {
  try {
    let { name, logo, status, id } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      name,
      logo,
      status,
      id,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

let updateCategoeryData ={
  name,
  logo,
  status,
  updatedAt: currentDateTime,
}
    let data = await Categories.findOneAndUpdate({ _id: id }, { $set: updateCategoeryData }, { new: true, setDefaultsOnInsert: true });
    if (!data) throw { status: 500, message: "Unable to Update Categories. Try again" };
    res.status(200).send({ status: 1, success: true, message: "Updating Categories Success", data: data })

  } catch (error) {
    next(error)
  }
};

exports.getCategories = async (req, res, next) => {
  try {
      let { id, limit, page, skip } = Object.assign(req.query);
      limit = parseInt(limit) || 10;
      page = parseInt(page) || 1;

      // Construct the filter object
      let filter = { isDeleted: false };
      if (id) {
          filter._id = id;
      }

      skip = (page - 1) * limit;
      const categoriesData = await Categories.find(filter).skip(skip).limit(limit);
      const totalDataCount = await Categories.countDocuments(filter);

      let responseData = {
        status: 1,
        success: true,
        message: "Category data has been fetched successfully",
        data:categoriesData,
       dataCount : categoriesData.length,
       totalDataCount : totalDataCount
    };
      res.status(200).send(responseData);
  } catch (error) {
      next(error);
  };
};


exports.deleteCategories = async (req, res, next) => {
  try {
    let { id } = Object.assign(req.body, req.query, req.params);
    let requiredFields = {
      id,
    };
    let currentDateTime = getCurrentDateAndTime();
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    // Update the document to mark it as deleted
    const result = await Categories.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, updatedAt: currentDateTime } });
    if (!result) throw{ status: 500, message: "Unable to delete Categoery. Try again" };
    res.status(200).send({ status: 1, success: true, message: "Delete Category success" })
  } catch (error) {
    next(error)
  }
};
