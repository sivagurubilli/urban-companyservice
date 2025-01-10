

var express = require('express');
var router = express.Router();
let {

  admin,
  categories,
  slots,
  service,
} = require('../controllers')
let {validateUserAccessToken,validateAdminAccessToken} = require("../middlewares/authentication.mlw")
router.post('/login', admin.adminLogin);
const { isValidGetMethod, isValidPostMethod, isValidPutMethod, isValidDeleteMethod } = require("../middlewares/validateHttpMethods");
const {createCategoeryValidations,editCategoeryValidations,createServiceValidations,editServiceValidations,
  createSlotDiscountValidations, createSlotsValidations, editSlotsValidations, editSlotDiscountValidations,
  getmatchingValidations,
} = require("../validations")

// Categories CRUD
router.route('/categories/create').all(isValidPostMethod).post(validateAdminAccessToken,createCategoeryValidations, categories.addCategories);
router.route('/categories/edit').all(isValidPutMethod).put(validateAdminAccessToken, editCategoeryValidations,categories.editCategories);
router.route('/categories/get').all(isValidGetMethod).get(validateAdminAccessToken, categories.getCategories);
router.route('/categories/delete').all(isValidDeleteMethod).delete(validateAdminAccessToken, categories.deleteCategories);

// Services CRUD
router.route('/services/create').all(isValidPostMethod).post(validateAdminAccessToken,createServiceValidations, service.addService);
router.route('/services/edit').all(isValidPutMethod).put(validateAdminAccessToken, editServiceValidations,service.editService);
router.route('/services/get').all(isValidGetMethod).get(validateAdminAccessToken, service.getServices);
router.route('/services/delete').all(isValidDeleteMethod).delete(validateAdminAccessToken, service.deleteServices);

// Slots CRUD
router.route('/slots/create').all(isValidPostMethod).post(validateAdminAccessToken, createSlotsValidations,slots.addSlot);
router.route('/slots/edit').all(isValidPutMethod).put(validateAdminAccessToken, editSlotsValidations,slots.editSlot);
router.route('/slots/get').all(isValidGetMethod).get(validateAdminAccessToken, slots.getSlots);
router.route('/slots/delete').all(isValidDeleteMethod).delete(validateAdminAccessToken, slots.deleteSlot);

// Slots Discount CRUD
router.route('/slot-discount/create').all(isValidPostMethod).post(validateAdminAccessToken,createSlotDiscountValidations, admin.addSlotDiscount);
router.route('/slot-discount/edit').all(isValidPutMethod).put(validateAdminAccessToken,editSlotDiscountValidations, admin.editSlotDiscount);
router.route('/slot-discount/get').all(isValidGetMethod).get(validateAdminAccessToken, admin.getSlotDiscount);
router.route('/slot-discount/delete').all(isValidDeleteMethod).delete(validateAdminAccessToken, admin.deleteSlotDiscount);

//promocodes
router.route('/promo-code/create').all(isValidPostMethod).post(validateAdminAccessToken, admin.createPromocode);
router.route('/promo-code/edit').all(isValidPutMethod).put(validateAdminAccessToken, admin.editPromocode);
router.route('/promo-code/get').all(isValidGetMethod).get(validateAdminAccessToken, admin.getPromocodes);
router.route('/promo-code/delete').all(isValidDeleteMethod).delete(validateAdminAccessToken, admin.deletePromocodes);


router.route('/get-all-bookings').all(isValidGetMethod).get(validateAdminAccessToken, admin.getallbookings);
router.route('/get-relavent-partners').all(isValidGetMethod).get(validateAdminAccessToken,admin.getmatchingpartner);
router.route('/allot-partners').all(isValidPostMethod).post(validateAdminAccessToken, admin.allotPartner);
router.route('/cancel-booking').all(isValidPostMethod).post(validateAdminAccessToken, admin.cancelBooking);
router.route('/verify-partner').all(isValidPostMethod).post(validateAdminAccessToken, admin.verifyPartnerProfile);
router.route('/get-partner-documents').all(isValidGetMethod).get(validateAdminAccessToken, admin.getPartenerDocuments);
router.route('/get-all-partners').all(isValidGetMethod).get(validateAdminAccessToken, admin.getAllPartnerdetails);
router.route('/get-all-customers').all(isValidGetMethod).get(validateAdminAccessToken, admin.getAllCustomersdetails);
router.route('/get-payment-histories').all(isValidGetMethod).get(validateAdminAccessToken, admin.adminPaymentsHistory);


router.route('/cancel-booking').all(isValidPostMethod).post(validateAdminAccessToken, admin.cancelBooking);


module.exports = router;