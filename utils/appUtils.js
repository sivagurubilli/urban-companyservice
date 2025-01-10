'use strict'

var multer = require('multer');
var http = require('http');
var axios = require('axios');
var multerS3 = require('multer-s3');
var crypto = require('crypto');
var pug = require("pug");
const path = require('path');
const Razorpay = require('razorpay');
let config = require('../config/config')
let { razorpay } = require("../config/config")
const emailTemplates = path.resolve(__dirname, "../views/emailTemplates/");
let { Bookings, User, Otp, Notification, CronTask, SlotDiscounts, FitnessChallenge, Services, Slots, Payment } = require('../models');
// var s3Uploader = multer({ storage: multerS3(config.multerStorage) }).single('file')
const s3Uploader = multer({
  storage: multerS3(config.multerStorage),
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('file');
var localUploader = multer({ storage: multer.diskStorage(config.localStorage) }).single('file')
var { xml2js, parseString } = require('xml2js');
var fs = require('fs');
var Handlebars = require('handlebars');
const { isNullOrUndefined } = require('util');
const { firebaseAdm } = config;
const models = require('../models');
var notify = firebaseAdm.messaging();
const puppeteer = require('puppeteer');
const { promisify } = require('util');
const schedule = require('node-schedule');
const nodeCron = require('node-cron')
const pdf = require('html-pdf');
const moment = require("moment");
let functions = {}
functions.responseJson = (status, data, message, error, dataCount, totalDataCount,) => {
  let err = {}
  let logType = 'log'
  if (error) {
    if (error.status || error.error) {
      err = { ...error }
    } else {
      err.message = error.message
      err.data = JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 240)
    }
    logType = 'error'
  }
  return { status, data, message, error: err, dataCount, totalDataCount }
}

functions.encryptData = (data) => {
  try {
    let key = data.key.toString()
    var mykey = crypto.createCipher('aes-128-cbc', config.privateKey);
    var encryptedStr = mykey.update(key, 'utf8', 'hex')
    encryptedStr += mykey.final('hex');
    console.log(encryptedStr, 'encryptedStr')
    return functions.responseJson(1, encryptedStr)
  } catch (e) {
    return functions.responseJson(0, { error: e.message })
  }
}

functions.decryptData = (data, cb) => {
  try {
    var mykey = crypto.createDecipher('aes-128-cbc', config.privateKey);
    var decryptedStr = mykey.update(data.key, 'hex', 'utf8')
    decryptedStr += mykey.final('utf8');
    return cb(null, encryptedStr)
  } catch (e) {
    return cb(e)
  }
}

functions.uploadFile = (req, res) => {
  return new Promise((resolve, reject) => {
    s3Uploader(req, res, function (err) {
      if (err) {
        console.log({ Error: err })
        reject(err)
      } else if (!req.file) {
        reject(Error('Something went wrong'))
      } else {
        resolve(req.file)
      }
    })
  })
}

functions.localUpload = (req, res) => {
  return new Promise((resolve, reject) => {
    localUploader(req, res, function (err) {
      if (err) {
        console.log(err, 'err')
        reject(err)
      } else if (!req.file) {
        reject(Error('Something went wrong'))
      } else {
        resolve(req.file)
      }
    })
  })
}

functions.firstCapital = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

functions.capitalizeEveryInnerWord = (str) => {
  let words = str.split(' ');

  let capitalizedWords = words.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  let capitalizedStr = capitalizedWords.join(' ');
  return capitalizedStr;
}

functions.sendNotice = async (params) => {
  try {
    let { title, options, body, userToken, userId } = params

    var payload = {
      notification: {
        title,
        body: body
      }
    }
    console.log({ userToken, payload, options }, 'before sending notifications')
    let resp = await notify.sendToDevice(userToken, payload, options)
    console.log({ resp }, 'after sending notifications')

    let notifyData = new Notification({
      title,
      body,
      userId
    })
    notifyData = await notifyData.save()
    console.log({ notifyData }, 'data after saving notifications')
    return resp
  } catch (e) {
    throw e
  }
}

// otp
functions.sendOtp = async (body, options) => {
  let otp;
  if (body.otp) otp = body.otp;
  else otp = functions.generateOtp();			      // todo : disable for prod
  let { mobileNo } = body
  if (!mobileNo) throw Error('Mobile number not found')

  let { projectName } = config
  let { otpMsg } = "";
  otpMsg = otpMsg.replace('{projectName}', projectName)
    .replace('{otp}', otp)

  let {
    url,
    apiKey,
    senderId,
    entityId,
    templateId
  } = config.smsApi
  let smsUrl = url.replace('{apiKey}', apiKey)
    .replace('{senderId}', senderId)
    .replace('{entityId}', entityId)
    .replace('{templateId}', templateId)
    .replace('{mobileNo}', mobileNo)
    .replace('{message}', otpMsg)

  try {
    console.log({ smsUrl })
    // let smsRes = await axios.get(smsUrl) // todo: enable for prod
    let smsRes = { statusCode: 200 } // todo : disable for prod
    console.log(smsRes.data, 'smsres')
    if (smsRes.statusCode !== 200) throw Error('OTP sending failed')  // todo : enable for prod
    let otpRes = await Otp.findOneAndUpdate({ mobileNo }, { otp }, { new: true, upsert: true, useFindAndModify: false })
    if (!otpRes) throw Error('Otp saving error')

    otpRes.otp = undefined
    return otpRes
  } catch (e) {
    console.error(e, 'e')
    throw e
  }
}


// mail
functions.sendMail = async (mailData) => {
  try {
    let {
      projectName,
      project
    } = config


    const emailFilePath = path.join(emailTemplates, `${mailData.type}.pug`);
    mailData.options.project = project
    mailData.options.projectName = projectName
    let html = pug.renderFile(emailFilePath, mailData.options)
    let subject = mailData.subject || 'Litzo Update!'

    let attachments = []
    if (mailData.options
      && mailData.options.attachments
      && mailData.options.attachments.length
    ) {
      attachments = mailData.options.attachments
    }
    console.log({ email: config.adminEmail })

    const mailOptions = {
      from: config.adminEmail, // sender address
      to: mailData.to, // list of receivers
      subject: mailData.subject, // Subject line
      html,
      attachments
    };

    return config.mailer.sendMail(mailOptions, function (err, info) {
      if (err) throw err
      console.log({ mailRes: info })
      return info
    });
  } catch (e) {
    throw e
  }
}

// mail
functions.sendMailTo = (mailData) => {

  let {
    projectName,
    project
  } = config

  const emailFilePath = path.join(emailTemplates, `${mailData.type}.pug`)
  mailData.options.project = project
  mailData.options.projectName = projectName
  let html = mailData.options.message
  console.log("Html", html)
  let subject = mailData.subject || 'Litzo Update!'

  let attachments = []
  if (mailData.options
    && mailData.options.attachments
    && mailData.options.attachments.length
  ) {
    attachments = mailData.options.attachments
  }

  let from = config.supportEmail
  const mailOptions = {
    from: from, // sender address
    to: mailData.to, // list of receivers
    subject, // Subject line
    html,
    attachments
  };

  config.mailer.sendMail(mailOptions);
}

functions.getXml = (jsonData) => {
  const builder = new xml2js.Builder({
    renderOpts: { 'pretty': false }
  });
  return builder.buildObject(jsonData)
}

functions.getJsonFromXml = (xmlData) => {
  let jsonData = {}
  parseString(xmlData, function (err, result) {
    if (result) {
      // console.log("xml to json " + result)
      jsonData = result
    } else {
      console.log("error while convertiong xml to json " + err)
    }
  });
  return jsonData;
}

functions.invoiceGen = async (body) => {
  try {

    let { invoiceNumber, invoiceDate, name, mobileNo, address, Price, discount, bookingsdetails, totalPrice, gstAmount, gstPercent } = body
    if (!name) throw Error('name is required for invoice')
    if (!invoiceNumber) throw Error('invoiceNumber is required for invoice')
    if (!Price === null || Price === undefined) throw Error('Price is required for invoice')
    if (!totalPrice === null || totalPrice === undefined) throw Error('totalPrice is required for invoice')
    if (!invoiceDate) throw Error('invoiceDate is required for invoice')
    if (!mobileNo) throw Error('mobileNo is required for invoice')
    if (discount === null || discount === undefined) {
      throw new Error('discount is required for invoice');
    }

    if (!gstAmount === null || gstAmount === undefined) throw Error('gstAmount is required for invoice')
    if (!address) throw Error('address is required for invoice')
    if (!bookingsdetails) throw Error('bookingsdetails is required for invoice')
    if (!gstPercent === null || gstPercent === undefined) throw Error('gstPercent is required for invoice')

    const pugTemplatePath = path.resolve(__dirname, "../views/emailTemplates/invoiceOne.pug");
    const pugTemplate = fs.readFileSync(pugTemplatePath, 'utf8');

    const compiledPugFunction = pug.compile(pugTemplate);
    const finalHtml = compiledPugFunction(body);
    const fileName = `invoice-${Date.now()}.pdf`
    const pdf = await functions.generatePDF(finalHtml);
    const invoiceLink = await functions.savePdf(pdf, fileName);
    return invoiceLink.Location;
  } catch (error) {
    console.log({ invoiceGenError: error })
    throw error
  }
}


functions.monthlyReportGen = async (body) => {
  try {
    // let { notes, followUpDate, date, time, user, diagnosis, advices } = body
    console.log({ functionBody: body })

    var html = fs.readFileSync(path.resolve(__dirname, `../views/emailTemplates/${body.fileName}.html`), 'utf8');
    var template = Handlebars.compile(html);
    var finalHtml = template(body);

    const fileName = `${body.fileName}-${Date.now()}.pdf`;

    const pdf = await functions.generatePDF(finalHtml);
    console.log({ pdf })
    const invoiceLink = await functions.savePdf(pdf, fileName);
    console.log({ invoiceLink })

    console.log({ link: invoiceLink.Location })
    return invoiceLink.Location;
  } catch (error) {
    throw error
  }
}



functions.generatePDF = async (html = "") => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    let page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ printBackground: true });
    await page.close();
    if (browser != null) {
      await browser.close();
    }
    return pdfBuffer;
  }
  catch (error) {
    console.log({ generatePdfError: error })
    throw error
  }
};

