/**
 * Created by harsh on 15/12/16.
 */

import React from 'react';
import ReactDOM from 'react-dom';
//import L from 'leaflet';
import ajax from './ajax-wrapper'
import $ from 'jquery';
import dhis2API from './dhis2API/dhis2API';
import moment from 'moment';
import dhis2Map from './maps/map';
import mUtility from './maps/mapUtilities';
import {AlertPopUp} from './components/components';
import * as NIE from './nie-constants';
import utility from './utility-functions';

var map
var api = new dhis2API();
var previousClusterLayer;
var info;
var deNameToIdMap = [];
var clusterDeIdToNameMap = [];

const imgpath_ipd = "images/ipd.png";
const imgpath_lab = "images/lab.png";
const imgpath_opd = "images/opd.png";
const imgpath_dengue = "images/dengue2.png";

const imgpath_cluster = "images/marker-icon-red.png";

function fetchDEs(){
  ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../dataElements?&fields=id,name&paging=false"
    },function(error,response){
        if (error){
            console.log("Fetch DE")
        }else{
            deNameToIdMap = utility.prepareIdToValueMap(response.dataElements,"name","id");
        }
    })

};fetchDEs();


function getClusterToBeShownDE(){
 ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../dataElementGroups/"+NIE.DEGROUP_CLUSTERTOBESHOWN+"?fields=id,name,dataElements[id,name]"
    },callback);
    
    function callback(error, response, body){
        if (error){
            console.log("de cluster")
        }        
        clusterDeIdToNameMap =  utility.prepareIdToObjectMap(response.dataElements,"id");      
    }
}getClusterToBeShownDE();

function saveClusterFoo(args){

window.saveCluster(args);
}

window.saveCluster = function(args){

var properties = utility.unshadowStringify(args);

NIE.Cluster_ProgramUID;

var tei = {
    trackedEntityInstance : properties.uid,
    orgUnit : api.getRootOrgUnitUid(),
    trackedEntity : NIE.TrackedEntity,
    relationships : [
       
    ]
}

for  (var i=0;i<properties.teis.length;i++){
    var rel =  {
        relationship: NIE.Cluster_Relationship,
        trackedEntityInstanceA : tei.trackedEntityInstance,
        trackedEntityInstanceB : properties.teis[i]
    }
    tei.relationships.push(rel);
}
    api.save("trackedEntityInstance",tei,callback);
    
function callback(error,response){
    if (error){
        alert("Already Exists!!");
    }else{
        alert("Cluster Saved Succesfully!");
    }        
}
    
//program : NIE.Cluster_ProgramUID,

}

window.refresh = function(){

    var c_dist=$('#c_dist').val();
    var threshold=$('#threshold').val();
    var startDate = $('#sdate').val();
    var endDate = $('#edate').val();

    var diff = moment(new Date()).diff(startDate,'days');
    
    $('#movingPeriod').text(diff);
    getEvents(startDate,endDate).then(function(events){
        events = filterEvents(events,getFilters(),deNameToIdMap);
        var coords =  extractCoordsFromEvents(events);
        buildMap(coords,c_dist,threshold);
    });

}

window.alertConfirmed = function(){
    alert("SMS alerts to go here!");
}

$('document').ready(function(){
    map = new dhis2Map();

    var startDate = new Date();
    var format = "YYYY-MM-DD";
    $('#sdate').val(moment(startDate).format(format));
    startDate.setDate(startDate.getDate() - 5);
    $('#edate').val(moment(startDate).format(format));

    map.init("mapid",[13.23521,80.3332],9);
    addLegend(map.getMap())

    // control that shows state info on hover
    
    info = L.control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };

    info.update = function (props) {
        if (!props){return} 

        this._div.innerHTML = '<table><thead><tr><th>Cluster Id  </th><th><b><i>'+props.uid+'</b></i></th></tr><thead>'+
            '<tbody><tr><td>No of Cases </td><td> <b><i>'+props.num_points + '</b></i></td></tr>'+
            '<tr><td>Area </td><td><b><i> '+((parseFloat(props.area)/1000000)).toFixed(2)+'(sq Kms)</b></i></td></tr></tbody></table>';
    };

    info.addTo(map.getMap());

    var style = { color: "black",
                  opacity: 0.75,
                  fillColor: "white",
                  fillOpacity: 0,
                  weight : 2,
                  //                  dashArray: '5, 5',

                }

    addOrgUnitLayer(5,Object.assign({},style));
    style.weight =0.95;
    style.color = "black";
    style.opacity = 0.25;
    addOrgUnitLayer(8,Object.assign({},style));

    // coordinates to be filtered here.
    var startDate = $('#sdate').val();
    var endDate = $('#edate').val();

    getEvents(startDate,endDate).then(function(events){
        events = filterEvents(events,getFilters(),deNameToIdMap);
        var coords =  extractCoordsFromEvents(events);
        buildMap(coords,5,3);
    });

});


