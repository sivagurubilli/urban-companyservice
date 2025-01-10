var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { environment, portNumber } = require('./config/config');
const { databaseConnection } = require("./config/database");
var app = express();
const indexRouter = require("./routes/index");
const { runCouponsCronJob, runDeleteExpiredCartsJob } = require("./controllers/cron.c")

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  req.reqId = uuidv4();
  next();
});
app.get('/', async (req, res) => {
  res.send(`Welcome to the LITZO BACKEND ${environment} Application`)
})
app.use(indexRouter);


app.listen(portNumber, async function () {
  await databaseConnection().then(() => {
    console.log("Connect to MONGO-DB successfully");
    // runCouponsCronJob()
    runDeleteExpiredCartsJob()
  }).catch((e) => {
    console.log({ e })
    "Unable to connect to MONGO-DB.Try again"
  });
  console.log(`Server started successfully on port ${portNumber}`);
});


module.exports = app;
