var express = require('express');
var router = express.Router();
let {
  auth,
  file,
  payment,
  categories,
  config,
  service,
  bookings,
  rating,
  slots,
  savedAddress,
  PartnerService
} = require('../controllers')
let { updateNewMobileValidation, verifyNewMobileOtpValidation, registrationValidations, registrationOtpValidations,
  userLoginValidations, savedAddressValidations, editSavedAddressValidations, bookSlotValidations, editProfileValidations,
  editbookSlotValidations, confirmPaymentValidations, initiatePaymentValidations
} = require("../validations")
let { validateUserAccessToken, checkUserAccess, checkPartnerAccess } = require("../middlewares/authentication.mlw")
const { isValidGetMethod, isValidPostMethod, isValidPutMethod, isValidDeleteMethod } = require("../middlewares/validateHttpMethods");
const { Bookings } = require('../models');



router.route('/register').all(isValidPostMethod).post(registrationValidations, auth.register);
router.route('/verifyOtp').all(isValidPostMethod).post(registrationOtpValidations, auth.verifyOtp);
router.route('/login').all(isValidPostMethod).post(userLoginValidations, auth.login);
router.route('/file/upload').all(isValidPostMethod).post(file.upload);
router.route('/fetch/profile').all(isValidGetMethod).get(validateUserAccessToken, auth.getProfile);
router.route('/profile/edit').all(isValidPutMethod).put(validateUserAccessToken, editProfileValidations, auth.editProfile);
router.route('/update/mobileno').all(isValidPutMethod).put(validateUserAccessToken, updateNewMobileValidation, auth.updateMobileNumber);
router.route('/updateMobile/verifyOtp').all(isValidPutMethod).put(validateUserAccessToken, verifyNewMobileOtpValidation, auth.verifyMobileNumberOtp);
router.route('/partner-services/add').all(isValidPostMethod).post(validateUserAccessToken, checkPartnerAccess, PartnerService.storePartnerServices);
router.route('/partner/fetch-stored-services').all(isValidGetMethod).get(validateUserAccessToken, checkPartnerAccess, PartnerService.fetchPartnerServices);

router.route('/partner-add-availability').all(isValidPutMethod).put(validateUserAccessToken, checkPartnerAccess, PartnerService.addSlotstoAvailability);
router.route('/partner-remove-availability').all(isValidPutMethod).put(validateUserAccessToken, checkPartnerAccess, PartnerService.removeSlotstoAvailability);

router.route('/partner-address/add').all(isValidPostMethod).post(validateUserAccessToken, checkPartnerAccess, savedAddressValidations, PartnerService.addPartnerAddress);
router.route('/partner-address/get').all(isValidGetMethod).get(validateUserAccessToken, checkPartnerAccess, PartnerService.getPartnerAddresses);
router.route('/partner-address/edit').all(isValidPutMethod).put(validateUserAccessToken, checkPartnerAccess, editSavedAddressValidations, PartnerService.updatePartnerAddress);
router.route('/partner-address/delete').all(isValidDeleteMethod).delete(validateUserAccessToken, checkPartnerAccess, PartnerService.deletePartnerAddressById);
router.route('/partner-documents/upload').all(isValidPostMethod).post(validateUserAccessToken, checkPartnerAccess, PartnerService.uploadDocuments);
router.route('/partner-documents/update').all(isValidPutMethod).put(validateUserAccessToken, checkPartnerAccess, PartnerService.updateDocuments);
router.route('/partner-documents/get').all(isValidGetMethod).get(validateUserAccessToken, checkPartnerAccess, PartnerService.getDocuments);
router.route('/partner-bookings/get').all(isValidGetMethod).get(validateUserAccessToken, checkPartnerAccess, PartnerService.getPartnerBookings);
router.route('/accept-bookings').all(isValidPostMethod).post(validateUserAccessToken, checkPartnerAccess, PartnerService.acceptPartnerBookings);
router.route('/compleated-service').all(isValidPostMethod).post(validateUserAccessToken, checkPartnerAccess, PartnerService.compleatedService);
router.route('/store-rating').all(isValidPostMethod).post(validateUserAccessToken, checkUserAccess, rating.storeRating);
router.route('/cancel-booking').all(isValidPutMethod).put(validateUserAccessToken, checkUserAccess, bookings.userCancelBooking);