function getFilters(){

    var filters = [];
    $('#filters:checked').each(function() {
        var deUID = $(this).data('de');
        filters.push( {id : deUID, value : $(this).val()});
    });
    return filters;
}
function addOrgUnitLayer(level,style){

    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../organisationUnits?filter=level:eq:"+level+"&fields=id,name,coordinates&paging=false"
    },function(error,response){
        if (error){

        }else{
            addOrgUnits(getCoordinatesFromOus(response.organisationUnits),style);
        }
    })

}                    
function getEvents(startDate,endDate){
    var def = $.Deferred();

    //    var endDate = new Date();
    var format = "YYYY-MM-DD";

    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../events?orgUnit="+api.getRootOrgUnitUid()+"&ouMode=DESCENDANTS&startDate="+moment(startDate).format(format)+"&endDate="+moment(endDate).format(format)+"&skipPaging=true"
    },function(error,response){
        if (error){
            def.resolve(null);
        }else{
            def.resolve(response.events);
        }
    })
    return def.promise();
}

function extractCoordsFromEvents(events){
    
    var result = [];
    for (var i=0;i<events.length;i++){       
        if (events[i].coordinate){
            if (events[i].coordinate.latitude!=0&&events[i].coordinate.longitude!=0){
                if (events[i].program == NIE.PROGRAM_ODK_DATA){
                    var type = "unknown";
                   
                    var id = utility.findValueAgainstId(events[i].dataValues,"dataElement",deNameToIdMap["id"],"value")
                   
                    switch(id){
                    case 'eDFSS_IPD_V3' : type = "IPD";
                        break
                    case 'eDFSS_OPD_V3' : type = "OPD";
                        break
                    case 'DPHL_Lab_V1' : type = "LAB";
                        break
                    }
                    
                    if (utility.findValueAgainstId(events[i].dataValues,"dataElement",deNameToIdMap["Dengue"],"value") == "Dengue_Positive_IgM"){
                        type = "Dengue";
                    }

                    result.push({
                        id : events[i].event , 
                        coordinates : events[i].coordinate, 
                        orgUnit : events[i].orgUnitName,
                        type : type,
                        trackedEntityInstance : events[i].trackedEntityInstance
                        
                    })
                }
                
            }
        }
        
    }
    return result;
}

export function filterEvents(events,filters,deNameToIdMap){

    var filteredEvents = [];

    for (var i =0;i<events.length;i++){
        
        for(var key in filters){
            var value = utility.findValueAgainstId(events[i].dataValues,"dataElement",deNameToIdMap[filters[key].id],"value");
            if (value == filters[key].value){
                filteredEvents.push(events[i]);
                break;
            }
        }
    }

    return filteredEvents;
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

function addOrgUnits(blockCoords,style){
    
    // a GeoJSON multipolygon
    var mp = {
        "type": "Feature",
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": blockCoords
        },
        "properties": {
            "name": "MultiPolygon",
            key : "block"
        }
    };
    
    var pointToLayer = function(feature, latlng) {
        feature.properties.style = style;
    };

    map.addGeoJson(mp,null,style);

}

