/**
 * Created by harsh on 15/12/16.
 */

import React from 'react';
import ReactDOM from 'react-dom';
//import L from 'leaflet';
import ajax from './ajax-wrapper'
//import $ from 'jquery';
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
const imgpath_afi = "images/afi.png";
const imgpath_add = "images/add.png";
const imgpath_dengue = "images/dengue2.png";
const imgpath_scrub = "images/scrub.jpg";
const imgpath_lepto = "images/lepto.jpg";
const imgpath_malaria = "images/malaria.jpg";


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
        url: "../../dataElementGroups/"+NIE.DEGROUP_CLUSTERTOBESHOWN+"?fields=id,name,dataElements[id,name,valueType]"
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

window.setDistance = function(){
    $('#c_dist').val("1.78412");

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

function setImageVisible(id, visible) {
    var img = document.getElementById(id);
    img.style.visibility = (visible ? 'visible' : 'hidden');
}

window.center = function(){

    map.getMap().setView(new L.LatLng(13.239758,79.978065), 10);

}

window.refresh = function(){

    setImageVisible("loader",true);
    info.update({uid : "",num_points : "",area:""});

    var c_dist=$('#c_dist').val();
    var threshold=$('#threshold').val();
    var area =$('#area').val();

    //    var startDate = $('#sdate').val();
    //    var endDate = $('#edate').val();
    var startDate = $('#sdate').datepicker('getDate');
    var endDate = $('#edate').datepicker('getDate');

    var diff = moment(endDate).diff(startDate,'days');
    // startDate = moment(startDate).format("YYYY-MM-DD");
    // endDate = moment(endDate).format("YYYY-MM-DD");
    
    $('#movingPeriod').text(diff);
    getEvents(startDate,endDate).then(function(events){
        events = filterEvents(events,getFilters(),deNameToIdMap);
        var coords =  extractCoordsFromEvents(events);
        buildMap(coords,c_dist,threshold,area);
    });

}

window.alertConfirmed = function(){
    alert("SMS alerts to go here!");
}

window.onload = function(){
    map = new dhis2Map();

    var startDate = new Date();
    var format = "YYYY-MM-DD";
    var _format = "DD-MM-YYYY";

    $('#edate').val(moment(startDate).format(format));
    startDate.setDate(startDate.getDate() - 5);
    $('#sdate').val(moment(startDate).format(format));


    map.init("mapid",[13.239758,79.978065],10);

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
            '<tr><td>Area </td><td><b><i> '+parseFloat(props.area).toFixed(2)+'(sq Kms)</b></i></td></tr></tbody></table>';
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
    var c_dist=$('#c_dist').val();
    var threshold=$('#threshold').val();
    var area =$('#area').val();

    getEvents(startDate,endDate).then(function(events){
        events = filterEvents(events,getFilters(),deNameToIdMap);
        
        var coords =  extractCoordsFromEvents(events);
        buildMap(coords,c_dist,threshold,area);
    });

    map.getMap().on('popupopen', function(e) {        
        var data = e.popup.data;
        ReactDOM.render(<AlertPopUp data={data} deMap={clusterDeIdToNameMap} />, document.getElementById('hello'));
        //var marker = e.popup._source;
    });
}


function getFilters(){

    var filters = {source : [],
                   diagnosis : [],
                   lab_confirmed : []
                  };
    $('#filters:checked').each(function() {
        var deName = $(this).data('de');
        switch(deName){
        case "id" :         
            filters.source.push($(this).val());
            break;

        case "Diagnosis_Information/Syndrome":
            filters.diagnosis.push(  $(this).val());
            break;

        default : 
            filters.lab_confirmed.push($(this).val());
        }
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
                    
                    result.push({
                        id : events[i].event , 
                        coordinates : events[i].coordinate, 
                        orgUnitName : events[i].orgUnitName,
                        type : events[i].type,
                        orgUnit : events[i].orgUnit
                        
                    })
                }                
            }
        }        
    }
    return result;
}

