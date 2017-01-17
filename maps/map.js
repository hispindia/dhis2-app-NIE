
import L from 'leaflet';

 function dhis2Map(){

    var map;
    const osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: "Map: <a href='http://www.openstreetmap.org/'>&copy; OpenStreetMap </a>contributers" });
    const  esri = L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}.png', {attribution: "Map: <a href='http://www.arcgis.com/home/item.html?id=c4ec722a1cd34cf0a23904aadf8923a0'>ArcGIS - World Physical Map</a>" });
    const stamen = L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {attribution: "Map: <a href='http://maps.stamen.com/#toner/12/37.7706/-122.3782'>Stamen Design</a>" })
   
 var baseLayers = {"stamen": stamen, "osm":osm, "esri":esri};

this.init = function(mapContainerId,center,zoom){
   map = L.map(mapContainerId, {
        center :center,
        zoom: zoom
    });baseLayers.osm.addTo(map);
}


}

module.exports = dhis2Map;