function buildMap(coords,c_dist,threshold){
    if (threshold < 3){alert("threshold cannot be less than 3"); return}

    map.clearLayers();

    //  window.coords=coords;
    var featureCollection = mUtility.clusterize(coords,c_dist,threshold);
    
    var icon = getCustomIcon();

    //var redAlertMarker = new icon({iconUrl: 'images/red-icon.png'})
    var feverDotIcon =L.divIcon({
        className:'alert-icon leaflet-clickable',
        html:'<i class="alert-icon"></i>'
    });
    
    var feverIcon =getCustomIcon('yellow');

    var pointToLayer = function(feature, latlng) {
        if (feature.properties){
            switch(feature.properties.type){
            case 'centroid' : 
                var centroidIcon =L.divIcon({
                    className:'alert-icon-centroid leaflet-clickable',
                    html:'<i class="alert-icon-centroid"><b>['+feature.properties.clusterSize+']</b></i>'
                });
                
                return L.marker(latlng,{
                    icon : centroidIcon
                });
            case 'IPD' :  
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_ipd)
                });
                
            case 'OPD' :   return L.marker(latlng,{
                icon :  getCustomIcon2(imgpath_opd)
            });
            case 'LAB' :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_lab)
                });
            case 'Dengue' :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_dengue)
                });
            }
        }
        
        return L.marker(latlng, {
            // icon: icon
        });
        
    }
    
    var oms = new OverlappingMarkerSpiderfier(map.getMap(),{
        nearbyDistance : 1 , keepSpiderfied : true
    });

    var popup = new L.Popup();
    oms.addListener('click', function(marker) {
        popup.setContent(marker.desc);
        popup.setLatLng(marker.getLatLng());
        map.getMap().openPopup(popup);
    });
    var data = featureCollection.geoJsonPointFeatures;
    for (let i=0;i<data.features.length;i++){
        var loc = new L.LatLng(data.features[i].geometry.coordinates[1], data.features[i].geometry.coordinates[0]);
        var marker = pointToLayer(data.features[i],loc);
        marker.feature = {};
        marker.feature.properties = data.features[i].properties;
        marker.desc = data.features[i].properties.label;
        map.getMap().addLayer(marker);
        oms.addMarker(marker); 
    }
    // var pointsLayers =  map.addGeoJson(featureCollection.geoJsonPointFeatures,pointToLayer,null,onEachFeature); 
    
    /*   
         pointToLayer = getPointToLayer(feverIcon,feverDotIcon);  
         var style = function(){
         return { color: "darkred",
         opacity: 0.75,
         fillColor: "red",
         fillOpacity: 0.1,                
         dashArray: '5, 5',
         //weight: 5

         }
         }
         // var onEachFeature = onEachFeature;
         map.addGeoJson(featureCollection.geoJsonPolygonFeatures,pointToLayer,style,onEachFeature);
    */
    addClustergons(map.getMap(),featureCollection.geoJsonPolygonFeatures)

    //  setTimeout(function(){ReactDOM.render(<AlertPopUp />, document.getElementById('alert'))},10000)

    // map.();
}

function addLegend(map){
    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {

	var div = L.DomUtil.create('div', 'info legend');
        var height = 15,width=15;
        var html = '<img src="'+imgpath_ipd+'"  height="'+height+'" width="'+width+'">  IPD<br>'+
	    '<img src="'+imgpath_opd+'"  height="'+height+'" width="'+width+'">  OPD<br>'+
	    '<img src="'+imgpath_lab+'"  height="'+height+'" width="'+width+'">  LAB<br>'+
	    '<img src="'+imgpath_dengue+'"  height="'+height+'" width="'+width+'">  Dengue<br>'+
	    '<img src="'+imgpath_cluster+'"  height="'+22+'" width="'+17+'">  CLUSTER';
        
        /*  var html = "<i class='alert-icon' style='background:"+color_afi+"'></i> : AFI<br>"+
            "<i class='alert-icon' style='background: "+color_add+"'></i>  : ADD<br>"+
            "<i class='alert-icon' style='background: "+color_lab+"'></i>  : LAB";
	*/
        div.innerHTML = html;
	return div;
    };

    legend.addTo(map);

}
function addClustergons(map,gjson){

    var geojson;
    function highlightFeature(e) {
        var layer = e.target;
        
        if (previousClusterLayer)
            geojson.resetStyle(previousClusterLayer);
        previousClusterLayer = layer;
        layer.setStyle({
	    weight: 3,
	    color: '#de2d26',
            opacity: 0.9,
            fillColor: "black",
            fillOpacity: 0.05,   
	    dashArray: '',
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
	    layer.bringToFront();
        }

        info.update(layer.feature.properties);
    }


    function resetHighlight(e) {
        geojson.resetStyle(e.target);
        //	info.update();
    }

    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }
    function panToFeature(e){
        map.panTo(e.target.getLatLng()); 
    }
    var style = function(){
        return { color: "black",
                 opacity: 0.75,
                 fillColor: "red",
                 fillOpacity: 0.1,                
                 dashArray: '5, 5',
                 weight: 3

               }
    }

    var onEachFeature = function (feature, layer)
    {
        
        if (feature.properties.type == 'centroid'){                
            
           var str = feature.properties;
            getClusterInfoHTML(str,function(htmlStr){
            
                str = utility.shadowStringify(str);
                
                layer.bindPopup(htmlStr,{
                    maxWidth : 600,
                    maHeight : 400
                });

                layer.on({
	             // mouseover: highlightFeature,
	            //  mouseout: resetHighlight,
	            click: panToFeature
	        });             
            });
        }
        layer.on({
	    mouseover: highlightFeature,
	    //  mouseout: resetHighlight,
	    //   click: zoomToFeature
	});

    }

    var pointToLayer = function(feature, latlng) {
        if (feature.properties.type=="centroid"){
            return L.marker(latlng, {
                icon: getCustomIcon('red')
            });
        }
        
        return L.marker(latlng, {
            // icon: icon
        });
        
    }
    

    geojson = L.geoJson(gjson, {
	style: style,
	onEachFeature: onEachFeature,
        pointToLayer : pointToLayer
    }).addTo(map);

    //zoomToBiggestCluster(map,geojson._layers);
}

