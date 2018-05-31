
module.exports = new dhisAPIHelper();
import dhis2API from './dhis2API/dhis2API';
var api = new dhis2API();
import ajax from './ajax-wrapper'
import * as NIE from './nie-constants';
import moment from 'moment';
import utility from './utility-functions';

var format = "YYYY-MM-DD"; 

function dhisAPIHelper(){

    this.getClusterCases = function(cases,callback){
        
     //   cases = cases.split(";");
        var clusterCases = [];
        getEvent(0,cases);
        function getEvent(index,cases){
            if (index == cases.length){

                clusterCases = utility.sortBy(clusterCases,function(event){           
                    return event.eventDate;
                }).reverse();
                callback(clusterCases);
                return
            }

            ajax.request({
                type: "GET",
                async: true,
                contentType: "application/json",
                url: "../../events/"+cases[index]
            },function(error,response,body){
                if (error){
                    console.log("Error Fetch Event")
                }
                clusterCases.push(response);
                getEvent(index+1,cases);
            });
        }   
        
    }


    this.saveCluster = function(state,callback){
            
      
        makeNewCluster(state,callback);

        function makeNewCluster(state,callback){
            api.get("organisationUnits",state.cases[0].orgUnit+"?fields=parent[id]",function(error,response,body){
                if (error){
                    callback("Orgnisation Unit Fetch error")
                    return;
                }
                
                getClusterID(function(totalTEI){
                    var clusterDate = new Date();

                    var cluster_tei = {
                        "trackedEntityInstance" : state.data.uid,
                        "trackedEntity" : NIE.CLUSTER_TRACKED_ENTITY,
                        "orgUnit": response.parent.id,
                        "attributes": [ ],
                        "enrollments": [ {
                            "orgUnit": state.cases[0].orgUnit,
                            "program": NIE.CLUSTER_PROGRAM,
                            "enrollmentDate":clusterDate,
                            "incidentDate": clusterDate
                        } ]
                        
                    };
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_CLUSTERID,
                        "value": "CLUSTER"+(totalTEI+1)+ "_"+moment(clusterDate).format("YYYY-MM-DD")
                    })
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_CLUSTER_TYPE,
                        "value": "MANUAL"
                    })
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_COORDINATE,
                        "value": JSON.stringify(state.cases[0].coordinate)
                    })
                    
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_FEATURETYPE,
                        "value": "POINT"
                    })
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_IS_ACTIVE,
                        "value": "true"
                    })
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_CLUSTER_METHOD,
                        "value": "MANUAL"
                    })
                    
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_CASES_UIDS,
                        "value": utility.reduce(state.cases,"event",";")
                    })
                    
                    var outliers = utility.getMaxMinFromList(state.cases,"eventDate");
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_CLUSTER_TAIL_DATE,
                        "value": moment(outliers.max).format(format)
                    })
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_CLUSTER_START_DATE,
                        "value": moment(outliers.max).format(format)
                    })
                    
                    cluster_tei.attributes.push({
                        "attribute": NIE.CLUSTER_TEA_CLUSTER_INDEX_DATE,
                        "value": moment(outliers.min).format(format)
                    })
                    
                    saveCluster(cluster_tei,callback);
                })
                
            })
            
        }
        
        function saveCluster(cluster_tei,callback){
     
           api.get("trackedEntityInstances",cluster_tei.trackedEntityInstance,
                function(error,response,body){
                    if (error){
                        console.log("Custer Fetch error")
                       
                    }
                    
                    if (response.statusText == "Not Found"){
                        api.save("trackedEntityInstance",cluster_tei,function(error,response,body){
                            if (error){
                                console.log("Error : save tei");
                                callback("Some Error Occured")
                                return
                            }
                            callback(false,"Cluster Saved",cluster_tei);
                        })
                    }else{
                        api.update("trackedEntityInstance",cluster_tei.trackedEntityInstance,cluster_tei,function(error,response,body){
                            if (error){
                                console.log("Error : update tei");
                                callback("Some Error Occured")
                                return
                            }
                            callback(false,"Cluster Updated",cluster_tei);
                        })
                        //callback("Already Exists!",response)
                    }  
                })    
        }
        
    }


    function getClusterID(callback){
        api.getTotalTEICount(NIE.CLUSTER_PROGRAM,function(error,response,body){
            if (error){
                __logger.error("Get Cluster ID");
            }
            var body = response;
          
            callback( body.pager.total)
        })
    }
   

    this.saveEventWithDataValue = function(eventUID,deUID,deValue,callback){

        
        api.get("events",eventUID,function(error,response,body){
            
            if (error){
                console.log("Error : Fetch event");
                return
            }
            var event = response;
            event = addUpdateEvent(event,deUID,deValue);
            
            api.update("event",eventUID,event,function(error,response,body){
                if (error){
                    console.log("Error : update event");
                    return
                }
                callback();
            })
        })
    }

    this.saveTEIWithDataValue = function(teiUID,attrUID,attrValue,callback){
        
        api.get("trackedEntityInstances",teiUID,function(error,response,body){
            
            if (error){
                console.log("Error : Fetch tei");
                return
            }
            var tei = response;
            tei = addUpdateTEI(tei,attrUID,attrValue);
            
            api.update("trackedEntityInstance",teiUID,tei,function(error,response,body){
                if (error){
                    console.log("Error : update tei");
                    return
                }
                callback(tei.attributes);
            })
        })
    }

    this.getCluster = function(teiUID,callback){
        api.get("trackedEntityInstances",teiUID,callback)
    }

    function addUpdateTEI(tei,attrUID,deValue){
        
        for (var key in tei.attributes){
            if (tei.attributes[key].attribute == attrUID){
                tei.attributes[key].value = deValue;
                return tei;
            }
        }
        tei.attributes.push({attribute : attrUID,value : attrValue});
        return tei;
    }
    
    function addUpdateEvent(event,deUID,deValue){
        
        for (var key in event.dataValues){
            if (event.dataValues[key].dataElement == deUID){
                event.dataValues[key].value = deValue;
                return event;
            }
        }
        event.dataValues.push({dataElement : deUID,value : deValue});
        return event;
    }
}