functions.savePdf = async (pdfStream, fileName) => {
  try {
    const { s3, bucket } = config.multerStorage
    return await s3.upload({
      Bucket: bucket,
      Key: `invoices/${fileName}`,
      Body: pdfStream,
      contentType: 'application/pdf',
      ServerSideEncryption: 'AES256'
    }).promise();
  } catch (error) {
    console.log({ savePdfError: error })
    throw error;
  }
}

functions.getNextTicketNumber = async (modelName, fieldName) => {
  let ticketNumber = 10;

  let lastRecord = await models[modelName].find({}).sort({ _id: -1 }).limit(1);
  if (lastRecord.length && lastRecord[0][fieldName]) {
    ticketNumber = parseInt(lastRecord[0][fieldName]) + 1
  }
  return ticketNumber.toString().padStart(6, "0")
};

functions.localFileS3 = body => {
  return new Promise((resolve, reject) => {
    try {
      let { filePath, fileName, fileOrignalPath } = body
      if (!filePath) throw Error('filePath is required')
      if (!fileName) throw Error('fileName is required')
      if (!fileOrignalPath) throw Error('fileOrignalPath is required')

      let { s3, bucket } = config.multerStorage

      fs.readFile(filePath, (err, data) => {
        if (err) throw err;
        const params = {
          Bucket: bucket, // pass your bucket name
          Key: `contents/${fileName}`, // file will be saved as testBucket/contacts.csv
          Body: data
        };
        s3.upload(params, function (s3Err, data) {
          if (s3Err) reject(s3Err)
          console.log(data, 'data')
          if (data && data.Location) {
            console.log(filePath, 'filepat')
            // fs.unlink(filePath, (err, res) => {
            //   console.log(err, res, 'fs')
            //   fs.unlink(fileOrignalPath, (err, res) => {
            //     console.log(err, res, 'fs2')
            //   })
            // })
            resolve(data.Location)
          } else {
            fs.unlink(filePath, (err, res) => {
              reject('Upload failed')
            })
          }
        });
      });
    } catch (error) {
      console.log(error, 'error')
      reject(error)
    }
  })
}

