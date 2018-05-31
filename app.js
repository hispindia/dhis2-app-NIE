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
import dhisAPIHelper from './dhisAPIHelper';

var map;
var api = new dhis2API();
var previousClusterLayer;
var info;

const imgpath_polygon_5_sided = "images/afi_3.png";
const imgpath_red_circle = "images/lab_1.png";
const imgpath_star = "images/afi_5.png";
const imgpath_cluster = "images/marker-icon-red.png";
const imgpath_yellow_triangle = "images/yellow-triangle.PNG";
const imgpath_marker_icon_blue = "images/marker-icon-blue.png";
const imgpath_marker_icon_inactive = "images/marker-icon-inactive.png";

var deIdToNameMap = [];
var clusterDeIdToNameMap = [];

getDE();getClusterToBeShownDE();
function getDE(){
    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../dataElements?fields=[id,name]&paging=false"
    },callback);
    
    function callback(error, response, body){
        if (error){
            console.log("de")
        }        
        deIdToNameMap =  utility.prepareIdToObjectMap(response.dataElements,"id");        
    }
}

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
}
//wmsInit();
function wmsInit(){
    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "http://nieicmr:icmr0217@gisnic.tn.nic.in:8080/geoserver/tnssdi/wms?version%3D1.1.0&username=nieicmr&service=WMS&request=GetMap&layers=tnssdi_admin%3Atnssdi_admin&styles=&format=image%2Fjpeg&transparent=false&version=1.1.1&height=256&width=256&srs=EPSG%3A3857&bbox=8922952.933898337,1330615.7883883493,9001224.450862357,1408887.3053523696"
    },callback);
    
    function callback(error, response, body){     
        
    }

}

window.toggleDuplicate = function(eventUID,currentValue){

    if (currentValue){
        currentValue = false
    }else{
        currentValue = true
    }

    dhisAPIHelper.saveEventWithDataValue(eventUID,NIE.DE_isDuplicate,currentValue,function(){
    debugger
    });

}

window.center = function(){

    map.getMap().setView(new L.LatLng(13.239758,79.978065), 10);

}

window.refresh = function(){

    var startDate = $('#sdate').datepicker('getDate');
    var endDate = $('#edate').datepicker('getDate');

   // var startDate = $('#sdate').val();
    //var endDate = $('#edate').val();
    var excludeInactive = document.getElementById('excludeInactive').checked;
    startDate = new Date(endDate)
    startDate = startDate.setDate(startDate.getDate() - 7);            
    var _startDate = moment(startDate).format("YYYY-MM-DD");
    var _endDate = moment(endDate).format("YYYY-MM-DD");
    console.log(startDate+"-"+endDate)
    getTEI(_startDate,_endDate).then(function(teis){
        getOUNames(teis).then(function(ous){
            var ouIDToNameMap = ous.reduce(function(map,obj){
                map[obj.id] = obj.name;
                return map;
            },[])
            
            var coords =  extractCoordsFromTEI(teis,excludeInactive,ouIDToNameMap);
            buildMap(coords,5,3);
        })
    });
}

window.onload = function(){      

    map = new dhis2Map();
    
    var startDate = new Date();
    var endDate = new Date();
    var format = "YYYY-MM-DD";
    var _format = "DD-MM-YYYY";

    startDate.setDate(endDate.getDate() - 7);
    $('#sdate').val(moment(startDate).format(format));
    $('#edate').val(moment(endDate).format(_format));

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
   
    getTEI(startDate,endDate).then(function(teis){
         getOUNames(teis).then(function(ous){
            var ouIDToNameMap = ous.reduce(function(map,obj){
                map[obj.id] = obj.name;
                return map;
            },[])
             
             var coords =  extractCoordsFromTEI(teis,excludeInactive,ouIDToNameMap);
             buildMap(coords,5,3);
            
         })
       
    });

    var showClusterIntensity = document.getElementById('showClusterIntensity').checked;

    map.getMap().on('popupopen', function(e) {
        
        var data = e.popup.data;
        console.log("popup startdate="+startDate)
        ReactDOM.render(<AlertPopUp data={data} deMap={clusterDeIdToNameMap} endDate={moment(startDate.toISOString())} clusterIntensity={showClusterIntensity} />, document.getElementById('hello'));
        //var marker = e.popup._source;
    });
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

function getTEI(startDate,endDate){
    var def = $.Deferred();

    //    var endDate = new Date();
    var format = "YYYY-MM-DD";

    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
     //   url: "../../trackedEntityInstances?ou="+NIE.ROOT_OU_UID+"&ouMode=DESCENDANTS&programStartDate="+moment(startDate).format(format)+"&programEndDate="+moment(endDate).format(format)+"&program="+NIE.Cluster_ProgramUID+"&skipPaging=true"
        url: "../../trackedEntityInstances?ou="+NIE.ROOT_OU_UID+"&ouMode=DESCENDANTS&filter="+NIE.CLUSTER_TEA_CLUSTER_TAIL_DATE+":ge:"+moment(startDate).format(format)+"&filter="+NIE.CLUSTER_TEA_CLUSTER_START_DATE+":eq:"+moment(endDate).format(format)+"&program="+NIE.Cluster_ProgramUID+"&skipPaging=true"
        //All Cases
        //url: "../../trackedEntityInstances?ou="+NIE.ROOT_OU_UID+"&ouMode=DESCENDANTS&programEndDate="+moment(endDate).format(format)+"&program="+NIE.Cluster_ProgramUID+"&skipPaging=true"
    },function(error,response){
        if (error){
            def.resolve(null);
        }else{
            def.resolve(response.trackedEntityInstances);
        }
    })
    return def.promise();
}

