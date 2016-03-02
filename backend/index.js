'use strict';
module.exports = function(server, databaseObj, helper, packageObj) {
    var recipeAnalytics = require('./addRecipeAnalytics');
    //var addSecurity  = require('./addSecurity');
    var async = require('async');
    var _ = require("lodash");
    var orderManagement = require("./orderManagement");
    /**
     * Here server is the main app object
     * databaseObj is the mapped database from the package.json file
     * helper object contains all the helpers methods.
     * packegeObj contains the packageObj file of your plugin.
     */

    /**
     * Initialize the plugin at time of server start.
     * init method should never have any argument
     * It is a constructor and is populated once the server starts.
     * @return {[type]} [description]
     */
    var init = function() {
        //Initialize the analytics..
        recipeAnalytics.init(server, databaseObj, helper, packageObj);
        orderManagement.init(server, databaseObj, helper, packageObj);

        var data = server.models();
        for(var key in data){
            if(data.hasOwnProperty(key)){
                console.log(data[key].modelName);
            }
        }
    };





    //init();

    //return all the methods that you wish to provide user to extend this plugin.
    return {
        init: init
    }
}; //module.exports
