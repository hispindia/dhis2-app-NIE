/**
 * Created by harsh on 15/12/16.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';
import ajax from './ajax-wrapper'
import $ from 'jquery';
import dhis2API from './dhis2API/dhis2API';
import moment from 'moment';
import dhis2Map from './maps/map';
import mUtility from './maps/mapUtilities';
import {AlertPopUp} from './components/components';


var api = new dhis2API();
var map = new dhis2Map();

window.refresh = function(){


var c_dist=$('#c_dist').val();
var threshold=$('#threshold').val();
buildMap(window.coords,c_dist,threshold);

}

window.alertConfirmed = function(){
   alert("SMS alerts to go here!");

}

$('document').ready(function(){


    map.init("mapid",[13.23521,80.3332],9);

    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../organisationUnits?filter=level:eq:5&fields=id,name,coordinates&paging=false"
    },function(error,response){
        if (error){

        }else{
            addOrgUnits(getCoordinatesFromOus(response.organisationUnits));
        }
    })

// coordinates to be filtered here.
    getEvents();

});

function getEvents(){

    var endDate = new Date();
    var startDate = new Date();
    startDate.setDate(endDate.getDate() - 15);
    var format = "YYYY-MM-DD";

        ajax.request({
            type: "GET",
            async: true,
            contentType: "application/json",
            url: "../../events?orgUnit="+api.getRootOrgUnitUid()+"&ouMode=DESCENDANTS&startDate="+moment(startDate).format(format)+"&endDate="+moment(endDate).format(format)+"&skipPaging=true"
        },function(error,response){
            if (error){

            }else{

              var coords =  extractCoordsFromEvents(response.events);
                buildMap(coords,5,3);

            }
        })

function extractCoordsFromEvents(events){

var result = [];
    for (var i=0;i<events.length;i++){       
         if (events[i].coordinate){
            if (events[i].coordinate.latitude!=0&&events[i].coordinate.longitude!=0){
                result.push({unique_id:events[i].event , coordinates : events[i].coordinate, orgUnit : events[i].orgUnitName})
            }
        }
        
    }
return result;
}

}

function getCoordinatesFromOus(ous){

    var ouCoords = [];
    for (var key in ous){
        if (ous[key].coordinates){
            var coords = JSON.parse(ous[key].coordinates);
            //reverseCoordinates(coords[0]);

            ouCoords.push(coords[0]);
        }
    }
    return ouCoords;
}

function reverseCoordinates(coords){

    for (var i=0;i<coords.length;i++){
        for (var j=0;j<coords[i].length;j++){
            var temp = coords[i][j][0];
            coords[i][j][0] = coords[i][j][1];
            coords[i][j][1] = temp;
        }
    }
    return coords;
}

function addOrgUnits(blockCoords){

   
    // a GeoJSON multipolygon
    var mp = {
        "type": "Feature",
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": blockCoords
        },
        "properties": {
            "name": "MultiPolygon",
            layerId :"custom" 

          
        }
    };
var style = { color: "black",
                opacity: 0.75,
                fillColor: "white",
                fillOpacity: 0,
              weight : 1,
//                  dashArray: '5, 5',

            }

 var pointToLayer = function(feature, latlng) {
              feature.properties.style = style;
            };

    map.addGeoJson(mp,null,style);

}

function buildMap(coords,c_dist,threshold){
    if (threshold < 3){alert("threshold cannot be less than 3"); return}

   map.clearLayers();

window.coords=coords;
    var featureCollection = mUtility.clusterize(coords,c_dist,threshold);
    
    var icon = getCustomIcon();

    //var redAlertMarker = new icon({iconUrl: 'images/red-icon.png'})
    var feverDotIcon =L.divIcon({
    className:'alert-icon leaflet-clickable',
    html:'<i class="alert-icon"></i>'
    });
       
    var feverIcon =getCustomIcon('yellow');

    var pointToLayer = getPointToLayer(feverIcon,feverDotIcon);
    map.addGeoJson(featureCollection.geoJsonPointFeatures,pointToLayer); 
    
    pointToLayer = getPointToLayer(feverIcon,feverDotIcon);  
    var style = { color: "darkred",
                opacity: 0.75,
                fillColor: "red",
                fillOpacity: 0.1,                
                  dashArray: '5, 5',
                  //weight: 5

            }

  debugger

    map.addGeoJson(featureCollection.geoJsonPolygonFeatures,pointToLayer,style);
    
  //  setTimeout(function(){ReactDOM.render(<AlertPopUp />, document.getElementById('alert'))},10000)

   // map.();
}

function getPointToLayer(centroidIcon,icon){
return function(feature, latlng) {
    if (feature.properties)
        if (feature.properties.type == 'centroid'){
            var centroidIcon =L.divIcon({
                className:'alert-icon-centroid leaflet-clickable',
                html:'<i class="alert-icon-centroid"><b> ['+feature.properties.clusterSize+'] </b></i>'
            });                                      
               return L.marker(latlng,{
                        icon : centroidIcon
                    })
        }

                return L.marker(latlng, {
                    icon: icon
                });
            };

}
function getCustomIcon(name){
return   new L.Icon({
//  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconUrl: 'images/marker-icon-'+name+'.png',
//  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  shadowUrl: 'images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

}

