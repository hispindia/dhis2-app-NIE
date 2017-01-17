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


var api = new dhis2API();
var map = new dhis2Map();

$('document').ready(function(){

    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../organisationUnits?filter=level:eq:5&fields=id,name,coordinates&paging=false"
    },function(error,response){
        if (error){

        }else{
           // makeMap(getCoordinatesFromOus(response.organisationUnits));
        }
    })

// coordinates to be filtered here.
    getEvents();

});

function getEvents(){

    var endDate = new Date();
    var startDate = new Date();
    startDate.setDate(endDate.getDate() - 5);
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
                buildMap(coords);
debugger
            }
        })

function extractCoordsFromEvents(events){

var result = [];
    for (var i=0;i<events.length;i++){       
         if (events[i].coordinate){
            if (events[i].coordinate.latitude!=0&&events[i].coordinate.longitude!=0){
                result.push({unique_id:events[i].event , coordinates : events[i].coordinate})
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

function makeMap(blockCoords){

    var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: "Map: <a href='http://www.openstreetmap.org/'>&copy; OpenStreetMap </a>contributers" });
    var esri = L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}.png', {attribution: "Map: <a href='http://www.arcgis.com/home/item.html?id=c4ec722a1cd34cf0a23904aadf8923a0'>ArcGIS - World Physical Map</a>" });
    var stamen = L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {attribution: "Map: <a href='http://maps.stamen.com/#toner/12/37.7706/-122.3782'>Stamen Design</a>" })
    var baseLayers = {"stamen": stamen, "osm":osm, "esri":esri};

    // a GeoJSON multipolygon
    var mp = {
        "type": "Feature",
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": blockCoords
        },
        "properties": {
            "name": "MultiPolygon",
            "style": {
                color: "black",
                opacity: 0.75,
                fillColor: "white",
                fillOpacity: 0
            }
        }
    };

// create a map in the "map" div, set the view to a given place and zoom
    var map = L.map('mapid', {
        center : [13.23521,80.3332],
        zoom: 10
    });
    baseLayers.osm.addTo(map);
  //  baseLayers.stamen.addTo(map);

    new L.GeoJSON(mp, {
        style: function(feature) {
            return feature.properties.style
        }
    }).addTo(map);

    var littleton = L.marker([13.23521,80.3332]).bindPopup('test').addTo(map);
    var little = L.marker([13.23521,80.3332]).bindPopup('teshgghgft').addTo(map);


}

function buildMap(coords){

    map.init("mapid",[13.23521,80.3332],10);

    mUtility.clusterize(coords,5);
   // map.setEventLayer();
}
