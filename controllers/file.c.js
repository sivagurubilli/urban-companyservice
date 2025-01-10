let appUtils = require('../utils/appUtils')
const { environment, projectName } = require("../config/config");

exports.upload = async (req, res, next) => {
    try {
        let body = Object.assign(req.body, req.query, req.params)
        req.folder = body.folder ? body.folder : 'hho';
        let file = await appUtils.uploadFile(req, res);
        res.send(appUtils.responseJson(1, file, 'Upload successful'))
    } catch (e) {
        res.send(appUtils.responseJson(0, e.message, 'Exception : upload'))
    }
}