functions.isOldRequestDataValid = (params, reqId) => {
  try {

    if (typeof params !== 'object') {
      throw Error('not an object')
    }

    let invalidKeys = Object.keys(params).filter(x => {
      if (isNullOrUndefined(params[x])) {
        return x
      }
    })

    if (invalidKeys.length) {
      return `${invalidKeys[0]} is a required field`
    }
    else return true
  } catch (e) {
    throw e
  }
}

functions.isRequestDataValid = (params) => {
  try {
    if (typeof params !== 'object') {
      throw Error('not an object')
    }

    let invalidKeys = [];
    let invalidValues = [];

    for (let [key, value] of Object.entries(params)) {
      if (isNullOrUndefined(params[key])) {
        invalidKeys.push(key)
      }
      else if (!value && typeof value !== 'number' && typeof value !== 'boolean') {
        invalidValues.push(key)
      }
    }

    if (invalidKeys.length) {
      return `${invalidKeys[0]} is a required field`
    } else if (invalidValues.length) {
      return `Missing values for KEY === ${invalidValues[0]}`
    }
    else return true
  } catch (e) {
    throw e
  }
}

/**
 * 
 * @param {object} params 
 * @param {string} reqId 
 * @returns 
 */
functions.getMilisecondsFromDateTime = (params, reqId) => {
  return new Date(`${params.date} ${params.time}`).getTime();
}