function getOUNames(teis){

    var ouIds = teis.reduce((str,obj) =>{
        if (str == ""){
            str = obj.orgUnit;
        }else{
            str = str + "," + obj.orgUnit;
        }
        return str;
    },"");
    
    var def = $.Deferred();

    ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
        url: "../../organisationUnits?&fields=id,name&paging=false&filter=id:in:["+ouIds+"]"
        
    },function(error,response){
        if (error){
            def.resolve(null);
        }else{
            def.resolve(response.organisationUnits);
        }
    })
    return def.promise();

}
function extractCoordsFromTEI(teis,excludeInactive,ouIDToNameMap){

    var result = [];

    for (var i=0;i<teis.length;i++){       
        var type = "unknown";

        var coord = findValueAgainstId(teis[i].attributes,"attribute",NIE.TEA_COORDS,"value");

        var active = findValueAgainstId(teis[i].attributes,"attribute",NIE.TEA_IS_ACTIVE,"value");

        if (active =="false" && excludeInactive){
            continue
        }

        if (coord){

            coord = JSON.parse(coord);

            var clusterType =  findValueAgainstId(teis[i].attributes,"attribute",NIE.TEA_CLUSTER_TYPE,"value");
            var cases = findValueAgainstId(teis[i].attributes,"attribute",NIE.TEA_CLUSTER_CASES,"value");
            var afi3_5 = findValueAgainstId(teis[i].attributes,"attribute",NIE.AFI_TEA_3_5,"value");
            var afi5_7 = findValueAgainstId(teis[i].attributes,"attribute",NIE.AFI_TEA_5_7,"value");
            var lab = findValueAgainstId(teis[i].attributes,"attribute",NIE.TEA_LAB,"value");

            
            if (clusterType == "ADD"){
                type = "ADD2";
            }
            if (afi3_5){
                type = "AFI3"                    
            }
            if (afi5_7){
                type = "AFI5"
            }
            if (lab){
                type = "LAB"
            }
            if (clusterType == "MANUAL"){
                type="MANUAL";
            }
            if (active == "false"){
                type = "INACTIVE"
            }

            result.push({
                id : teis[i].trackedEntityInstance+clusterType , 
                coordinates : coord, 
                orgUnit : teis[i].orgUnit,
                orgUnitName : ouIDToNameMap[teis[i].orgUnit],
                type : type,
                trackedEntityInstance : teis[i].trackedEntityInstance,
                attributes : teis[i].attributes,
                cases : cases
                
            })   
            
        }
    }
    
    
    return result;
}
function findValueAgainstId(data,idKey,id,valKey){
    
    for (var i=0;i<data.length;i++){
        if (data[i][idKey]==id){
            return data[i][valKey]
        }
    }
    return null;
    
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
    
    var pointToLayer = function(feature, latlng) {
        if (feature.properties){
            var hoverText = feature.properties.orgUnitName +" : " +(feature.properties.cases.split(";").length-1)
            switch(feature.properties.type){
            case 'centroid' : 
                var centroidIcon =L.divIcon({
                    className:'alert-icon-centroid leaflet-clickable',
                    html:'<i class="alert-icon-centroid"><b>['+feature.properties.clusterSize+']</b></i>'
                });
                
                return L.marker(latlng,{
                    icon : centroidIcon,
                    title : hoverText

                });
            case 'LAB' :  
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_red_circle),
                    title : hoverText

                });
                
            case 'AFI3' :
                return L.marker(latlng,{
                    icon :  getCustomIcon2(imgpath_polygon_5_sided,[20,20],[15,0]),
                    title : hoverText

            });
            case 'AFI5' :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_star,[20,20],[0,0]),
                    title : hoverText

                });
            case 'ADD2' :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_yellow_triangle,[17,17],[0,15]),
                    title : hoverText

                });
            case 'MANUAL' :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_marker_icon_blue,[25,41],[5,15]),
                    title : hoverText

                });
            case 'INACTIVE' :
                return L.marker(latlng,{
                    icon : getCustomIcon2(imgpath_marker_icon_inactive,[25,41],[10,10]),
                    title : hoverText

                });
            }
        }
        
        return L.marker(latlng, {});        
    }
    
    var oms = new OverlappingMarkerSpiderfier(map.getMap(),{
        nearbyDistance : 1 , keepSpiderfied : true
    });
    
  /*  oms.addListener('click', function(marker) {
        var popup = new L.Popup({
            maxWidth : 600,
            autoPan : true,
            keepInView : true
        },AlertPopUp);

        popup.data = marker.feature.properties; 
        popup.setContent("<div class='linelist' id='hello'></div>");
        popup.setLatLng(marker.getLatLng());
        marker.bindPopup(popup);
        marker.openPopup();
    });
*/
    var data = featureCollection.geoJsonPointFeatures;
    for (let i=0;i<data.features.length;i++){
        var loc = new L.LatLng(data.features[i].geometry.coordinates[1], data.features[i].geometry.coordinates[0]);
        var marker = pointToLayer(data.features[i],loc);
       
        marker._leaflet_id = data.features[i].properties.trackedEntityInstance;
        marker.desc = data.features[i].properties.label;
        marker.feature = {properties : data.features[i].properties}

        var popup = new L.Popup({
            maxWidth : 600,
            autoPan : true,
            keepInView : true
        },AlertPopUp);
        
        popup.data = marker.feature.properties; 
        popup.setContent("<div class='linelist' id='hello'></div>");
        popup.setLatLng(marker.getLatLng());
        marker.bindPopup(popup);
        //marker.openPopup();
        map.getMap().addLayer(marker);
        oms.addMarker(marker); 
    }
}

