module.exports = thresholdAlerts;

var ajax = require("./ajax");
var constant = require("./CONSTANTS");
var moment = require("moment");
var utility = require('./utility-functions');
var trackerSaver = require('./createTEIAndEvents');
var _ = require('underscore')._;


function* idMaker(data) {
    var keys = Object.keys(data);

    for (var i = 0; i < utility.getMapLength(data); i++) {
        yield keys[i];
    }
}

var labDES = [];

ajax.getReq(constant.DHIS_URL_BASE + "/api/dataElementGroups?fields=id,name,dataElements[id,name]&filter=id:eq:" + constant.LAB_DE_GROUP_UID, constant.auth, getDES);

function getDES(error, response, body) {
    if (error) {
        __logger.error("dataelementgroups fetch")

    }

    var degroup = JSON.parse(body);
    if (degroup) {
        labDES = degroup.dataElementGroups[0].dataElements;
    }
}

function thresholdAlerts(param) {
    var startDate = new Date();
    ;
    var endDate = new Date();
    ;

    if (param.startDate) {
        startDate = new Date(param.startDate);
        endDate = new Date(param.startDate);
    }

    var format = "YYYY-MM-DD";


    this.init = function (callback) {
        startDate = startDate.setDate(startDate.getDate() - 7);
        __logger.info("startdate----", startDate);
        var street = [];
        ajax.getReq(constant.DHIS_URL_BASE + "/api/events?skipPaging=true&paging=false&ouMode=DESCENDANTS&orgUnit=" + constant.DHIS_ROOT_OU_UID + "&program=" + constant.eventProgram + "&startDate=" + moment(startDate).format(format) + "&endDate=" + moment(endDate).format(format), constant.auth, function (error, response, body) {

            if (error) {
                __logger.error("Fetch All Cases")
            }


            var allCases = JSON.parse(body).events;


            var fixedAlgoCases = allCases;
            var street = "";


            __logger.info("fixed-logo-cases---" + allCases.size);
            debugger;


            var ouWiseCasesMap = utility.prepareMapGroupedById(fixedAlgoCases, "orgUnit");
            findClusters(ouWiseCasesMap, moment(endDate).format(format), callback);


        });

    }

    function findClusters(ouMap, date, callback) {
        var idYielder = idMaker(ouMap);

        examineFacility();

        function examineFacility() {
            var index = idYielder.next();
            if (index.done) {
                __logger.info("Finished Examining all Facilities");
                callback();
                return
            }

            var cases = ouMap[index.value];

            doAFIAndLab(index.value, cases, date, function () {
                setTimeout(function () {
                    doADD(index.value, cases, date, function () {
                        setTimeout(function () {
                            __logger.info("DO AFI---");
                            examineFacility();
                        }, 10)
                    })
                }, 500)
            })

        }

        function doAFIAndLab(ouId, ouEvents, clusterDate, callback) {
            var ouEventsMap = utility.prepareIdToObjectMap(ouEvents, "event");
            var clusterFound = false;
            var clusterType = "";
            var cluster_tei = {
                "trackedEntityType": constant.DHIS_CLUSTER_TRACKED_ENTITY_UID,
                "orgUnit": ouId,
                "attributes": [],
                "enrollments": [{
                    "orgUnit": ouId,
                    "program": constant.CLUSTER_PROGRAM,
                    "enrollmentDate": clusterDate,
                    "incidentDate": clusterDate
                }]
            };

            var cases_1 = thresholdViolation(ouEvents, 5, 3, constant.DHIS_DE_SYNDROME_UID, "Acute Febrile illness (AFI)", clusterDate);
            var cases_2 = thresholdViolation(ouEvents, 7, 5, constant.DHIS_DE_SYNDROME_UID, "Acute Febrile illness (AFI)", clusterDate);
            var cases_3 = thresholdViolation(ouEvents, 5, 3, constant.DHIS_DE_SYNDROME_UID, "Influenza Like Illness (ILI)", clusterDate);
            var cases_4 = thresholdViolation(ouEvents, 7, 5, constant.DHIS_DE_SYNDROME_UID, "Influenza Like Illness (ILI)", clusterDate);

            var total_cases = [];

            if (cases_1) {
                __logger.info("CASE1------------");
                clusterFound = true;
                clusterType = "AFI"
                total_cases = total_cases.concat(cases_1);
                cluster_tei.attributes.push({
                    "attribute": constant.CLUSTER_TEA_3AFICASE,
                    "value": "true"
                });
            }
            if (cases_2) {
                clusterFound = true;
                clusterType = "AFI"
                total_cases = total_cases.concat(cases_2);
                cluster_tei.attributes.push({
                    "attribute": constant.CLUSTER_TEA_5AFICASE,
                    "value": "true"
                })
            }
            if (cases_3) {
                clusterFound = true;
                clusterType = "ILI"
                total_cases = total_cases.concat(cases_3);
                cluster_tei.attributes.push({
                    "attribute": constant.CLUSTER_TEA_3ILICASE,
                    "value": "true"
                })
            }
            if (cases_4) {
                clusterFound = true;
                clusterType = "ILI"
                total_cases = total_cases.concat(cases_4);
                cluster_tei.attributes.push({
                    "attribute": constant.CLUSTER_TEA_5ILICASE,
                    "value": "true"
                })
            }


            if (!clusterFound) {
                callback()
                return;
            }


            cluster_tei.trackedEntityInstance = utility.prepareUID(null, total_cases);
            var clusterEvents = makeClusterEvents(total_cases, ouId, clusterDate, ouEventsMap);

            addAttributes(cluster_tei, clusterEvents);


            new trackerSaver(cluster_tei, clusterEvents, ouEvents[0], clusterType, callback);

        }

        function addAttributes(cluster_tei, clusterEvents) {

            var outliers = utility.getMaxMinFromList(clusterEvents, "eventDate");

            cluster_tei.attributes.push({
                "attribute": constant.CLUSTER_TEA_CASES_UIDS,
                "value": utility.reduce(clusterEvents, "event", ";")
            })
            cluster_tei.attributes.push({
                "attribute": constant.CLUSTER_TEA_CLUSTER_TAIL_DATE,
                "value": moment(outliers.max).format(format)
            })
            cluster_tei.attributes.push({
                "attribute": constant.CLUSTER_TEA_CLUSTER_INDEX_DATE,
                "value": moment(outliers.min).format(format)
            })
            cluster_tei.enrollments[0].incidentDate = moment(outliers.min).format(format);
            cluster_tei.enrollments[0].enrollmentDate = moment(outliers.min).format(format);


        }

        function doADD(ouId, ouEvents, clusterDate, callback) {
            var ouEventsMap = utility.prepareIdToObjectMap(ouEvents, "event");

            var clusterFound = false;
            var cluster_tei = {
                "trackedEntity": constant.DHIS_CLUSTER_TRACKED_ENTITY_UID,
                "orgUnit": ouId,
                "attributes": [],
                "enrollments": [{
                    "orgUnit": ouId,
                    "program": constant.CLUSTER_PROGRAM,
                    "enrollmentDate": clusterDate,
                    "incidentDate": clusterDate
                }]
            };

            var cases_1 = thresholdViolation(ouEvents, 3, 2, constant.DHIS_DE_SYNDROME_UID, "Acute Diarrhoel Disease (ADD)", clusterDate);

            var total_cases = [];

            if (cases_1) {
                clusterFound = true;
                total_cases = total_cases.concat(cases_1);
                cluster_tei.attributes.push({
                    "attribute": constant.CLUSTER_TEA_2ADDCASE,
                    "value": "true"
                });
            }

            if (!clusterFound) {
                callback()
                return;
            }


            cluster_tei.trackedEntityInstance = utility.prepareUID(null, total_cases);

            var clusterEvents = makeClusterEvents(total_cases, ouId, clusterDate, ouEventsMap);

            addAttributes(cluster_tei, clusterEvents);
            new trackerSaver(cluster_tei, clusterEvents, ouEvents[0], "ADD", callback);

        }
    }

    function makeClusterEvents(patientEvents, ouId, clusterDate, ouEventsMap) {
        var events = [];
        var patientEventsMap = [];

        for (key in patientEvents) {
            patientEventsMap[patientEvents[key]] = true;
        }


        for (var caseUID in patientEventsMap) {
            var event = {
                status: "COMPLETED",
                orgUnit: ouId,
                program: constant.CLUSTER_PROGRAM,
                programStage: constant.CLUSTER_PROGRAMSTAGE,
                dataValues: [{
                    dataElement: constant.CLUSTER_DE_CASE_TEI_UID,
                    value: caseUID
                }],
                eventDate: ouEventsMap[caseUID].eventDate,
                event: caseUID
            }
            events.push(event);
        }
        return events;
    }


    function thresholdViolation(events, days, cases, deUID, deVal, now) {
        var count = 0;
        var found_events = [];
        now = moment(now).startOf("day");


        for (var i = 0; i < events.length; i++) {
            var evDate = new Date(events[i].eventDate);
            var diff = moment(now).diff(moment(evDate).startOf('day'), 'days');
            if (diff > days) {
                continue
            }
            var dvs = events[i].dataValues;
            var val = utility.findValueAgainstId(dvs, "dataElement", deUID, "value");
            if (val == deVal) {

                found_events.push(events[i].event)
            }
        }

        if (found_events.length >= cases) {


            return found_events
        }


        return false;
    }

    function filterEventsByDataValue(events, idKey, id, valKey, values, operation) {
        var list = [];
        for (var i = 0; i < events.length; i++) {
            if (utility.checkListForValue(events[i].dataValues, idKey, id, valKey, values)) {
                if (operation == "include") list.push(events[i]);
            } else {
                if (operation == "exclude") list.push(events[i]);
            }
        }
        return list;
    }

    function getPositiveCases(events) {

        var found_events = [];

        for (var i = 0; i < events.length; i++) {
            for (var key in labDES) {
                var value = utility.findValueAgainstId(events[i].dataValues, "dataElement", labDES[key].id, "value");
                if (value && value.indexOf("Positive") != -1) {
                    found_events.push(events[i].event)
                }
            }
        }

        if (found_events.length > 1) {
            return found_events
        }
        ;
        return false;
    }
}