functions.logger = (component, reqId, level, message, options) => {
  let color = {
    info: "\x1b[34m", // blue
    warn: "\x1b[33m", // yellow
    error: "\x1b[31m", // red
    debug: "\x1b[35m", // magenta
    log: "\x1b[32m", // green
  }
  let colorCode = color[level]
  console[level](colorCode, JSON.stringify({
    component,
    level,
    message,
    timeStamp: new Date(),
    reqId,
    message
  }));
}

//It is used to generate expiryTime for otp's
functions.otpExpiryTime = async (timeInMints) => {

  var forwardTime = new Date(Date.now() + (timeInMints * 60 * 1000));
  return forwardTime;
}

//It is used to generate random Id's
functions.generateId = async (id_length) => {

  var digits = "0123456789112";
  let ID = "";
  for (let i = 0; i < id_length; i++) {
    ID += digits[Math.floor(Math.random() * 10)];
  }
  const id = ID
  return id;
};

functions.generatePromo = async (id_length) => {
  var digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let ID = "";
  for (let i = 0; i < id_length; i++) {
    ID += digits[Math.floor(Math.random() * digits.length)];
  }
  return ID;
};


functions.generateOtp = () => {
  return '1111111';  // todo : disable for prod

  // var digits = "0123456789112";
  // let OTP = "";
  // for (let i = 0; i < 4; i++) {
  //   OTP += digits[Math.floor(Math.random() * 10)];
  // }
  // return OTP;
}


functions.getDay = async (inputDate) => {
  let day;
  let date = new Date(`${inputDate}T00:00:00.000Z`).getDay();
  if (date == 0) day = "sunday"
  else if (date == 1) day = "monday"
  else if (date == 2) day = "tuesday"
  else if (date == 3) day = "wednesday"
  else if (date == 4) day = "thursday"
  else if (date == 5) day = "friday"
  else if (date == 6) day = "saturday"

  return day;
}

functions.getNextTicketNumber = async (modelName, fieldName, initialNumber, padRequired) => {
  let ticketNumber = initialNumber || 10;

  let lastRecord = await models[modelName].find({}).sort({ _id: -1 }).limit(1);
  if (lastRecord.length && lastRecord[0][fieldName]) {
    ticketNumber = parseInt(lastRecord[0][fieldName]) + 1
  }
  if (padRequired == 'N') return ticketNumber
  else return ticketNumber.toString().padStart(6, "0")
};

let files = [];
functions.getFilesFromSrc = (directory) => {
  const filesInDirectory = fs.readdirSync(directory);
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file);
    if (fs.statSync(absolute).isDirectory()) {
      functions.getFilesFromSrc(absolute);
    } else {
      files.push(absolute);
    }
  }
  return files;
};

functions.updateData = async (params) => {
  try {
    let modelName;
    let data;
    if (params.model == "FitnessChallenge") {
      console.log({ params })
      modelName = FitnessChallenge
      data = await FitnessChallenge.findOneAndUpdate({ _id: params._id }, { $set: { isActive: params.isActive } }, { new: true })
    }
    return data;
  }
  catch (e) {
    throw e;
  }
}

functions.convert24To12HoursTimeFormat = async (params) => {
  console.log({ params })
  const [hourString, minute] = params.split(":");
  const hour = +hourString % 24;
  return (hour % 12 || 12) + ":" + minute + (hour < 12 ? "AM" : "PM");
}


