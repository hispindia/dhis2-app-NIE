

/***
Param : {unique_id : "",
         coordinates : []    
         }

return : GeoJson
***/
import graphlib from "graphlib";
import utility from '../utility-functions';
import turf from '@turf/turf';

var _ = {};


function distance(lat1, lon1, lat2, lon2, unit) {

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                                                         :::
//:::  This routine calculates the distance between two points (given the     :::
//:::  latitude/longitude of those points). It is being used to calculate     :::
//:::  the distance between two locations using GeoDataSource (TM) prodducts  :::
//:::                                                                         :::
//:::  Definitions:                                                           :::
//:::    South latitudes are negative, east longitudes are positive           :::
//:::                                                                         :::
//:::  Passed to function:                                                    :::
//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                                  :::
//:::                                                                         :::
//:::  Worldwide cities and other features databases with latitude longitude  :::
//:::  are available at http://www.geodatasource.com                          :::
//:::                                                                         :::
//:::  For enquiries, please contact sales@geodatasource.com                  :::
//:::                                                                         :::
//:::  Official Web site: http://www.geodatasource.com                        :::
//:::                                                                         :::
//:::               GeoDataSource.com (C) All Rights Reserved 2015            :::
//:::                                                                         :::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	var radlat1 = Math.PI * lat1/180
	var radlat2 = Math.PI * lat2/180
	var theta = lon1-lon2
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist)
	dist = dist * 180/Math.PI
	dist = dist * 60 * 1.1515
	if (unit=="K") { dist = dist * 1.609344 }
	if (unit=="N") { dist = dist * 0.8684 }
	return dist
}

_.clusterize = function(data,clusterDist,threshold,labelMap){

    var graph = createGraph(data,clusterDist);
    
    var allNodesMap = utility.prepareIdToObjectMap(data,"id");
    var serializedGraph = graphlib.json.write(graph);
    var nodes = serializedGraph.nodes;
    var edges = serializedGraph.edges;
    
    var featureCollection = getFeatureCollection(graph,allNodesMap,threshold,clusterDist,labelMap);
    
    return featureCollection;

}

function  getFeatureCollection(graph,allNodesMap,threshold,clusterDist,labelMap){

    var geoJsonPointFeatures = {
        type:"FeatureCollection",
        features : []
    };

    var pointsMap = [];
    var geoJsonPolygonFeatures = {
        type:"FeatureCollection",
        features : []
    };

    var components = graphlib.alg.components(graph);

    components.map(function(comp){

        if (comp.length < threshold){ //is not hotspot; make as point 
            
            for (var key in comp){
                var point = getPointGeoJson(allNodesMap[comp[key]]);
                geoJsonPointFeatures.features.push(point);
                var type = allNodesMap[comp[key]].type;
            /*    if (type == "LAB"){
                     let mergedCircle= turf.circle(point, radius, steps, units);
                    mergedCircle.properties.type="cluster";
                    mergedCircle.properties.layerId = "custom";
                    mergedCircle.properties.num_points = 1;
                    mergedCircle.properties.area = turf.area(mergedCircle);
                    mergedCircle.properties.uid = utility.prepareUID(null,key);

                    let centroid = point;
                    centroid.properties.type = "centroid";
                    centroid.properties.layerId = "custom";
                    centroid.properties.clusterSize = 1;

                    geoJsonPolygonFeatures.features.push(mergedCircle);
                    geoJsonPolygonFeatures.features.push(centroid);
                }*/
            }         

        }else{ // is pollyygonn - make boundaries for this

            var points = {
                type:"FeatureCollection",
                features : []
            };
            var pointsKeys = [];
            var teis = [];

            var circles = [],
                radius = (clusterDist)/2,
                steps = 0, 
                units = 'kilometers';

            for (var key in comp){
                var point = getPointGeoJson(allNodesMap[comp[key]]);

                circles.push(turf.circle(point, radius, steps, units));
                points.features.push(point);
                geoJsonPointFeatures.features.push(point);
                pointsKeys.push(comp[key]);
                teis.push(allNodesMap[comp[key]].trackedEntityInstance);
            }
            
            if (points.features.length <3){return}
            var centroid = turf.centroid(points);
            centroid.properties.type = "centroid";
            centroid.properties.layerId = "custom";
            centroid.properties.clusterSize = points.features.length;
            centroid.properties.keys = pointsKeys;
            centroid.properties.teis = teis;

          //  var hull = turf.concave(points, 1000, 'kilometers');
            var mergedCircle = turf.union.apply(this,circles);
            mergedCircle.properties.type="cluster";
            mergedCircle.properties.layerId = "custom";
            mergedCircle.properties.num_points = points.features.length;
            mergedCircle.properties.area = turf.area(mergedCircle);
            mergedCircle.properties.uid = utility.prepareUID(null,pointsKeys);
            centroid.properties.uid = mergedCircle.properties.uid;


            var circle = turf.circle(centroid, radius, steps, units);
          // points.features = points.features.concat(hull);
           // points.features = points.features.concat(circle);
          //  points.features = points.features.concat(mergedCircle);      
           // points.features = points.features.concat(centroid);
            geoJsonPolygonFeatures.features.push(mergedCircle);
            geoJsonPolygonFeatures.features.push(centroid);
        }
      
        function getPointGeoJson(data){
          var coord =  data.coordinates;
                var point = {
                    "type": "Feature",
                    properties : {
                        id : key,
                        type : data.type,
                        label :data.orgUnit,
                        layerId :"custom" 

                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [coord.longitude,coord.latitude]
                    }
                };
            return point;
        }
    });

return {
        geoJsonPointFeatures: geoJsonPointFeatures,
        geoJsonPolygonFeatures: geoJsonPolygonFeatures };
}

function createGraph(data,clusterDist){

 var graph = new graphlib.Graph({ directed: false, compound: true, multigraph: false });
  
    for (var i=0;i<data.length;i++){
        for (var j=i+1;j<data.length;j++){
            
            var coord1 = data[i].coordinates;
            var coord2 = data[j].coordinates;
            var id1 = data[i].id;
            var id2 = data[j].id;

            var dist = distance(coord1.latitude,coord1.longitude,
                                coord2.latitude,coord2.longitude,'K');
                           
            graph.setNode(id1);
            graph.setNode(id2);

            if (dist < clusterDist || Number.isNaN(dist)){
            // Points near each other; 
                graph.setEdge(id1,id2,utility.prepareUID(null,[id1,id2]));
            }
        }
    }

return graph;
}

function strToInt(str){
    var intVal=0;

    Array.from(str).map(function(char){
        intVal+=char.charCodeAt(0);
    });

    return intVal;
}
module.exports = _;

function buildCoordinates(data,coord){

    
}