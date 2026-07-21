const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
//const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const dns = require("dns");
//const ErrorResponse = require("./utils/errorResponse");
// const busboy = require("connect-busboy");
// const busboyBodyParser = require("busboy-body-parser");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

//Setting the app configuration file
dotenv.config({ path: "./config/config.env" });

connectDB();

//Route Files
const auth = require("./routes/authRoutes");
const upload = require("./routes/uploadRoutes");
const user = require("./routes/userRoutes");
const postman = require("./routes/postmanScriptRoutes");
const editor = require("./routes/editorRoutes");
const dashboard = require("./routes/dashboardRoutes");

//Middleware Files
const errorHandler = require("./middleware/errorHandle");

const app = express();

//Server Maintainance
// app.use((req, res, next) => {
//   return next(new ErrorResponse('Server is under maintenance. Please try again later.', 503));
// });

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: [
      "Accept",
      "Content-Type",
      "Authorization",
      "Content-Range",
      "Content-Disposition",
      "Content-Description",
      "Cache-Control",
      "Origin",
      "X-Requested-With",
      "Key",
      "Access-Control-Allow-Origin",
      "x-api-key",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.options("*", cors());

// Enable CORS
// app.use(cors());

//Body Parser
app.use(express.json({ limit: "50mb" }));

// To prevent sql injection by sanitizing
app.use(mongoSanitize());

// Adding additional header tags to increase the API securities
app.use(helmet());

// Prevent from XSS (Cross Site Scripting) attacks
//app.use(xss());

// Prevent http param pollution attacks
app.use(hpp());

//busboy Middelware
// app.use(busboy({ immediate: true }));

//Busboy body parser middleware
// app.use(busboyBodyParser({ multi: true }));

//Mount Routes
app.use("/api/", auth);
app.use("/api/", upload);
app.use("/api/", user);
app.use("/api/", postman);
app.use("/api/", editor);
app.use("/api/", dashboard);

//Injecting Error Handling Middleware into the request response cycle
app.use(errorHandler);

//setting the PORT
const PORT = process.env.PORT || 5000;
console.log("process.env.NODE_ENV", process.env.NODE_ENV);

const server = app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`,
  ),
);

//Setting Timeout
const DEFAULT_TIMEOUT = 60 * 60 * 1000; // in ms
server.setTimeout(DEFAULT_TIMEOUT);

//Handle Unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  //close the server and exit process
  server.close(() => process.exit(1));
});

//This is a test for the GIT