functions.scheduleCron = async (time, params, action, reqId) => {
  console.log({ time, params, reqId })
  const { sessionId, consultationId, bookingId } = action
  const actionId = sessionId || consultationId || bookingId

  console.log({ data: Array.isArray(params.functionArr) })

  if (!actionId && params.tag !== 'master') throw Error('sessionId or consultationId not found')
  if (!params.type) {
    throw Error('params type is not found')
  } else if (params.type == 'function'
    && (!params.functionName || !params.data)) {
    throw Error('param.type is not found')
  } else if (params.type == 'manual'
    && typeof params.functionExec != 'function') {
    throw Error('param.functionExec not found')
  } else if (params.type == 'array' && !Array.isArray(params.functionArr)) {
    throw Error('array in found in param')
  }

  let jobNumber = await functions.getNextTicketNumber('CronTask', 'jobNumber');
  console.log({ jobNumber })
  console.log({ time: time })
  let newDate = new Date(time)
  console.log({ newDate: newDate })
  let seconds = time != 0 ? newDate.getSeconds() : 0
  let hour = time != 0 ? newDate.getHours() : 0
  let min = time != 0 ? newDate.getMinutes() : 0
  let timer = `${seconds} ${min} ${hour} * * *`

  console.log({ jobNumber, timer })

  // functions.logger('appUtils.scheduleCron', reqId, 'info', { cronData, seconds, hour, min })

  var job = schedule.scheduleJob(jobNumber, timer, () => {
    let dateNow = new Date()
    CronTask.find({ date: dateNow }).remove().exec();

    if (params.type == 'array') {
      console.log(`child cron executed at ${new Date()}`)
      params.functionArr.forEach(x => {
        functions[x.functionName](x.data)
      })
    } else if (params.type == 'function') {
      functions[params.functionName](params.data)
    } else if (params.type == 'manual') {
      params.functionExec()
      console.log(`master cron for new day executed at ${new Date()}`)
    }
  });

  console.log({ job })

  const setData = {
    tag: params.tag
  }
  if (sessionId) setData.sessionId = sessionId
  if (consultationId) setData.consultationId = consultationId
  if (bookingId) setData.bookingId = bookingId

  let cronData = new CronTask({       // storing in db
    time,
    data: JSON.stringify(params),
    date: new Date(time),
    jobNumber,
    ...setData
  })
  cronData = await cronData.save()
  console.log({ cronData })
  return { status: 1, message: `${jobNumber} is scheduled` }
};


functions.setSmsRemindersForConsultations = async (body) => {
  let {
    startDate,
    modeOfConsultation,
    userName,
    userMobileNo,
    expertMobileNo,
    date,
    time,
    consultationId
  } = body;

  console.log({ body })

  try {

    /***
     * @firstReminderTime It will triggers the sms before 24 hours of startDate of consultation
     * @secondReminderTime It will triggers the sms before 6 hours of startDate of consultation
     * let firstReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 333)----For 3 minutes before
     * let secondReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 332)---For 2 mints before
     */


    let firstReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 1770)
    let secondReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 360)


    let firstReminderMsg;
    if (modeOfConsultation == 'videoCall') firstReminderMsg = smsTemplates.videoSessionReminderOne;
    else if (modeOfConsultation == 'voiceCall') firstReminderMsg = smsTemplates.phoneSessionReminderOne;

    let secondReminderMsg;
    if (modeOfConsultation == 'videoCall') secondReminderMsg = smsTemplates.videoSessionReminderTwo;
    else if (modeOfConsultation == 'voiceCall') secondReminderMsg = smsTemplates.phoneSessionReminderTwo;


    firstReminderMsg = firstReminderMsg.replace(`{name}`, `${userName}`)
      .replace(`{date}`, `${date}`)
      .replace(`{time}`, `${time}`)
      .replace(`{expertNo}`, `${expertMobileNo}`)

    secondReminderMsg = secondReminderMsg.replace(`{name}`, `${userName}`)
      .replace(`{date}`, `${date}`)
      .replace(`{time}`, `${time}`)
      .replace(`{expertNo}`, `${expertMobileNo}`)

    let firstReminderCronData = await functions.scheduleCron(firstReminderTime, {
      type: 'function',
      functionName: 'sendSms',
      tag: 'Reminder1',
      data: {
        mobileNo: userMobileNo,
        message: firstReminderMsg
      }
    }, { consultationId }, '12123')

    let secondReminderCronData = await functions.scheduleCron(secondReminderTime, {
      type: 'function',
      functionName: 'sendSms',
      tag: 'Reminder2',
      data: {
        mobileNo: userMobileNo,
        message: secondReminderMsg
      }
    }, { consultationId }, '12123')

    return {
      firstReminderCronData, secondReminderCronData
    }
  }
  catch (e) {
    console.log({ e })
    throw e
  }
}