function zoomToBiggestCluster(map,layers){
    var maxPoints = 0;
    var bounds = null;
    for (var key in layers){
        var layer = layers[key];
        if (layer.feature.properties.num_points > maxPoints){
            bounds=layer.getBounds();
            maxPoints =layer.feature.properties.num_points; 
        }
    }
    
    map.fitBounds(bounds);

}

function onEachFeature (feature, layer)
{
 if (feature.properties.type == 'centroid'){                
     layer.bindPopup('<div id="alert"><i>Cluster Found</i><br><input type="button" value="Please confirm" onclick="alertConfirmed()"></div>');
     
 }else{
       layer.bindPopup('<div id="alert"><i>Fever Case[<b> '+feature.properties.label+'</b>]<br></div>');
      }

}


function getPointToLayer(centroidIcon,icon){
    return function(feature, latlng) {
        if (feature.properties)
            if (feature.properties.type == 'centroid'){
                var centroidIcon =L.divIcon({
                    className:'alert-icon-centroid leaflet-clickable',
                    html:'<i class="alert-icon-centroid"><b>['+feature.properties.clusterSize+']</b></i>'
                });                                      
                return L.marker(latlng,{
                    icon : centroidIcon
                })
            }

        return L.marker(latlng, {
            // icon: icon
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


function getCustomIcon2(iconUrl){
    return   new L.Icon({
        //  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        iconUrl:iconUrl,
        //  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        shadowUrl: 'images/point-shadow.png',
        iconSize: [25, 25],
        //        iconSize: [25, 41],

        //        iconAnchor: [12, 41],
        iconAnchor: [6, 1],

        popupAnchor: [1, -34],
        shadowSize: [16, 20]
    });

}

function getCustomDivIcon(background){

    return L.divIcon({
        className : 'alert-icon '+'',
        html:'<i class="alert-icon"  style="background: '+background+'"></i>'
    });
}

function getClusterInfoHTML(properties,callback){

 getClusterCases(properties.keys,gotCases);
        function gotCases(cases){
            var popupHtml = "<div class='linelist'><input type='button' onclick='saveCluster()' value='Save'/><br>";
            popupHtml = popupHtml+"<table class='listTable'><thead><tr><th>isDuplicate</th>";
                                 
            for (var key in clusterDeIdToNameMap ){
                popupHtml +="<th>"+clusterDeIdToNameMap[key].name+"</th>"
            }
            popupHtml+="</tr></thead><tbody>"

            for (var i=0;i<cases.length;i++){
                
                var isDuplicate =  utility.findValueAgainstId(cases[i].dataValues,"dataElement",NIE.DE_isDuplicate,"value");
                
                popupHtml = popupHtml+"<tr class=''><td><input type='checkbox' value='duplicate' onchange=toggleDuplicate('"+cases[i].event+"',"+isDuplicate+") ></input></td>"
                
                for (var key in clusterDeIdToNameMap ){
                    var value = utility.findValueAgainstId(cases[i].dataValues,"dataElement",key,"value");
                    if (!value){value = ""};
                    popupHtml +="<td>"+value+"</td>"
                }
               
                popupHtml = popupHtml + "</tr>"
            }
            popupHtml +="<tbody></table></div>" 
            callback(popupHtml);   
        }
}

function getClusterCases(cases,callback){

  //  cases = cases.split(";");
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