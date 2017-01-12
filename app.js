/**
 * Created by harsh on 15/12/16.
 */


import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';

import $ from 'jquery';

$('document').ready(function(){

    var mymap = L.map('mapid').setView([51.505, -0.09], 13);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        key: 'BC9A493B41014CAABB9dsfsdfds8F0471D759707'
    }).addTo(mymap);

    //ReactDOM.render(<UploadFile onClick={uploadFileHandler}/>, document.getElementById('container'));

});