functions.setEmailRemindersForConsultations = async (body) => {
  let {
    startDate,
    modeOfConsultation,
    userName,
    userEmail,
    userMobileNo,
    expertMobileNo,
    date,
    time,
    consultationId
  } = body;

  console.log({ body })

  try {

    /***
     * @firstReminderTime It will triggers the sms before 24 hours of startDate of consultation
     * @secondReminderTime It will triggers the sms before 6 hours of startDate of consultation
     *  let firstReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 333)-----Testing-Purpose
     *  let secondReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 332)-----Testing-Purpose
     */

    let firstReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 1770)
    let secondReminderTime = new Date(startDate).setMinutes(new Date(startDate).getMinutes() - 360)

    let firstReminderType;
    if (modeOfConsultation == 'videoCall') firstReminderType = 'VideoSessionReminderOne';
    else if (modeOfConsultation == 'voiceCall') firstReminderType = 'voiceSessionReminderOne';

    let secondReminderType;
    if (modeOfConsultation == 'videoCall') secondReminderType = 'videoSessionReminderTwo';
    else if (modeOfConsultation == 'voiceCall') secondReminderType = 'voiceSessionReminderTwo';


    let firstReminderCronData = await functions.scheduleCron(firstReminderTime, {
      type: 'function',
      functionName: 'sendMail',
      tag: 'Reminder1',
      data: {
        to: userEmail,
        subject: 'First Reminder',
        type: firstReminderType,
        options: {
          name: userName,
          expertMobileNo,
          date,
          time
        }
      }
    }, { consultationId }, '12123')

    let secondReminderCronData = await functions.scheduleCron(secondReminderTime, {
      type: 'function',
      functionName: 'sendMail',
      tag: 'Reminder2',
      data: {
        to: userEmail,
        subject: 'Second Reminder',
        type: secondReminderType,
        options: {
          name: userName,
          expertMobileNo,
          date,
          time
        }
      }
    }, { consultationId }, '12123')

    return {
      firstReminderCronData, secondReminderCronData
    }
  }
  catch (e) {
    console.log({ e })
    throw e
  }
}

functions.rescheduleCrons = async () => {
  let cronData = await CronTask.findOne({ _id: '63e1200098616a3a2c2fb53e' });
  let newcronData = JSON.parse(cronData.data)
  console.log({ newcronData, cronData })
  let date = new Date(cronData.date).toISOString();

  console.log({ date })

  let secondReminderCronData = await functions.scheduleCron(date, newcronData, { consultationId: cronData.consultationId }, '12123')
}


functions.generateIssuesPdfObj = async (data) => {

  let issuesFinalData = data;
  let issues = [];
  let mediaLinks = [];
  let percentages = [];
  let issuesObj, mediaLinksObj, percentagesObj;

  let i = 1;
  let j = 1;
  let k = 1;

  if (issuesFinalData.length) {

    for (let test of issuesFinalData) {

      if (test.question) {
        let newIssueName = 'issues' + (i++);
        let issue = test.question
        issues.push({ newIssueName, issue });
      }
      if (test.mediaLink) {

        let newMediaLink = 'mediaLink' + (j++);
        let mediaLink = test.mediaLink;
        mediaLinks.push({ newMediaLink, mediaLink });
      }
      if (test.percentage) {
        let newPercentage = 'percentage' + (k++);
        let values = test.percentage
        percentages.push({ newPercentage, values });
      }
    }

    issuesObj = issues.reduce(
      (obj, item) => Object.assign(obj, { [item.newIssueName]: item.issue }), {});
    mediaLinksObj = mediaLinks.reduce(
      (obj, item) => Object.assign(obj, { [item.newMediaLink]: item.mediaLink }), {});
    percentagesObj = percentages.reduce(
      (obj, item) => Object.assign(obj, { [item.newPercentage]: item.values }), {});

  }

  let pdfBody = { ...issuesObj, ...mediaLinksObj, ...percentagesObj }
  return pdfBody;
}


functions.generateBlankProfileImages = (gender) => {
  return (gender.trim() == "Male") ? "https://litzo.s3.ap-south-1.amazonaws.com/Litzo_Stage/1687177204440-men_blank_img.jpg" : "https://litzo.s3.ap-south-1.amazonaws.com/Litzo_Stage/1687177240008-girl_blank_img.jpg";
}

