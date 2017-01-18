

/***
Param : {unique_id : "",
         coordinates : []    
         }

return : GeoJson
***/
import graphlib from "graphlib"
import utility from '../utility-functions';

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

_.clusterize = function(data,clusterDist){

    var graph = createGraph(data,clusterDist);
    
    var allNodesMap = utility.prepareIdToObjectMap(data,"unique_id");
    var serializedGraph = graphlib.json.write(graph);
    var nodes = serializedGraph.nodes;
    var edges = serializedGraph.edges;
    
    var featureCollection = getFeatureCollection(graph,allNodesMap);
    
    return featureCollection;

}

function  getFeatureCollection(graph,allNodesMap){

    var geoJsonPointFeatures = {
        type:"FeatureCollection",
        features : []
    }

  var geoJsonPolygonFeatures = {
        type:"FeatureCollection",
        features : []
    }

    var components = graphlib.alg.components(graph);

    components.map(function(comp){

        if (comp.length == 1){ //is lonely point
        
            var coord =  allNodesMap[comp[0]].coordinates;
            geoJsonPointFeatures.
                features.push({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [coord.latitude,coord.longitude]
                    }
                })
        }else{ // is pollyygonn
            var pCoords = []
                pCoords[0]=[];
                pCoords[0][0]=[];
            for (var key in comp){
                var coord =  allNodesMap[comp[key]].coordinates;
                pCoords[0][0].push([coord.latitude,coord.longitude])
            }
            
            geoJsonPolygonFeatures.
                features.push({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": pCoords
                    }
                })
        }  
    })

return {
        geoJsonPointFeatures: geoJsonPointFeatures,
        geoJsonPolygonFeatures: geoJsonPolygonFeatures }

}

function createGraph(data,clusterDist){

 var graph = new graphlib.Graph({ directed: false, compound: true, multigraph: false });
  
    for (var i=0;i<data.length;i++){
        for (var j=i+1;j<data.length;j++){
            
            var coord1 = data[i].coordinates;
            var coord2 = data[j].coordinates;
            var id1 = data[i].unique_id;
            var id2 = data[j].unique_id;

            var dist = distance(coord1.latitude,coord1.longitude,
                                coord2.latitude,coord2.longitude,'K');
                           
            graph.setNode(id1);
            graph.setNode(id2);

            if (dist < clusterDist){
            // Points near each other; 
                graph.setEdge(id1,id2,strToInt(id1)+strToInt(id2));
            }
        }
    }

return graph;
}

function strToInt(str){
    var intVal=0;

    Array.from(str).map(function(char){
        intVal+=char.charCodeAt(0);
    })

    return intVal;
}
module.exports = _;

function buildCoordinates(data,coord){

    
}