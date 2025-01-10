const axios = require("axios");
let { privateKey, adminEmail } = require("../config/config");
let appUtils = require("../utils/appUtils");
let { getCurrentDateAndTime } = require("../helpers/dates")
let { generateBlankProfileImages, capitalizeEveryInnerWord, responseJson, sendMail, sendMailTo, encryptData, isRequestDataValid, generateId, generateOtp, sendOtp, } = appUtils;
let { Slots, State, SupportDocuments, User, Role, Otp, Company, AnswerCombination } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const component = "auth.c";
const { otpExpiryTime, sendSms } = require("../utils/appUtils");
const moment = require("moment");
const { generateAccessToken } = require('../middlewares/authentication.mlw');

/**
 *
 * @param {mobileNo} req
 * @param {successMsg, data} res
 * @param {*} next
 */

exports.forgotPassword = async (req, res) => {
  // sends verification mail to registered mail id
  try {
    let { email, mobileNo, otp } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {};
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    otp = generateOtp();
    let body = {
      otp,
    };

    if (!email && !mobileNo) throw Error("email or mobileNo is missing");
    else if (email) {
      let emailData = await User.findOne({ email });
      if (!emailData) throw Error("No account existed with this email");
      else body.email = email;
    } else if (mobileNo) {
      let mobileNoData = await User.findOne({ mobileNo });
      if (!mobileNoData) throw Error("No account existed with this mobileNo");
      else body.mobileNo = mobileNo;
    }
    let otpData = await Otp.findOneAndUpdate(
      body,
      { $set: body },
      { new: true, upsert: true }
    ).lean();
    console.log({ otpData });
    if (!otpData) throw Error("Unable to generate otp");

    if (otpData && otpData.email) {
      sendMail({
        to: otpData.email,
        subject: "Otp for Forgot Password",
        type: "communication",
        options: {
          message: `Your latest otp is ${otp}.`,
        },
      });
    }
    res.send(
      responseJson(1, {}, "OTP sent successfully and is valid for 15 minutes")
    );
  } catch (e) {
    let statusCode = e.statusCode ? e.statusCode : 500;
    let msg = e.msg ? e.msg : "Failed";
    res.status(statusCode).send(responseJson(0, [], msg, e));
  }
};

exports.resetPassword = async (req, res) => {
  // sends verification mail to registered mail id
  try {
    let { email, mobileNo, otp, password } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      otp,
      password,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let body = { otp };
    let userBody = {};

    if (!email && !mobileNo) throw Error("email or mobileNo is missing");
    else if (email && email.length)
      (body.email = email), (userBody.email = email);
    else if (mobileNo && mobileNo.length)
      (body.mobileNo = mobileNo), (userBody.mobileNo = mobileNo);

    let otpData = await Otp.findOne(body);
    if (!otpData) throw Error("Invalid otp");

    let userData = await User.findOneAndUpdate(userBody, {
      $set: { password: bcrypt.hashSync(password, 8) },
    });
    if (!userData) throw Error("Unable to reset password.Try again");

    res.send(responseJson(1, {}, "Password reset success"));
  } catch (e) {
    let statusCode = e.statusCode ? e.statusCode : 500;
    let msg = e.msg ? e.msg : "Password reset failed";
    res.status(statusCode).send(responseJson(0, [], msg, e));
  }
};

//v2

// register
exports.register = async (req, res, next) => {
  try {
    let {
      name,
      mobileNo,
      gender,
      otp,
      role,
      location,
      firebaseToken
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      name,
      mobileNo,
      gender,
      role,
    };

    let currentDateTime = getCurrentDateAndTime()
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    if (gender != "male" && gender != "female" && gender !== "others") throw { status: 400, message: "Gender value should be male,female or others only" };
    if (role !== "user" && role !== "partner") throw { status: 400, message: "Please provide a valid role." }
    let checkMobileNo = await User.findOne({ mobileNo, isDeleted: false, role });
    if (checkMobileNo) throw { status: 409, message: "Mobile number is already taken. Try with another" }
    otp = generateOtp();
    let otpData = await Otp.findOneAndUpdate({ mobileNo, otp, role }, { $set: { mobileNo, otp, role } }, { new: true, upsert: true }).lean();
    if (!otpData) throw Error("Unable to send otp. Try again");
    let body = {
      name: capitalizeEveryInnerWord(name),
      gender: capitalizeEveryInnerWord(gender.toLowerCase()),
      mobileNo,
      role,
      about: "New to the litzo services. Nothing to say about to me",
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
      imageUrl: generateBlankProfileImages(capitalizeEveryInnerWord(gender.toLowerCase())),
      location,
      firebaseToken
    };
    let userData = await User.create(body);
    userData = JSON.parse(JSON.stringify(userData));
    if (!userData) throw Error("User creation failed.Try again!");
    res.status(201).send({ status: 1, success: true, message: "OTP sent successfully and is valid for 15 minutes", data: userData })
  } catch (error) {
    next(error)
  };
};