functions.generateDayOfWeek = (inputDate) => {

  const date = new Date(moment(inputDate).format('YYYY-MM-DD'));

  const dayOfWeek = date.getDay();

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const dayName = daysOfWeek[dayOfWeek];

  return dayName;
}


functions.splitTimeRange = (startTime, endTime, hourGap) => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const result = [];

  if (start >= end) {
    return result;
  }

  let current = start;
  while (current < end) {
    const next = new Date(current.getTime() + hourGap * 60 * 60 * 1000);
    if (next > end) {
      result.push(functions.formatTime(current), functions.formatTime(end));
    } else {
      result.push(functions.formatTime(current), functions.formatTime(next));
    }
    current = next;
  }

  var startTimes = [];
  var endTimes = [];

  for (var i = 0; i < result.length; i += 2) {
    var startTime = result[i];
    var endTime = result[i + 1];

    startTimes.push(startTime);
    endTimes.push(endTime);
  }

  return { startTimes, endTimes };
}

functions.formatTime = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}


functions.generateAvailablePartnersQuery = async (body) => {

  let { startTime, endTime, longitude, latitude, date } = body;
  let day = functions.generateDayOfWeek(date);

  const bookedPartners = await Bookings.find({
    date: date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    status: { $nin: ["cancelled", "rejected"] }
  }).distinct('partnerId');

  console.log({ bookedPartners })

  const splittedTimeSlots = functions.splitTimeRange(startTime, endTime, 1);

  var query = {
    _id: { $nin: bookedPartners },
    isDeleted: false,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: 5000,
      },
    },
    $and: []
  };

  for (var i = 0; i < splittedTimeSlots.startTimes.length; i++) {
    startTime = splittedTimeSlots.startTimes[i];
    endTime = splittedTimeSlots.endTimes[i];

    var availabilityQuery = {
      availability: {
        $elemMatch: {
          day: day,
          startTime: startTime,
          endTime: endTime
        }
      }
    };

    query.$and.push(availabilityQuery);
  }
  return query;
}


functions.fetchAllPartnersBySlotWiseQuery = async (body) => {

  let { startTime, endTime, longitude, latitude, date, roleId, bookedPartnerIds } = body;
  let day = functions.generateDayOfWeek(date);
  const splittedTimeSlots = functions.splitTimeRange(startTime, endTime, 1);
  var query = {
    isDeleted: false,
    roles: { $in: roleId },
    $and: []
  };

  if (bookedPartnerIds && bookedPartnerIds.length) query._id = { $nin: bookedPartnerIds }

  for (var i = 0; i < splittedTimeSlots.startTimes.length; i++) {
    startTime = splittedTimeSlots.startTimes[i];
    endTime = splittedTimeSlots.endTimes[i];

    var availabilityQuery = {
      availability: {
        $elemMatch: {
          day: day,
          startTime: startTime,
          endTime: endTime
        }
      }
    };

    query.$and.push(availabilityQuery);
  }
  return query;
}



functions.fetchHoursDuration = (startTime, endTime) => {
  var startMoment = moment(startTime, "HH:mm:ss");
  var endMoment = moment(endTime, "HH:mm:ss");
  if (endMoment.isBefore(startMoment)) {
    endMoment.add(1, 'day');
  }
  var duration = moment.duration(endMoment.diff(startMoment));
  var durationInHours = duration.asHours();
  return durationInHours
}


functions.generateInvoice = async () => {
  try {
    let latestInvoice = "00000"
    let transaction = await Payment.findOne({ invoiceNumber: { $exists: true } }).sort({ invoiceNumber: -1 }).exec();
    if (transaction && transaction.invoiceNumber) {
      latestInvoice = parseInt(transaction.invoiceNumber.slice(-5));
    }

    const currentDate = moment().format('YYYYMMDD');
    const nextInvoiceNumber = parseInt(latestInvoice || 0, 10) + 1;
    const newInvoiceNumber = 'SA' + currentDate + String(nextInvoiceNumber).padStart(5, '0');
    return newInvoiceNumber;

  } catch (error) {

  }
}



