
var ajaXwrapper = function(){

    var request = require('request');

    this.request = request;


/*    var $ = require('jquery');

    this.request = function(param,callback){
        param.success = success;
        param.error = error;
        $.ajax(param);

        function success(response){
            callback(null,response);
        }

        function error(response){
            callback(true,response);
        }
    }
*/
}

module.exports = new ajaXwrapper();
