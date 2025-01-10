const axios = require('axios')
let config = require('../config/config.js')
const {
  s3,
  aws
} = config
let models = require('../models');
const {
  Category,
  Content
} = models;
let appUtils = require('../utils/appUtils')
const { responseJson, getFilesFromSrc, localFileS3 } = appUtils
const excelToJson = require('convert-excel-to-json');
let { promisify } = require('util')
const fs = require('fs');
const path = require("path");

let readAsync = promisify(readFile)
let processSync = promisify(processData)
let upsertSync = promisify(upsertData)

exports.uploadBulk = async (req, res, next) => {
  try {
    let body = Object.assign(req.body, req.query, req.params)
    req.folder = body.folder
    let file = await appUtils.localUploadSync(req, res)
    let jsonArr = await readAsync(file)
    let data = await processSync(jsonArr, body.module)

    res.send(appUtils.responseJson(1, data, 'Bulk Upload successful'))
  } catch (e) {
    res.send(appUtils.responseJson(0, e.message, 'Exception'))
  }
}

exports.populate = async (req, res, next) => {
  try {
    let body = Object.assign(req.body, req.query, req.params)
    console.log(body, 'body')
    if (body.model) {
      let model = models[body.model]
      let array = require(`../config/data/${body.model}.json`)
      let data = await model.insertMany(array)
      res.send(data)
    } else {
      res.send('please send model as param')
    }
  } catch (e) {
    res.send(appUtils.responseJson(0, e.message, 'Exception'))
  }
}

exports.uploadBulkContent = async (req, res, next) => {
  /**
   * fetch the files from folder, if there are subfolders then find the file in deep and upload the file to s3  
   * now find the master category and sub category by folder structure
   * enter the s3 url, master category and sub category into the excel
   * goto next file
   */
  try {
    const testFolder = '../config/data/contents/';
    const files = getFilesFromSrc(path.resolve(__dirname, testFolder))
    let categories = await Category.find().lean()
    let masterCategories = categories.map(x => {
      if (!x.parentCategoryId) return x
    }).filter(x => x)

    let fileUploadsRes = await Promise.all(
      files.map(file => {
        let filePathArr = file.split('\\');
        let title = filePathArr[filePathArr.length - 1]
        // title = title.split('.')
        // title = title[0]
        return localFileS3({
          filePath: file,
          fileName: title,
          fileOrignalPath: file
        })
      })
    )

    let contents = []
    categories.forEach(cat => {
      let mastCat = masterCategories.find(mastCat => {
        if (cat.parentCategoryId && mastCat._id.toString() == cat.parentCategoryId.toString()) return mastCat
      })
      if (mastCat) {
        files.forEach(file => {
          let filePathArr = file.split('\\');
          let title = filePathArr[filePathArr.length - 1]
          let format = title.split('.')[1]
          console.log(title)
          let s3Link = fileUploadsRes.find(s3Url => {
            let temp = s3Url.split('/')
            if (title == temp[temp.length - 1]) return s3Url
          })

          filePathArr = filePathArr.map(filePath => filePath.toUpperCase())
          let content = {}
          if (filePathArr.includes(mastCat.name.toUpperCase())
            // && filePathArr.includes(cat.name.toUpperCase())
          ) {
            content.masterCategoryId = mastCat._id
            // content.categoryId = cat._id
            content.title = title.split('.')[0]
            content.mediaLink = s3Link
            content.format = format
          }
          if (content.title) contents.push(content)
        })
      }
    })

    contents = contents.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.title === value.title
        && t.format === value.format
        && t.mediaLink === value.mediaLink
      ))
    )

    contents = await Content.insertMany(contents)

    res.send(responseJson(1, contents, 'success'))
  } catch (e) {
    res.status(500).send(responseJson(0, [], 'failed', e))
  }
}

exports.updateBulkContent = async (req, res, next) => {
  try {
    let categories = await Category.find().lean()
    let masterCategories = categories.map(x => {
      if (!x.parentCategoryId) return x
    }).filter(x => x)

    let dailiesMast = masterCategories.find(x => x.name.toLowerCase() === 'dailies')
    let childCat = categories.find(x => x.name.toLowerCase() === 'daily calm')

    const s3Arr = await s3.listObjectsV2({
      Bucket: aws.bucket,
      Prefix: 'contents/',
      Delimiter: 'contents/',
    }).promise()

    let contents = s3Arr.Contents.map(s3Obj => {
      let a = s3Obj.Key
      let b = a.split('/')
      let c = b[1].split('.')
      let title, format
      if (c.length == 2) {
        title = c[0].replace(/[^a-zA-Z0-9 ]/g, "")
        format = c[1]
      } else if (c.length == 3) {
        title = c[1].replace(/[^a-zA-Z0-9 ]/g, "")
        format = c[2]
      }

      return {
        title,
        mediaLink: `${aws.bucketUrl}${s3Obj.Key}`,
        categoryId: childCat._id,
        masterCategoryId: dailiesMast._id,
        format
      }
    })

    contents = contents.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.title === value.title
        && t.format === value.format
        && t.mediaLink === value.mediaLink
      ))
    )
    let existingContent = (await Promise.all(
      contents.map(x => {
        return Content.findOne({
          title: x.title
        }).select('title')
      })
    )).filter(x => x)
    let filteredContent = contents.filter(x => {
      let index = existingContent.findIndex(y => y.title == x.title)
      if (index == -1) {
        return x
      }
    })

    contents = await Content.insertMany(filteredContent)

    res.send(responseJson(1, [], 'success'))
  } catch (e) {
    res.status(500).send(responseJson(0, [], 'failed', e))
  }
}

async function processData(data, module, cb) {
  try {
    let moduleDataArr = []
    data[module].map(async (x, i) => {
      let moduleData = await upsertSync(x, module)
      moduleDataArr.push(moduleData)
      if (i == data[module].length - 1) {
        return cb(null, moduleDataArr)
      }
    })
  } catch (e) { return cb(e) }
}

async function upsertData(data, module, cb) {
  try {
    let model = models[module]
    let query = { name: data.name }
    let set = data
    let couponData = await model.findOneAndUpdate(query, set, { new: true, upsert: true })
    return cb(null, couponData)
  } catch (e) { return cb(e) }
}

function readFile(file, cb) {
  let result = excelToJson({
    sourceFile: file.path,
    header: { rows: 1 },
    columnToKey: {
      'A': '{{A1}}',
      'B': '{{B1}}',
      'C': '{{C1}}',
      'D': '{{D1}}',
      'E': '{{E1}}',
      'F': '{{F1}}',
      'G': '{{G1}}'
    }
  });
  return cb(null, result)
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}


exports.getAllS3Objects = async (req, res) => {
  try {

    res.send(responseJson(1, [], 'success'))
  } catch (e) {
    res.status(500).send(responseJson(0, [], 'failed', e))
  }
}


exports.getconfig = async (req, res) => {
  try {

    let data = 'noData';
    const {
      rzp,
    } = config;

    if (req.query.rzp) {
      data = {
        key: rzp.key_id,
        secret: rzp.key_secret
      }
      res.send(appUtils.responseJson(1, data, 'SUCCESS'));
    }
    else throw Error("Currently only rzp values available");
  }
  catch (e) {
    res.send(appUtils.responseJson(0, e.message, `Failed`));
  }
}
