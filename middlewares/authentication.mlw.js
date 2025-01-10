const jwt = require('jsonwebtoken')
let { privateKey, adminEmail, backendUrl } = require('../config/config')
let { User, Admin } = require('../models')


exports.generateAccessToken = (data) => {
    let token = jwt.sign({ id: data._id }, privateKey, { expiresIn: 60 * 60 * 24 * 60 }); 
    return token
}

exports.generateRefreshToken = (data) => {
    let token = jwt.sign({ id: data._id }, privateKey);
    return token
}

//Verification setup for the provided token of User
exports.validateUserAccessToken = async (req, res, next) => {

    try {
        let decoded;
        let role;
        let token = req.headers["access-token"];
        if (!token) throw { status: 499, message: "Token missing in headers" }

        jwt.verify(token, privateKey, (err, decodedData) => {
            if (err) {
                if (err.name === 'TokenExpiredError') throw { status: 401, message: "Unauthorized user" }
                else throw { status: 498, message: "Invalid token" }
            } else decoded = decodedData;
        });

        //Finding the user in All collections
        let user = await User.findOne({ _id: decoded.id, status: { $nin: [0] }, isDeleted: false })
        if (!user) throw { status: 401, message: "Unauthorized user" }
        user = JSON.parse(JSON.stringify(user));
        req.user = user;
        next();
    }
    catch (e) {
        res.status(e.status || 500).send({ status: 0, message: e.message || "Internal server error" })
    }
};

//Verification setup for the provided token of Admin
exports.validateAdminAccessToken = async (req, res, next) => {

    try {
        let decoded;
        let token = req.headers["access-token"];
        if (!token) throw { status: 499, message: "Token missing in headers" }

        jwt.verify(token, privateKey, (err, decodedData) => {
            if (err) {
                if (err.name === 'TokenExpiredError') throw { status: 401, message: "Unauthorized user" }
                else throw { status: 498, message: "Invalid token" }
            } else decoded = decodedData;
        });

        //Finding the user in All collections
        let user = await Admin.findOne({ _id: decoded.id, role: "admin" }).lean();
        if (!user) throw { status: 401, message: "Unauthorized user" }
        req.user = user;
        next();
    }
    catch (e) {
        res.status(e.status || 500).send({ status: 0, message: e.message || "Internal server error" })
    }
};


exports.checkPartnerAccess = async (req, res, next) => {
    try {
        let user = req.user;

        if (user.role != "partner") throw { status: 403, message: "Access Denied. Partner Access Required" }
        next();
    }
    catch (e) {
        res.status(e.status || 500).send({ status: 0, message: e.message || "Internal server error" })
    }
}

exports.checkUserAccess = async (req, res, next) => {
    try {
        let user = req.user;
        if (user.role != "user") throw { status: 403, message: "Access Denied. User Access Required" }
        next();
    }
    catch (e) {
        res.status(e.status || 500).send({ status: 0, message: e.message || "Internal server error" })
    }
}