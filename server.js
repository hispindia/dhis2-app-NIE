var constant = require("./CONSTANTS");
var CronJob = require('cron').CronJob;
var clusterHistoric = require('./clusterHistoric');
var moment = require("moment");
var express = require('express');

var eventService = require('./updateEvent');


var app = express();
/**
 * Set up CORS Settings
 */ app.use(function (req, res, next) {


    res.setHeader('Access-Control-Allow-Origin', '*');


    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');


    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');


    next();
});
/**
 */
var bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));


/** Set Up Logging
 */
var winston = require('winston');
global.__logger = winston.createLogger({
    level: 'silly',
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            timestamp: true
        }),
        new (winston.transports.File)({
            filename: './logs/server.log',
            timestamp: true
        })
    ]
});

/**
 */

var server = app.listen(8000, function () {
    var host = server.address().address
    var port = server.address().port

    __logger.info("Server listening at http:

})


__logger.info("Starting service");
var endDate = moment();
var startDate = new Date();
startDate = moment("07-01-2020", "MM-DD-YYYY");
endDate = moment("04-30-2021", "MM-DD-YYYY");
new clusterHistoric(startDate, endDate);







































