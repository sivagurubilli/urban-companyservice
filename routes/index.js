var express = require('express');
var multer = require('multer');
var router = express.Router();
const userRoutes = require("./userRoutes");
const adminRoutes = require("./adminRoutes");

router.use('/api/v1/user', userRoutes);
router.use('/api/v1/admin', adminRoutes);

//Route not found error handler
router.use((req, res, next) => {
    const error = new Error('url_not_found');
    error.status = 404;
    next(error);
});


//Error handler middleware
router.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    const data = err.data;
    res.status(status).send({ status: 0, message, data });
});

module.exports = router;