exports.verifyOtp = async (req, res, next) => {
  try {
    let {
      mobileNo,
      otp,
      role,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      role,
      otp,
      mobileNo
    };
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let currentDateTime = getCurrentDateAndTime()
    let otpData = await Otp.findOne({ mobileNo, otp, role }).lean();
    if (!otpData) {
      throw { status: 422, message: "The OTP is either incorrect or expired" };
    }
    let data = await User.findOneAndUpdate({ mobileNo, role }, {
      isVerified: true,
      updatedAt: currentDateTime
    }, { new: true }).lean();
    data = JSON.parse(JSON.stringify(data));
    data.accessToken = generateAccessToken(data);
    res.status(200).send({ status: 1, success: true, message: "OTP verified successfully", data })
  } catch (error) {
    console.log({ error })
    next(error)
  }
};

exports.login = async (req, res, next) => {
  try {
    let {
      mobileNo,
      role,
      firebaseToken,
      location
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      mobileNo,
      role
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let currentDateTime = getCurrentDateAndTime();
    let dbQuery = { isDeleted: false, role, mobileNo };

    let user = await User.findOne(dbQuery).lean();
    user = JSON.parse(JSON.stringify(user));
    if (!user) throw { status: 404, message: "No account found!" };
    else {
      let otp = generateOtp();
      let otpBody = { otp, mobileNo, role };
      let otpData = await Otp.findOneAndUpdate(otpBody, { $set: otpBody }, { new: true, upsert: true });
      if (!otpData) throw { message: "Unable to send otp. Try again" }
      let updateBody = { updatedAt: currentDateTime };
      if (firebaseToken) updateBody.firebaseToken = firebaseToken;
      if (location) updateBody.location = location;
      user = await User.findOneAndUpdate({ _id: user._id }, { $set: updateBody }, { new: user });

      res.status(200).send({
        status: 1, success: true, message: "Otp sent to mobile number. Please verify the otp to login.",
        data: {
          userId: user._id,
          mobileNo: user.mobileNo,
          isVerified: user.isVerified,
        }
      })
    }
  } catch (error) {
    next(error)
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    let user = req.user;
    res.status(200).send({ status: 1, success: true, message: "Profile fetched successfully", data: user })

  }
  catch (error) {
    next(error)
  }
}



exports.editProfile = async (req, res, next) => {
  try {
    let {
      name,
      gender,
      firebaseToken,
      imageUrl,
      about,
      location,
      availability
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {

    };

    let {user} = req
    const userId = req.user._id
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    let currentDateTime = getCurrentDateAndTime();

    let updateUserData = {
      updatedAt: currentDateTime
    };

    if (name) updateUserData.name = capitalizeEveryInnerWord(name)
    if (gender) updateUserData.gender = gender.toLowerCase()
    if (firebaseToken) updateUserData.firebaseToken = firebaseToken
    if (imageUrl) updateUserData.imageUrl = imageUrl
    if (about) updateUserData.about = about
    if (location) updateUserData.location = location
    if (availability) {
      if (availability?.length === 0) {
        throw { status: 404, message: "Please provide slots" };
      }

    
      const hasDuplicates = new Set(availability).size !== availability.length;
      if (hasDuplicates) {
          throw { status: 400, message: "Slot IDs cannot contain duplicates" };
      }
      const slots = await Slots.find({ _id: { $in: availability }, isDeleted: false, isActive: true });
      // Check if all slots exist
      if (slots?.length !== availability?.length) {
        throw { status: 404, message: "One or more slots not available" };
      }

      

      // Add the availability of all found slots to the user
      const availabilityNew = slots.map(slot => ({
        slotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        day: slot.day,
        isActive: slot.isActive
      }));
      updateUserData.availability = availabilityNew
    }
    let userData = await User.findOneAndUpdate({ _id: userId }, { $set: updateUserData }, { new: true, setDefaultsOnInsert: true });
    if (!userData) throw { status: 500, message: "Unable to update the user profile. Try Again" }
    res.status(200).send({ status: 1, message: 'Profile Updation Success', data: { userData: userData } })
  } catch (error) {
    next(error)
  }
};



exports.updateMobileNumber = async (req, res, next) => {
  try {
    let { mobileNo } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      mobileNo,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    const userId = req.user._id

    let userData = await User.findOne({ mobileNo: mobileNo, isDeleted: false });
    if (userData && (userData._id).toString() == (userId).toString()) throw { status: 400, message: "Please provide new mobile number to update" }
    if (userData && (userData._id).toString() != (userId).toString()) throw { status: 409, message: "This phone number is associated with an account.  Please try with another!" }
    let otp = generateOtp();
    let body = {
      otp,
      mobileNo
    };

    let otpData = await Otp.findOneAndUpdate(body, { $set: body }, { new: true, upsert: true }).lean();
    if (!otpData) throw ({ status: 500, message: "Unable to generate otp" })
    res.status(200).send({ status: 1, message: 'OTP sent successfully and is valid for 15 minutes' })
  } catch (error) {
    next(error)
  }
};


exports.verifyMobileNumberOtp = async (req, res, next) => {
  try {
    let {
      mobileNo,
      otp
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      mobileNo,
      otp
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    let otpData = await Otp.findOne({ mobileNo, otp })
    if (!otpData) throw { status: 422, message: "The OTP is either incorrect or expired" }

    let data = await User.findOneAndUpdate({ _id: req.user._id }, { $set: { mobileNo } }, { new: true })
    if (!data) throw ({ status: 500, message: "Unable to update the mobile number. Try again" })
    res.status(200).send({ status: 1, message: 'OTP verified and new mobile number updated successfully', data: data })

  }
  catch (error) {
    next(error)
  }
}



exports.changePassword = async (req, res, next) => {
  try {
    // expected body - mobileNo, password
    let { newPassword, roles, email, mobileNo } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      roles,
      newPassword,
    };
    if (roles == "employee" || roles == "corporateAdmin" || roles == "admin")
      requiredFields.email = email;
    if (roles == "user") requiredFields.mobileNo = mobileNo;
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userQuery =
      roles == "employee" || roles == "admin" || roles == "corporateAdmin"
        ? { email }
        : { mobileNo };
    let userData = await User.findOne(userQuery)
      .select("password isVerified")
      .lean();

    let updateQuery =
      roles == "employee" || roles == "admin" || roles == "corporateAdmin"
        ? { email }
        : { mobileNo };

    await User.findOneAndUpdate(updateQuery, {
      password: bcrypt.hashSync(newPassword, 8),
      isVerified: true,
    });
    /**
     * run login api, check if mail is triggered with otp and check response has requirePassword
     * run change password api and check if password is updated in db
     * check
     * run login api again and check if requirepassword update is false
     * run login api with admin role, check if require password is false
     */
    res.send(responseJson(1, [], "success"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "failed", e));
  };
};

//SocialMedia_Login
exports.socialLogin = async (req, res) => {
  try {
    let {
      email,
      imageUrl,
      roles,
      socialAccountId,
      name,
      socialAccountName,
      isEmailVerified,
      isEmailUpdated,
      isVerified,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      email,
      socialAccountId,
      socialAccountName,
    };
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);
    let dbQuery;
    if (socialAccountName != "facebook" && socialAccountName != "google")
      throw Error("Social Account should be facebook or google only.");
    if (socialAccountName == "google") {
      dbQuery = {
        $or: [{ email }, { email, socialAccountId, socialAccountName }],
      };
      let checkEmail = await User.findOne({ email });
      if (checkEmail && checkEmail.loginType == "manual")
        throw Error("Account is manually registered");
    } else if (socialAccountName == "facebook") {
      dbQuery = { email, socialAccountId, socialAccountName };
    }

    if (email) {
      (isEmailUpdated = true), (isEmailVerified = true);
    } else {
      (isEmailUpdated = false), (isEmailVerified = false);
    }
    let data;
    const checkAccount = await User.findOne(dbQuery).populate("roles");

    if (checkAccount) {
      data = checkAccount;

      var authorities = [];
      for (let i = 0; i < data.roles.length; i++) {
        authorities.push("ROLE_" + data.roles[i].name.toUpperCase());
      }
    } else if (!checkAccount) {
      let rolesData = await Role.findOne({ name: roles });
      if (!rolesData) throw Error("Roles not found for this user");

      data = await User.create({
        isEmailUpdated,
        isEmailVerified,
        email,
        socialAccountId,
        socialAccountName,
        imageUrl,
        name,
        roles: [rolesData._id],
        loginType: "social",
      });
      //For to findout the roles
      var authorities = [];

      for (let i = 0; i < data.roles.length; i++) {
        authorities.push("ROLE_" + rolesData.name.toUpperCase());
      }
    }

    //  Token Generation
    var token = jwt.sign({ id: data.id }, privateKey, {
      expiresIn: 86400, // 24 hours
    });

    res.status(200).send(
      responseJson(
        1,
        {
          id: data._id,
          email: data.email,
          socialAccountId: data.socialAccountId,
          socialAccountName: data.socialAccountName,
          name: data.name,
          roles: authorities,
          accessToken: token,
          imageUrl: data.imageUrl,
          mobileNo: data.mobileNo,
          isEmailUpdated: data.isEmailUpdated,
          isEmailVerified: data.isEmailVerified,
        },
        "Social Login Successful"
      )
    );
  } catch (e) {
    let statusCode = e.statusCode ? e.statusCode : 500;
    let msg = e.msg ? e.msg : "Social Login Failed";
    res.status(statusCode).send(responseJson(0, [], msg, e));
  }
};

exports.uploadSupportDocuments = async (req, res) => {
  try {
    let {
      userId,
      aadharNumber,
      pancardNumber,
      liveImageUrl,
      covidCertificateUrl,
      aadharFrontImageUrl,
      addharBackImageUrl,
      pancardImageUrl,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      userId,
      aadharNumber,
      pancardNumber,
      liveImageUrl,
      aadharFrontImageUrl,
      addharBackImageUrl,
      pancardImageUrl,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let checkUser = await User.findById(userId).populate([{ path: "roles" }]);
    if (!checkUser) throw Error("Invalid userId");
    if (checkUser && checkUser.roles[0].name == "user")
      throw Error("Documents not needed for users.");

    let documentsData = await SupportDocuments.findOne({ userId });
    if (documentsData && checkUser.isDocumentsVerified == true)
      throw Error("Documents already verified");

    let updateBody = {
      userId,
      aadharNumber,
      pancardNumber,
      liveImageUrl,
      aadharFrontImageUrl,
      addharBackImageUrl,
      pancardImageUrl,
      isDocumentsVerified: false,
      isDeleted: false,
    };
    if (covidCertificateUrl)
      updateBody.covidCertificateUrl = covidCertificateUrl;

    documentsData = await SupportDocuments.findOneAndUpdate(
      { userId },
      {
        $set: updateBody,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!documentsData) throw Error("Unable to submit documents.Try again");
    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { isDocumentsUploaded: true } },
      { new: true }
    );

    res
      .status(200)
      .send(responseJson(1, documentsData, "Documents Submission Success"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Documents Submission failed", e));
  }
};

exports.editUserProfile = async (req, res) => {
  try {
    let {
      name,
      dob,
      gender,
      mediaLink,
      userId,
      firebaseToken,
      address,
      imageUrl,
      about,
      location,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      userId,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userData = await User.findById(userId);
    if (!userData || (userData && userData.isDeleted == true))
      throw Error("No user found");

    if (dob) dob = moment(dob).format("YYYY-MM-DD");
    let age = Math.floor((new Date() - new Date(dob).getTime()) / 3.15576e10);

    let addressBody = {};
    addressBody.doorNumber =
      address && address.doorNumber
        ? address.doorNumber
        : userData.address.doorNumber;
    addressBody.streetName =
      address && address.streetName
        ? address.streetName
        : userData.address.streetName;
    addressBody.city =
      address && address.city ? address.city : userData.address.city;
    addressBody.stateId =
      address && address.stateId ? address.stateId : userData.address.stateId;
    addressBody.pincode =
      address && address.pincode ? address.pincode : userData.address.pincode;

    let body = {
      name: name ? capitalizeEveryInnerWord(name) : userData.name,
      dob: dob ? dob : userData.dob,
      age: age ? age : userData.age,
      gender: gender
        ? capitalizeEveryInnerWord(gender.trim())
        : userData.gender,
      location: location ? location : userData.location,
      mediaLink: mediaLink ? mediaLink : userData.mediaLink,
      firebaseToken: firebaseToken ? firebaseToken : userData.firebaseToken,
      address: addressBody,
      imageUrl: imageUrl ? imageUrl : userData.imageUrl,
      about: about ? about : userData.about,
      location: location ? location : userData.location,
    };

    userData = await User.findOneAndUpdate(
      { _id: userId },
      { $set: body },
      { new: true, setDefaultsOnInsert: true }
    );
    res.status(200).send(responseJson(1, userData, "Profile Updation Success"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Profile Updation failed", e));
  }
};

exports.updateEmailOrMobileNumber = async (req, res) => {
  try {
    let { email, mobileNo, userId, otp } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      userId,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userData = await User.findById(userId);
    if (!userData || (userData && userData.isDeleted == true))
      throw Error("No user found");

    otp = generateOtp();
    let body = {
      otp,
    };

    if (!email && !mobileNo) throw Error("email or mobileNo is missing");
    else if (email) {
      let emailData = await User.findOne({ email });
      if (emailData && userId.toString() == emailData._id.toString())
        throw Error("Please provide new email");
      else if (emailData && userId.toString() != emailData._id.toString())
        throw Error("Email is already taken");
      else body.email = email;
    } else if (mobileNo) {
      let mobileNoData = await User.findOne({ mobileNo });
      if (mobileNoData && userId.toString() == mobileNoData._id.toString())
        throw Error("Please provide new mobileNo");
      else if (mobileNoData && userId.toString() != mobileNoData._id.toString())
        throw Error("MobileNumber is  already taken");
      else body.mobileNo = mobileNo;
    }

    let otpData = await Otp.findOneAndUpdate(
      body,
      { $set: body },
      { new: true, upsert: true }
    ).lean();
    console.log({ otpData });
    if (!otpData) throw Error("Unable to generate otp");

    if (otpData && otpData.email) {
      sendMail({
        to: userData.email,
        subject: "Otp for Update New Email",
        type: "communication",
        options: {
          message: `Your latest otp is ${otp}.Please verify the account before the otp expires.`,
        },
      });
    }

    res.send(
      responseJson(1, {}, "OTP sent successfully and is valid for 15 minutes")
    );
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "OTP sending failed", e));
  }
};

exports.confirmEmailOrMobileNumber = async (req, res) => {
  try {
    let { email, mobileNo, userId, otp } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      userId,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userData = await User.findById(userId);
    if (!userData || (userData && userData.isDeleted == true))
      throw Error("No user found");

    otp = generateOtp();
    let body = {
      otp,
    };

    if (!email && !mobileNo) throw Error("email or mobileNo is missing");
    else if (email) {
      let emailData = await User.findOne({ email });
      if (emailData && userId.toString() != emailData._id.toString())
        throw Error("Please provide current email");
      else body.email = email;
    } else if (mobileNo) {
      let mobileNoData = await User.findOne({ mobileNo });
      if (mobileNoData && userId.toString() != mobileNoData._id.toString())
        throw Error("Please provide current mobileNo");
      else body.mobileNo = mobileNo;
    }

    let otpData = await Otp.findOneAndUpdate(
      body,
      { $set: body },
      { new: true, upsert: true }
    ).lean();
    console.log({ otpData });
    if (!otpData) throw Error("Unable to generate otp");

    if (otpData && otpData.email) {
      sendMail({
        to: userData.email,
        subject: "Otp for confirmation of current email",
        type: "communication",
        options: {
          message: `Your latest otp is ${otp}.Please confirm the current email with the otp`,
        },
      });
    }

    res.send(
      responseJson(1, {}, "OTP sent successfully and is valid for 15 minutes")
    );
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "OTP sending failed", e));
  }
};

exports.verifyOtps = async (req, res, next) => {
  try {
    let { mobileNo, otp, email, userId } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      userId,
      otp,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userData = await User.findById(userId);
    if (!userData || (userData && userData.isDeleted == true))
      throw Error("No user found");

    let otpDbBody = { otp };
    let userDbBody = {};

    if (!email && !mobileNo) throw Error("email or mobileNo is missing");
    else if (email)
      (otpDbBody.email = email),
        (userDbBody.email = email),
        (userDbBody.isEmailVerified = true),
        (isEmailUpdated = true);
    else if (mobileNo)
      (otpDbBody.mobileNo = mobileNo),
        (userDbBody.mobileNo = mobileNo),
        (userDbBody.isVerified = true);

    //Verifying otp
    let otpData = await Otp.findOne(otpDbBody).lean();
    if (!otpData) {
      throw {
        statusCode: 422,
        msg: "The OTP is either incorrect or expired",
      };
    }

    //Updating field in User
    let data = await User.findOneAndUpdate(
      { _id: userId },
      {
        $set: userDbBody,
      },
      { new: true }
    ).populate([{ path: "roles" }]);

    res.status(200).send(responseJson(1, data, "OTP verified successfully"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Otp Verification failed", e));
  }
};

exports.setSlots = async (req, res) => {
  try {
    let data = await Slots.updateMany(
      {},
      { $set: { isDeleted: false } },
      { multi: true }
    );
    res.status(200).send(responseJson(1, data, "OTP verified successfully"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Otp Verification failed", e));
  }
};

exports.editPartnerProfile = async (req, res) => {
  try {
    let {
      name,
      dob,
      gender,
      mediaLink,
      userId,
      firebaseToken,
      address,
      imageUrl,
      about,
      location,
      availability,
      services,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      userId,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userData = await User.findById(userId).populate([{ path: "roles" }]);
    if (!userData || (userData && userData.isDeleted == true))
      throw Error("No user found");

    if (dob) dob = moment(dob).format("YYYY-MM-DD");
    let age = Math.floor((new Date() - new Date(dob).getTime()) / 3.15576e10);

    let addressBody = {};
    addressBody.doorNumber =
      address && address.doorNumber
        ? address.doorNumber
        : userData.address.doorNumber;
    addressBody.streetName =
      address && address.streetName
        ? address.streetName
        : userData.address.streetName;
    addressBody.city =
      address && address.city ? address.city : userData.address.city;
    addressBody.stateId =
      address && address.stateId ? address.stateId : userData.address.stateId;
    addressBody.pincode =
      address && address.pincode ? address.pincode : userData.address.pincode;

    let body = {
      name: name ? capitalizeEveryInnerWord(name) : userData.name,
      dob: dob ? dob : userData.dob,
      age: age ? age : userData.age,
      gender: gender
        ? capitalizeEveryInnerWord(gender.trim())
        : userData.gender,
      location: location ? location : userData.location,
      mediaLink: mediaLink ? mediaLink : userData.mediaLink,
      firebaseToken: firebaseToken ? firebaseToken : userData.firebaseToken,
      address: addressBody,
      imageUrl: imageUrl ? imageUrl : userData.imageUrl,
      about: about ? about : userData.about,
      location: location ? location : userData.location,
      availability:
        availability && availability.length
          ? availability
          : userData.availability,
      services: services && services.length ? services : userData.services,
    };

    userData = await User.findOneAndUpdate({ _id: userId }, body, {
      new: true,
      setDefaultsOnInsert: true,
    });
    res.status(200).send(responseJson(1, userData, "Profile Updation Success"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Profile Updation failed", e));
  }
};

exports.editPartnerAvailablityAndServices = async (req, res) => {
  try {
    let { userId, availability, services } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      userId,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userData = await User.findById(userId).populate([{ path: "roles" }]);
    if (!userData || (userData && userData.isDeleted == true))
      throw Error("No user found");

    let body = {
      services: services && services.length ? services : userData.services,
    };

    if (availability) {
      body.availability =
        availability && availability.length
          ? availability
          : userData.availability;
    }

    if (services) {
      body.services =
        services && services.length ? services : userData.services;
    }

    console.log({ body });

    userData = await User.findOneAndUpdate({ _id: userId }, body, {
      new: true,
      setDefaultsOnInsert: true,
    });
    res.status(200).send(responseJson(1, userData, "Profile Updation Success"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Profile Updation failed", e));
  }
};

exports.approveDocuments = async (req, res) => {
  try {
    let { userId, supportDocumentId, status, comments, emailMessage } =
      Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      userId,
      supportDocumentId,
      status,
    };
    if (status == "rejected") requiredFields.comments = comments;
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    if (status !== "approved" && status !== "rejected")
      throw Error("status value should be approved or rejected only");

    let documentsData = await SupportDocuments.findOne({
      _id: supportDocumentId,
      userId,
    });
    if (!documentsData) throw Error("No documents available");

    let updateBody = {};
    if (status == "approved")
      (updateBody.isDocumentsVerified = true),
        (updateBody.comments = comments
          ? comments
          : "Documents Verified successfully"),
        (emailMessage = `Your documents has been approved successfully.You can use our services ultimately from now. `);
    if (status == "rejected")
      (updateBody.isDocumentsVerified = false),
        (updateBody.comments = comments),
        (emailMessage = `Your documents has been rejected.You can find the below reasons for rejections :${comments} `);
    documentsData = await SupportDocuments.findOneAndUpdate(
      { _id: supportDocumentId, userId },
      { $set: updateBody },
      { new: true }
    ).populate([{ path: "userId", select: "name email" }]);

    if (documentsData.userId.email) {
      sendMail({
        to: documentsData.userId.email,
        subject: "Update on Supporting Documents",
        type: "communication",
        options: {
          message: `Dear ${documentsData.userId.name},${emailMessage}`,
        },
      });
    }

    res
      .status(200)
      .send(
        responseJson(
          1,
          documentsData,
          `Supporting Documents updated successfully`
        )
      );
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(
        responseJson(0, [], e.msg || "Supporting Documents updated  failed", e)
      );
  }
};

exports.approvePartner = async (req, res) => {
  try {
    let { userId, isAdminApproved } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      userId,
      isAdminApproved,
    };
    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let roleId = await Role.findOne({ name: "partner" }).distinct("_id");

    let userData = await User.findOne({ _id: userId, roles: { $in: roleId } });
    if (!userData) throw Error("No partner available. Invalid userId");

    userData = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { isAdminApproved } },
      { new: true }
    );

    if (userData.isAdminApproved == true && userData.email) {
      sendMail({
        to: userData.email,
        subject: "Account Approval",
        type: "communication",
        options: {
          message: `Dear ${userData.name},Your account has been approved by the admin successfully`,
        },
      });
    }

    res
      .status(200)
      .send(responseJson(1, userData, `Partner approved successfully`));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Partner approval failed", e));
  }
};

exports.fetchAll = async (req, res) => {
  try {
    let {
      roles,
      isAdminApproved,
      id,
      email,
      mobileNo,
      isVerified,
      limit,
      page,
      skip,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {};
    if (roles !== "user" && roles !== "partner")
      throw Error("Invalid role provided. please provide valid one");
    let rolesData = await Role.find({});
    let userRoleId;
    let partnerRoleId;
    let superAdminRoleId;

    limit = limit ? parseInt(limit) : 50;
    page = page ? parseInt(page) : 1;
    skip = parseInt(limit) * parseInt(page - 1);

    rolesData.map((x) => {
      if (x.name == "user") userRoleId = x._id;
      if (x.name == "partner") partnerRoleId = x._id;
      if (x.name == "superAdmin") superAdminRoleId = x._id;
    });

    let dbQuery = { isDeleted: false };
    if (!roles) dbQuery.roles = { $nin: [superAdminRoleId] };
    if (roles == "user") dbQuery.roles = { $in: [userRoleId] };
    if (roles == "partner") dbQuery.roles = { $in: [partnerRoleId] };
    if (isAdminApproved) dbQuery.isAdminApproved = isAdminApproved;
    if (isVerified) dbQuery.isVerified = isVerified;
    if (id) dbQuery._id = id;
    if (email) dbQuery.email = email;
    if (mobileNo) dbQuery.mobileNo = mobileNo;

    console.log({ dbQuery });
    let data = await User.find(dbQuery)
      .populate([
        { path: "services", select: "name" },
        { path: "roles", select: "name" },
      ])
      .limit(limit)
      .skip(skip);
    res
      .status(200)
      .send(
        responseJson(1, data, `Data fetched successfully`, {}, data.length)
      );
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Fetching failed", e));
  }
};

exports.addSubAdmin = async (req, res) => {
  try {
    let {
      name,
      dob,
      gender,
      password,
      roles,
      age,
      email,
      mobileNo,
      firebaseToken,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      name,
      dob,
      gender,
      password,
      roles,
      mobileNo,
      email,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    if (
      gender.toLowerCase().trim() != "male" &&
      gender.toLowerCase().trim() != "female"
    )
      throw Error("Gender value should be male or female only");

    let rolesData = await Role.findOne({ name: roles });
    if (!rolesData) throw Error("Roles not found for this user");

    let checkMobileNo = await User.findOne({ mobileNo });
    if (checkMobileNo) throw Error("Mobile Number already taken");

    if (email) {
      let checkEmail = await User.findOne({ email });
      if (checkEmail) throw Error("Email already taken");
    }

    if (dob) {
      dob = moment(dob).format("YYYY-MM-DD");
      age = Math.floor((new Date() - new Date(dob).getTime()) / 3.15576e10);
      gender = gender.trim();
    }
    let body = {
      name: capitalizeEveryInnerWord(name),
      dob,
      age,
      gender: capitalizeEveryInnerWord(gender.toLowerCase()),
      password: bcrypt.hashSync(password, 8),
      roles: [rolesData._id],
      mobileNo,
      loginType: "manual",
      email,
      isEmailUpdated: true,
      isEmailVerified: true,
      isVerified: true,
      isDeleted: false,
      firebaseToken,
      about: "New to the litzo services.Nothing to say about to me",
      imageUrl: generateBlankProfileImages(
        capitalizeEveryInnerWord(gender.toLowerCase())
      ),
    };

    let userData = await User.create(body);
    userData = JSON.parse(JSON.stringify(userData));
    if (!userData) throw Error("Unable to create user");

    userData.userId = userData._id;
    res.send(responseJson(1, userData, "Accounts creation success"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Account creation failed", e));
  }
};

exports.socialLogin = async (req, res) => {
  try {
    let { email, socialAccountId, loginType, roles } = Object.assign(
      req.body,
      req.query,
      req.params
    );

    let requiredFields = {
      email,
      socialAccountId,
      loginType,
      roles,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    if (loginType !== "google" && loginType !== "facebook")
      throw Error("loginType should be google and facebook only");

    let rolesData = await Role.findOne({ name: roles });
    if (!rolesData) throw Error("Roles not found for this user");

    let userData = await User.findOne({ email });
    if (userData && userData.loginType !== "google")
      throw Error("Try login with manually.");
    else if (!userData) {
      userData = await User.create({
        email,
        socialAccountId,
        loginType,
        isVerified: false,
        isEmailUpdated: true,
        isEmailVerified: true,
        roles: [rolesData._id],
      });
    }
    userData = JSON.parse(JSON.stringify(userData));
    userData.userId = userData._id;
    res.send(responseJson(1, userData, "Social Login success"));
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(responseJson(0, [], e.msg || "Social Login failed", e));
  }
};

exports.socialLoginEditProfile = async (req, res) => {
  try {
    let {
      email,
      userId,
      name,
      password,
      gender,
      firebaseToken,
      location,
      mobileNo,
      age,
      dob,
      otp,
    } = Object.assign(req.body, req.query, req.params);

    let requiredFields = {
      email,
      userId,
      name,
      password,
      gender,
      mobileNo,
    };

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId);
    if (requestDataValid !== true) throw Error(requestDataValid);

    let checkMobileNo = await User.findOne({ mobileNo });
    if (checkMobileNo && checkMobileNo._id.toString() !== userId.toString())
      throw Error("Mobile number is already exist.Try another");

    if (dob) {
      dob = moment(dob).format("YYYY-MM-DD");
      age = Math.floor((new Date() - new Date(dob).getTime()) / 3.15576e10);
      gender = gender.trim();
    }

    let updateBody = {
      name: capitalizeEveryInnerWord(name),
      dob,
      age,
      gender: capitalizeEveryInnerWord(gender.toLowerCase()),
      password: bcrypt.hashSync(password, 8),
      mobileNo,
      about: "New to the litzo services.Nothing to say about to me",
      imageUrl: generateBlankProfileImages(
        capitalizeEveryInnerWord(gender.toLowerCase())
      ),
    };
    if (firebaseToken) updateBody.firebaseToken = firebaseToken;
    if (location) updateBody.location = location;

    otp = generateOtp();
    let otpData = await Otp.findOneAndUpdate(
      { mobileNo, otp },
      { $set: { mobileNo, otp } },
      { new: true, upsert: true }
    ).lean();
    if (!otpData) throw Error("Unable to generate otp");

    let userData = await User.findOneAndUpdate(
      { email, _id: userId },
      {
        $set: updateBody,
      },
      { new: true }
    );
    if (!userData) throw Error("Invalid user and email");
    userData = JSON.parse(JSON.stringify(userData));
    userData.userId = userData._id;

    if (userData && userData.email) {
      sendMail({
        to: userData.email,
        subject: "Otp for registration Verification",
        type: "communication",
        options: {
          message: `Your latest otp is ${otp}. Please verify the account before the otp expires.`,
        },
      });
    }
    res.send(
      responseJson(1, userData, "Otp sent to mobile number successfully")
    );
  } catch (e) {
    res
      .status(e.statusCode || 500)
      .send(
        responseJson(0, [], e.msg || "Social Login Profile updation failed", e)
      );
  }
};