function getClusterCases(cases,callback){

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

function addLegend(map){
    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {

	var div = L.DomUtil.create('div', 'info legend');
        var height = 15,width=15;
        var html = 	    '<img src="'+imgpath_red_circle+'"  height="'+height+'" width="'+width+'">  LAB<br>'+
	    '<img src="'+imgpath_polygon_5_sided+'"  height="'+height+'" width="'+width+'">  AFI 3 cases in 5 days<br>'+
            '<img src="'+imgpath_star+'"  height="'+height+'" width="'+width+'">  AFI 5 cases in 7 days<br>'+
            '<img src="'+imgpath_yellow_triangle+'"  height="'+height+'" width="'+width+'">  ADD 2 cases in 3 days<br>'+
	    '<img src="'+imgpath_marker_icon_blue+'"  height="'+height+'" width="'+width+'">  Area Cluster(Manual)<br>'+
	    '<img src="'+imgpath_marker_icon_inactive+'"  height="'+height+'" width="'+width+'">  Inactive Cluster<br>';
        
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
            str = utility.shadowStringify(str);
            layer.bindPopup('<div id="alert"><input type="button" onclick="saveCluster(\''+str+'\')" value="Save"/></div>');
            layer.on({
	        //  mouseover: highlightFeature,
	        //  mouseout: resetHighlight,
	        click: panToFeature
	    });
            return;   
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

function getCustomIcon2(iconUrl,iconSize,iconAnchor){

    if (!iconSize){
        iconSize = [15,15]
    }

    if (!iconAnchor){
        iconAnchor = [6,1]
    }
    
    return   new L.Icon({
        //  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        iconUrl:iconUrl,
        //  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        shadowUrl: 'images/point-shadow.png',
        iconSize:iconSize,
        //        iconSize: [25, 41],

        //        iconAnchor: [12, 41],
        iconAnchor:iconAnchor,

        popupAnchor: [1, 0],
        shadowSize: [16, 20]
    });

}

function getCustomDivIcon(background){

    return L.divIcon({
        className : 'alert-icon '+'',
        html:'<i class="alert-icon"  style="background: '+background+'"></i>'
    });
}
