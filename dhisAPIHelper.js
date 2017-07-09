
module.exports = new dhisAPIHelper();
import dhis2API from './dhis2API/dhis2API';
var api = new dhis2API();
import ajax from './ajax-wrapper'



function dhisAPIHelper(){

    this.getClusterCases = function(cases,callback){
        
        cases = cases.split(";");
        var clusterCases = [];
        getEvent(0,cases);
        function getEvent(index,cases){
            if (index == cases.length-1){
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