router.route('/get-rating').all(isValidGetMethod).get(validateUserAccessToken, rating.fetchRatings);
router.route('/deletefrom-cart').all(isValidDeleteMethod).delete(validateUserAccessToken, checkUserAccess, bookings.deletefromCart);
router.route('/validate-promocode').all(isValidPostMethod).post(validateUserAccessToken, checkUserAccess, bookings.validatePromocode);
router.route('/getslots').all(isValidGetMethod).get(validateUserAccessToken, slots.getSlotsforUser);
router.route("/getslots-day").all(isValidGetMethod).get(validateUserAccessToken,slots.getSlotscountforday)
router.route('/verify-service-otp').all(isValidPostMethod).post(validateUserAccessToken, checkPartnerAccess, bookings.verifyServiceOtps);
router.route('/address/create').all(isValidPostMethod).post(validateUserAccessToken, checkUserAccess, savedAddressValidations, savedAddress.createSavedAddress);
router.route('/address/edit').all(isValidPutMethod).put(validateUserAccessToken, checkUserAccess, editSavedAddressValidations, savedAddress.updateSavedAddressById);
router.route('/address/get').all(isValidGetMethod).get(validateUserAccessToken, checkUserAccess, savedAddress.getSavedAddresses);
router.route('/address/delete').all(isValidDeleteMethod).delete(validateUserAccessToken, checkUserAccess, savedAddress.deleteSavedAddressById);
router.route('/categories/get').all(isValidGetMethod).get(validateUserAccessToken, categories.getCategories);
router.route('/services/get').all(isValidGetMethod).get(validateUserAccessToken, service.getServices);
router.route('/all-cart-items/get').all(isValidGetMethod).get(validateUserAccessToken, bookings.GetAllCartItems);
router.route('/bookslots').all(isValidPostMethod).post(validateUserAccessToken, checkUserAccess, bookSlotValidations, bookings.bookSlots);
router.route('/initiate-payment').all(isValidPostMethod).post(validateUserAccessToken, checkUserAccess, bookings.initiatePayment);
router.route('/confirm-payment').all(isValidPutMethod).put(validateUserAccessToken, checkUserAccess, confirmPaymentValidations, bookings.confirmPayment);
router.route('/getbooking-history').all(isValidGetMethod).get(validateUserAccessToken, checkUserAccess, bookings.getBookingHistory);
router.route('/getpayment-history').all(isValidGetMethod).get(validateUserAccessToken, checkUserAccess, bookings.getPaymentsHistory);
router.route('/getrazorpay-key').all(isValidGetMethod).get(validateUserAccessToken, bookings.getRazorPayKey);
router.route('/invoiceGen').all(isValidGetMethod).get(bookings.invoiceGen);


// router.post('/changePassword', auth.changePassword);
// router.post('/forgotPassword', auth.forgotPassword);
// router.post('/resetPassword', auth.resetPassword);
// router.put('/user/editUserProfile', auth.editUserProfile);
// router.post('/updateEmailOrMobileNumber', auth.updateEmailOrMobileNumber);
// router.post('/confirmCurrentEmailOrMobileNumber', auth.confirmEmailOrMobileNumber);
// router.put('/partner/editPartnerProfile', auth.editPartnerProfile);
// router.post('/socialLogin', auth.socialLogin);
// router.put('/socialLogin/editProfile', auth.socialLoginEditProfile);
// router.get('/superAdmin/fetch/usersAndPartners', auth.fetchAll);
// router.post('/superAdmin/approvePartner', auth.approvePartner);
// router.post('/partner/uploadSupportDocuments', auth.uploadSupportDocuments);
// router.put('/superAdmin/approveDocuments', auth.approveDocuments);
// router.post('/superAdmin/addSubAdmin', auth.addSubAdmin);
// router.post('/service/addService', service.addService);
// router.put('/service/editService', service.editService);
// router.post('/socialLogin', auth.socialLogin);
// // router.post('/getUserProfile', auth.getUserProfile)
// router.post('/resendOtp', auth.forgotPassword)
// //Rating Api's
// router.post("/bookings/addRating", rating.storeRating);
// router.put("/bookings/editRating", rating.editRating);
// router.get("/bookings/fetchRatings", rating.fetchRatings);

// /*-----------Crud_operations-----------------*/
// router.get('/get/:model', common.crud)
// router.post('/post/:model', common.crud)
// router.put('/put/:model', common.crud)
// router.get('/search/:model', common.crud)
// router.post('/postMany/:model', common.crud)
// router.delete('/delete/:model', common.crud)
// router.post('/upload', file.upload)
// router.post('/payment/store', payment.store);

// //for testing utils
// router.get('/test', tester.test);
// router.get('/setSlots', auth.setSlots);
// router.get('/fetch/config', config.getconfig);

// //get all categories 
// router.get('/categories/get', categories.getCategories);
// //get all services 
// router.get('/services/get', service.getServices);

module.exports = router;
