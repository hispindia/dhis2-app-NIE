/**
 * Created by harsh on 7/5/16.
 */

var _ = require('underscore');

_.prepareIdToObjectMap = function(object,id){
    var map = [];
    for (var i=0;i<object.length;i++){
        map[object[i][id]] = object[i];
    }
    return map;
}

_.prepareMapGroupedById= function(object,id){
    var map = [];
    for (var i=0;i<object.length;i++){
        if (!map[object[i][id]]){
            map[object[i][id]] = [];
        }
        map[object[i][id]].push(object[i]);
    }
    return map;
}

_.prepareUID = function(options,ids){
    
    var sha1 = require('js-sha1');
    var uid = sha1(ids.sort());

    return "CL"+uid.substr(0,9);
}

//http://stackoverflow.com/questions/9804777/how-to-test-if-a-string-is-json-or-not
//http://stackoverflow.com/users/3119662/kubosho
_.isJson = function(item) {
    item = typeof item !== "string"
        ? JSON.stringify(item)
        : item;

    try {
        item = JSON.parse(item);
    } catch (e) {
        return false;
    }

    if (typeof item === "object" && item !== null) {
        return true;
    }

    return false;
}

_.shadowStringify= function (json){
    var str = json;
    str = JSON.stringify(str);
    str = str.replace(/\"/g,'^');
    str = str.replace(/{/g,'<');
    str = str.replace(/}/g,'>');
    return str;
}

_.unshadowStringify = function(str){
    str = str.replace(/\^/g,'"');
    str = str.replace(/</g,'{');
    str = str.replace(/>/g,'}');

    return JSON.parse(str);
}

_.findValueAgainstId = function(data,idKey,id,valKey){
    
    for (var i=0;i<data.length;i++){
        if (data[i][idKey]==id){
            return data[i][valKey]
        }
    }
    return null;
    
}


_.popupOrdering = function(cells,order){

    var result = [];
    var cellsMap = [];
    result.push(cells[0]);
    result.push(cells[1]);

    for (var key=0;key<order.length;key++){
	for (var i=2;i<cells.length;i++){
	    if (cells[i].key.split("-")[1] == order[key]){
		result.push(cells[i]);
		cellsMap[cells[i].key] = true;
	    }
	}
    }

    for (var i=2;i<cells.length;i++){
	if (!cellsMap[cells[i].key]){
	    result.push(cells[i]);
	}
    }
    
    return result;
}

module.exports = _;
