

/***
Param : {unique_id : "",
         coordinates : []    
         }

return : GeoJson
***/
import Graph from "graph-data-structure"
import utility from 'utility-functions';

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
    var nodes = graph.nodes;
    var edges = graph.links;
    
    var polygonLayer = createPolygonLayer(edges,allNodesMap);
    
}

function  createPolygonLayer(edges,allNodesMap){

  //  for (var )


}

function createGraph(data,clusterDist){

 var graph = new Graph();
  
    for (var i=0;i<data.length;i++){
        for (var j=i+1;j<data.length;j++){
            
            var coord1 = data[i].coordinates;
            var coord2 = data[j].coordinates;
            var id1 = data[i].unique_id;
            var id2 = data[j].unique_id;

            var dist = distance(coord1.latitude,coord1.longitude,
                                coord2.latitude,coord2.longitude,'K');
                           
            graph.addNode(id1);
            graph.addNode(id2);

            if (dist < clusterDist){
            // Points near each other; 
                graph.addEdge(id1,id2);
            }
        }
    }

return graph; 

}
module.exports = _;

