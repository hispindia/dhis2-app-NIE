
/*
function initWMS(){
  ajax.request({
        type: "GET",
        async: true,
        contentType: "application/json",
      "Upgrade-Insecure-Requests":1,
        url: "http://nieicmr:icmr0217@gisnic.tn.nic.in:8080/geoserver/tnssdi/wms?version%3D1.1.0&service=WMS&request=GetMap&layers=tnssdi_admin%3Atnssdi_admin&styles=&format=image%2Fjpeg&transparent=false&version=1.1.1&height=256&width=256&srs=EPSG%3A3857&bbox=8942520.81313934,1487158.8223163905,8962088.692380346,1506726.7015573943"
    },function(error,response){
        if (error){
            console.log("Fetch DE")
        }else{
            deNameToIdMap = utility.prepareIdToValueMap(response.dataElements,"name","id");
        }
    })

};initWMS();


window.open(
  'http://nieicmr:icmr0217@gisnic.tn.nic.in:8080/geoserver/tnssdi/wms?version%3D1.1.0&service=WMS&request=GetMap&layers=tnssdi_admin%3Atnssdi_admin&styles=&format=image%2Fjpeg&transparent=false&version=1.1.1&height=256&width=256&srs=EPSG%3A3857&bbox=8942520.81313934,1487158.8223163905,8962088.692380346,1506726.7015573943',
  '_blank' // <- This is what makes it open in a new window.
);
*/
function dhis2Map(){

    var map;
    const osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: "Map: <a href='http://www.openstreetmap.org/'>&copy; OpenStreetMap </a>contributers" });
    const  esri = L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}.png', {attribution: "Map: <a href='http://www.arcgis.com/home/item.html?id=c4ec722a1cd34cf0a23904aadf8923a0'>ArcGIS - World Physical Map</a>" });
    const stamen = L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {attribution: "Map: <a href='http://maps.stamen.com/#toner/12/37.7706/-122.3782'>Stamen Design</a>" })
    
    const  esri2 = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: US National Park Service',
	maxZoom: 8
    });

    const osm_bw = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    var wmsLayer = L.tileLayer.wms('http://gisnic.tn.nic.in:8080/geoserver/tnssdi/wms?version%3D1.1.0', {
        layers: 'tnssdi_admin:tnssdi_admin'
    });
    

    var wmsLayer2 = L.tileLayer.wms('http://cartodb-basemaps-b.global.ssl.fastly.net/light_all?', {
        layers: 'ne:ne'
    });

    var baseLayers = {"stamen": stamen, "osm":osm, "esri":esri ,"osm_bw":osm_bw , nie:wmsLayer};  
   
    this.init = function(mapContainerId,center,zoom){
        map = L.map(mapContainerId, {
            center :center,
            zoom: zoom
        });

        L.easyPrint().addTo(map);

        //baseLayers.osm_bw.addTo(map);
        //baseLayers.osm.addTo(map);
        baseLayers.nie.addTo(map);

        // var little = L.marker([13.23521,80.3332]).bindPopup('teshgghgft').addTo(map);
        
    };


    this.clearLayers = function(){
        map.eachLayer(function (layer) {
            if (layer.feature){
                if (layer.feature.properties.key){
                    return
                    
                }map.removeLayer(layer);
            }
        });
    }
    this.addGeoJson = function(geoJson,pointToLayer,style,onEachFeature){

        var mapArgs ={
            /*     onEachFeature: function (feature, layer)
             {
             if (feature.properties.type == 'centroid'){                
             layer.bindPopup('<div id="alert"><i>Cluster Found</i><br><input type="button" value="Please confirm" onclick="alertConfirmed()"></div>');
             

             }else{
             layer.bindPopup('<div id="alert"><i>Fever Case[<b> '+feature.properties.label+'</b>]<br></div>');

             }

             layer.on('click', function(e) {
             // alert("SMS alerts to go here!");
             
             // Do whatever you want here, when the polygon is clicked.
             });
             }*/
        };
        if (style){
            mapArgs.style = style;
        }
        if (onEachFeature){
            mapArgs.onEachFeature = onEachFeature;
        }
        if (pointToLayer){
            mapArgs.pointToLayer = pointToLayer;
        }
        

        return  new  L.GeoJSON(geoJson,mapArgs).addTo(map); 
    };


    this.addToMap = function(obj){
        obj.addTo(map);
    };

    this.getMap = function(){
        return map;
    }
}

module.exports = dhis2Map;