functions.mergeSlots = (existingSlots, currentSlots) => {
  let merged = [];
  let mergedSet = new Set(); // Set to store unique merged slot pairs

  // Iterate through existingSlots and currentSlots simultaneously
  for (let i = 0; i < existingSlots.length; i++) {
    for (let j = 0; j < currentSlots.length; j++) {
      // Check if the current existing slot's end time matches the current current slot's start time
      if (existingSlots[i].endTime == currentSlots[j].startTime ||
        existingSlots[i].startTime == currentSlots[j].endTime) {
        // Create a unique key for the merged slot pair


        // If the merged slot pair is not already in the merged set, add it to the merged array and set
        if (!mergedSet.has(existingSlots[i])) {
          merged.push(existingSlots[i]);
          mergedSet.add(existingSlots[i])
        }
        if (!mergedSet.has(currentSlots[j])) {
          merged.push(currentSlots[j]);
          mergedSet.add(currentSlots[j])
        }
      }
    }
  }

  return merged;
}



// Function to calculate the price based on slot, service, and category
functions.calculatePrice = async (slotIds, serviceId) => {
  try {
    const selectedSlots = await Slots.find({ _id: { $in: slotIds } });
    const selectedService = await Services.findById(serviceId);

    let totalPriceWithoutGST = 0;
    let durationInHours = 0;

    // Calculate total duration and price without GST
    selectedSlots.forEach(slot => {
      durationInHours += calculateDurationInHours(slot.startTime, slot.endTime);
    });
    const pricePerHour = selectedService.pricePerHour;
    totalPriceWithoutGST = pricePerHour * durationInHours;

    // Calculate GST amount
    const gstPercent = selectedService.gstPercent || 0;
    const gstAmount = (totalPriceWithoutGST * gstPercent) / 100;
    const totalPrice = totalPriceWithoutGST + gstAmount;

    let slotDiscount
    const selectedslotLength = slotIds.length
    const slotsDiscounts = await SlotDiscounts.find({ serviceId: serviceId })
    if (!slotsDiscounts) throw { status: 500, message: "Slots discount not added" }
    if (slotsDiscounts[0]?.slotsCount <= selectedslotLength) {
      slotDiscount = 1
    } else {
      slotDiscount = 0
    }

    return {
      totalPrice: totalPrice,
      gstPercent: gstPercent,
      gstAmount: gstAmount,
      slotDiscount: slotDiscount,
      totalPriceWithoutGst: totalPriceWithoutGST,
      slotsPercentage: slotsDiscounts[0]?.percentage || 0
    };
  } catch (error) {
    throw error;
  }
};



function calculateDurationInHours(startTime, endTime) {
  // Parse the start time and end time strings into Date objects
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const differenceMs = end - start;
  const durationInHours = differenceMs / (1000 * 60 * 60);

  return durationInHours;
}

// Function to handle payment through Razorpay
functions.makePayment = async (userId, totalPrice) => {
  try {

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: totalPrice * 100,
      currency: 'INR',
    });

    return order
  } catch (error) {
    throw error;
  }
};

// Function to calculate distance between two points using Haversine formula
functions.calculateDistance = async (coord1, coord2) => {
  const [lat1, lon1] = coord1;
  console.log(coord2, coord1);

  const [lat2, lon2] = coord2;
  const earthRadius = 6371; // Radius of the Earth in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1)

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c; // Distance in kilometers

  return distance;
}

// Function to convert degrees to radians
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}



functions.checkPartnerAvailableOrNotBySlotwise = async (body) => {

  let { startTime, endTime, longitude, latitude, date, partnerId } = body;
  let day = functions.generateDayOfWeek(date);

  const bookedPartners = await Bookings.find({
    date: date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    status: { $nin: ["cancelled", "rejected"] },
    isDeleted: false,
    partnerId: { $exists: true },
    partnerId
  }).distinct('partnerId');

  const splittedTimeSlots = functions.splitTimeRange(startTime, endTime, 1);

  var query = {
    _id: { $nin: bookedPartners },
    isDeleted: false,
    $and: []
  };

  if (longitude && latitude) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: 5000,
      },
    }
  }

  for (var i = 0; i < splittedTimeSlots.startTimes.length; i++) {
    startTime = splittedTimeSlots.startTimes[i];
    endTime = splittedTimeSlots.endTimes[i];

    var availabilityQuery = {
      availability: {
        $elemMatch: {
          day: day,
          startTime: startTime,
          endTime: endTime
        }
      }
    };

    query.$and.push(availabilityQuery);
  }
  let partnerData = await User.find(query).select('_id name');
  console.log({ partnerData })
  return partnerData;
}


module.exports = functions;

