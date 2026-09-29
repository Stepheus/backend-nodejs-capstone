/*jshint esversion: 8 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pinoLogger = require('./logger');
const multer = require("multer");
const FileUploadError = require("./routes/errors/custom_errors");

const connectToDatabase = require('./models/db');
const {loadData} = require("./util/import-mongo/index");


const app = express();
app.use("*",cors());
const port = 3060;

//load data to databas
console.log("Loading data to database");
loadData().then(()=>{
    pinoLogger.info('Loading data to DB');
}).catch((error)=>{
    console.error("Failed to load data to database");
});

// Connect to MongoDB; we just do this one time
connectToDatabase().then(() => {
    pinoLogger.info('Connected to DB');
})
    .catch((e) => console.error('Failed to connect to DB', e));


app.use(express.json());

// Route files
const secondChanceItemsRoutes = require("./routes/secondChanceItemsRoutes");
app.use("/api/secondchance/items", secondChanceItemsRoutes);

// authRoutes Step 2: import the authRoutes and store in a constant called authRoutes
//{{insert code here}}

// Items API Task 1: import the secondChanceItemsRoutes and store in a constant called secondChanceItemsRoutes
//{{insert code here}}

// Search API Task 1: import the searchRoutes and store in a constant called searchRoutes
//{{insert code here}}


const pinoHttp = require('pino-http');
const logger = require('./logger');

app.use(pinoHttp({ logger }));

// Use Routes
// authRoutes Step 2: add the authRoutes and to the server by using the app.use() method.
//{{insert code here}}

// Items API Task 2: add the secondChanceItemsRoutes to the server by using the app.use() method.
//{{insert code here}}

// Search API Task 2: add the searchRoutes to the server by using the app.use() method.
//{{insert code here}}


// Global Error Handler

app.all("*", (req, res, next)=>{
    const err = new Error(`Can find the URL ${req.originalUrl} in this application. Please check.`);
    err.status = "Endpoint failure";
    err.statusCode = 404;
    next(err);

})
app.use((err, req, res, next) => {

    console.log(err);
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
            error: 'File is too large. Maximum size allowed is 5MB.'
        });
        }

    } else if(err instanceof FileUploadError) {
        console.error("File instance error.")
        res.status(400).json({
            error: err.message,
        });

    }else if(err instanceof Error && /corrupt|unsupported|Vips|extract_area/i.test(err.message)) {
        return res.status(400).json({
            error: "The uploaded image file is invalid or corrupt. Please try again."
        });
    } else if(err){
        return res.status(500).json({
            error: "Oups..Something bad happened on the server side. Sorry, please try again.",
        })
    };

});

app.get("/",(req,res)=>{
    res.send("Inside the server")
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