export function filterEvents(events,filters,deNameToIdMap){

    function filterEventsByDataValue(events,idKey,id,valKey,values,operation){
        var list = [];
        for (var i=0;i<events.length;i++){
            if (utility.checkListForValue(events[i].dataValues,idKey,id,valKey,values)){
                if (operation == "include")  list.push(events[i]);
            }else{
                if (operation == "exclude")  list.push(events[i]);
            }
        }
        return list;
    }
    
    var filteredEvents = [];

    // exclude duplicate cases
    events = filterEventsByDataValue(events,"dataElement",NIE.DE_isDuplicate,"value",["true"],"exclude");  
    
    for (var i =0;i<events.length;i++){
        
        var deIdToNameMap = utility.invert(deNameToIdMap);
        var idToValueDVMap = utility.prepareIdToValueMap(events[i].dataValues,"dataElement","value");
        var source = idToValueDVMap[deNameToIdMap["id"]];
        var diagnosis = idToValueDVMap[deNameToIdMap["Diagnosis_Information/Syndrome"]];
        var dengue = idToValueDVMap[deNameToIdMap[NIE.DENGUE_NAME]];
        var scrub = idToValueDVMap[deNameToIdMap[NIE.SCRUB_NAME]];
        var lepto = idToValueDVMap[deNameToIdMap[NIE.LEPTO_NAME]];
        var malaria = idToValueDVMap[deNameToIdMap[NIE.MALARIA_NAME]];
        

        if (source == NIE.LAB_FORM_VAL && utility.contains(filters.source,source)){
            if (utility.contains(filters.lab_confirmed,scrub)){
                events[i].type = scrub;
                filteredEvents.push(events[i]);  continue; 
            }
            if (utility.contains(filters.lab_confirmed,dengue)){
                events[i].type = dengue;
                filteredEvents.push(events[i]);  continue; 
            }
            
            if (utility.contains(filters.lab_confirmed,malaria)){
                events[i].type = malaria;
                filteredEvents.push(events[i]);   continue;
            }
            if (utility.contains(filters.lab_confirmed,lepto)){
                events[i].type = lepto;
                filteredEvents.push(events[i]);   continue;
            }
        }

        if ((source == NIE.IPD_FORM_VAL || source == NIE.OPD_FORM_VAL) && utility.contains(filters.diagnosis,diagnosis) && utility.contains(filters.source,source)  ){
            events[i].type = diagnosis;
            filteredEvents.push(events[i]);
            continue;
        }
        
        if ((filters.diagnosis.length == 0 && filters.lab_confirmed.length == 0 ) && utility.contains(filters.source,source) ){
            events[i].type = source;
            filteredEvents.push(events[i]); continue;     
        }
        
        if ((filters.diagnosis.length != 0 && filters.lab_confirmed.length == 0 ) && utility.contains(filters.source,source) && source == NIE.LAB_FORM_VAL ){
            events[i].type = source;
            filteredEvents.push(events[i]); continue;     
        }
        
        
        if ((filters.diagnosis.length == 0 && filters.lab_confirmed.length != 0 ) && 
            utility.contains(filters.source,source) && 
            (source == NIE.IPD_FORM_VAL || source == NIE.OPD_FORM_VAL) ){
            events[i].type = source;
            filteredEvents.push(events[i]); continue;     
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

function buildMap(coords,c_dist,threshold,area){
    if (threshold < 3){alert("threshold cannot be less than 3"); return}

    map.clearLayers();

    //  window.coords=coords;
    var areaFilter = document.getElementById('areaCheckbox').checked;
    
    var featureCollection = mUtility.clusterize(coords,c_dist,threshold,area,areaFilter);
    
    var icon = getCustomIcon();

    //var redAlertMarker = new icon({iconUrl: 'images/red-icon.png'})
    var feverDotIcon =L.divIcon({
        className:'alert-icon leaflet-clickable',
        html:'<i class="alert-icon"></i>'
    });
    
    var feverIcon =getCustomIcon('yellow');

    var pointToLayer = function(feature, latlng) {
        if (feature.properties){
            var hoverText = feature.properties.label;
            switch(feature.properties.type){
            case 'centroid' : 
                var centroidIcon =L.divIcon({
                    className:'alert-icon-centroid leaflet-clickable',
                    html:'<i class="alert-icon-centroid"><b>['+feature.properties.clusterSize+']</b></i>'
                });
                
                return L.marker(latlng,{
                    icon : centroidIcon
                });
            case NIE.IPD_FORM_VAL :  
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_ipd),
                    title : hoverText
                });
                
            case NIE.OPD_FORM_VAL :   return L.marker(latlng,{
                icon :  getCustomIcon2(imgpath_opd),
                title : hoverText
            });
            case NIE.LAB_FORM_VAL :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_lab),
                    title : hoverText
                });
            case NIE.AFI_DIAGNOSIS_VAL :   return L.marker(latlng,{
                icon :  getCustomIcon2(imgpath_afi),
                title : hoverText
            });
            case NIE.ADD_DIAGNOSIS_VAL :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_add),
                    title : hoverText
                });
            case NIE.DENGUE_VAL :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_dengue),
                    title : hoverText
                });
	    case NIE.LEPTO_VAL :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_lepto),
                    title : hoverText
                });
	    case NIE.SCRUB_VAL :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_scrub),
                    title : hoverText
                });
	    case NIE.MALARIA_VAL :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_malaria),
                    title : hoverText
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
	    '<img src="'+imgpath_afi+'"  height="'+height+'" width="'+width+'">  AFI<br>'+
	    '<img src="'+imgpath_add+'"  height="'+height+'" width="'+width+'">  ADD<br>'+
	    '<img src="'+imgpath_dengue+'"  height="'+height+'" width="'+width+'">  Dengue<br>'+
	    '<img src="'+imgpath_scrub+'"  height="'+height+'" width="'+width+'">  Scrub Typhus<br>'+
	    '<img src="'+imgpath_lepto+'"  height="'+height+'" width="'+width+'">  Leptosprirosis<br>'+
	    '<img src="'+imgpath_malaria+'"  height="'+height+'" width="'+width+'">  Malaria<br>'+

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

        if (layer.setStyle){
            
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
            
            var popup = new L.Popup(AlertPopUp);
            popup.data = feature.properties; 
            popup.setContent("<div class='linelist' id='hello'></div>");
            popup.setLatLng(layer.getLatLng());
            
            popup.on('popupclose', function(e) {
                debugger
            });
            
            layer.bindPopup(popup,{
                maxWidth : 600,
                autoPan : true,
                keepInView : true
            });
            
            //  var px = map.project(popup._latlng); // find the pixel location on the map where the popup anchor is
            //  px.y -= popup._container.clientHeight/2 // find the height of the popup container, divide by 2, subtract from the Y axis of marker location
            // map.panTo(map.unproject(px),{animate: true}); // pan to new center
            /*  layer.on({
	    //mouseover: highlightFeature,
	    //  mouseout: resetHighlight,
	    click: panToFeature
	    
            });*/
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

    setImageVisible("loader",false);

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
        iconSize: [20, 20],
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
