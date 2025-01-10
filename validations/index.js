const { updateNewMobileValidation } = require("./updateNewMobileValidations");
const { verifyNewMobileOtpValidation } = require("./verifyNewMobileOtpValidation");
const {registrationValidations} = require("./registrationValidation")
const {registrationOtpValidations} = require("./registrationOtpVlidations")
const {userLoginValidations} = require("./userLoginValidations")
const {editSavedAddressValidations} = require("./editSaveAddressValidations")
const {savedAddressValidations} = require("./saveAddressValidations")
const {editCategoeryValidations} = require("./admin/editCategoeryValidations")
const {createCategoeryValidations} = require("./admin/createCategoryValidation")
const {createServiceValidations} = require("./admin/createServiceValidations")
const {editServiceValidations} = require("./admin/editServiceValidations")
const {createSlotsValidations} = require("./admin/createSlotsValidation")
const {editSlotsValidations}  = require("./admin/editSlotValidation")
const {editSlotDiscountValidations} = require("./admin/editSlotDiscountValidation")
const {createSlotDiscountValidations} = require("./admin/createSlotDiscountValidation")
const {getmatchingValidations} = require('./admin/getmatchingpartnersValidations')
const {bookSlotValidations,editbookSlotValidations} = require("./bookSlotValdation")
const {editProfileValidations} = require("./editProfileValidation")
const {initiatePaymentValidations} = require("./initiatePaymentValidation")
const {confirmPaymentValidations} = require("./confirmPaymentValidation")


module.exports = {
    registrationValidations,
    updateNewMobileValidation,
    verifyNewMobileOtpValidation,
    registrationOtpValidations,
    userLoginValidations,
    savedAddressValidations,
    editSavedAddressValidations,
    editCategoeryValidations,
    createCategoeryValidations,
    createServiceValidations,
    editServiceValidations,
    createSlotsValidations,
    editSlotsValidations,
    editSlotDiscountValidations,
    createSlotDiscountValidations,
    bookSlotValidations,
    editbookSlotValidations,
    editProfileValidations,
    getmatchingValidations,
    confirmPaymentValidations,
    initiatePaymentValidations
}