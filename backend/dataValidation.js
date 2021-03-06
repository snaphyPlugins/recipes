(function(){
    'use strict';
})();

/*global require*/

//Expired status..
var EXPIRED = "expired";
//var moment = require("moment");
//Add chefs validation
var init = function(server, databaseObj, helper, packageObj) {
    checkChefRecipeLimit(server, databaseObj, helper, packageObj);
    recipeAfterSave(server, databaseObj, helper, packageObj);
};


//Before save update the total save of chefs recipes...also check if the total limit is not reached yet..
//Data validation for chef..
var checkChefRecipeLimit = function(server, databaseObj, helper, packageObj){
    var Recipe = databaseObj.Recipe;
    var Chef = databaseObj.Chef;

    Recipe.observe("before save", function(ctx, next){
        var instance = ctx.instance || ctx.data;

        //Check if chef can add recipe..
        checkChefLimit (Recipe, Chef, instance, server, next, function(){
            validate(instance, function(){
                //Just format the data and call the next middleware..
                formatData(instance);
                //call the next middleware..
                next();
            }, next);
        });

    });
};



var formatData = function(instance){
    if(instance.name){
        instance.name = capitalizeEachWord(instance.name);
    }

    if(instance.description){
        instance.description = capitalize(instance.description);
    }

    if(instance.recipeType){
        instance.recipeType = instance.recipeType.toLowerCase();
    }

    if(instance.status){
        instance.status = instance.status.toLowerCase();
    }


    if(instance.stepsDescription){
        if(instance.stepsDescription.length){
            instance.stepsDescription.forEach(function(steps, index){
                if(steps.name){
                    if(steps.name.length > 1){
                        instance.stepsDescription[index].name = capitalize(steps.name);
                    }
                }


            });
        }
    }


};


var validate = function(instance, callback, next){
  //TODO ADD VALIDATION IF NEEDED..
    callback();
};





//Given recipe will not add customer till its allowed recipe is increased..
var checkChefLimit = function(Recipe, Chef, instance, server, next, callback){
    if(instance.customerId){
        //Now first get the customerId..
        Chef.find({
            where:{
                customerId: instance.customerId
            }
        })
            .then(function(chefObj){
                if(chefObj){
                    if(chefObj.length){
                        chefObj = chefObj[0];
                        if(chefObj.status === EXPIRED){
                            next(getChefExpiredErrorObj("Error your chef plan has been expired. Please renew your plan before adding recipe."));
                        }else{
                            //Now everything is normal ..just call the callback and proceed to next...
                            callback();
                        }
                    }else{
                        next(getErrorObj("Error given customer is not an authorized chef. Only Chef can upload recipes."));
                    }
                }else{
                    next(getErrorObj("Error given customer is not an authorized chef. Only Chef can upload recipes."));
                }
            })
            .catch(function(err){
                console.error(err);
                next(err);
            });
    }else{
        //Pass if customerId is not present..
        callback();
    }
};



var recipeAfterSave = function(server, databaseObj, helper, packageObj){
    var Recipe = databaseObj.Recipe;
    var Chef = databaseObj.Chef;
    Recipe.observe("after save", function(ctx, next){
        var instance = ctx.instance;

        //Check if chef can add recipe..
        //if(ctx.isNewInstance){
            checkRecipesLimit(Recipe, Chef, instance, server, packageObj);
        //}

        //Call the next middleware..
        next();
    });
};




var checkRecipesLimit = function(Recipe, Chef, instance, server, packageObj){
    if(instance.customerId){
        //Now first get the customerId..
        Chef.find({
                include: "customer",
                where:{
                    customerId: instance.customerId
                }
            })
            .then(function(chefObj){
                if(chefObj){
                    if(chefObj.length){
                        chefObj = chefObj[0];
                        //Now count the recipes posted by the chef..
                        Recipe.count({
                                    customerId: instance.customerId
                        })
                            .then(function(number){
                                if(number >= chefObj.allowedRecipes){
                                    //Update the chef status to.. expired..
                                    chefObj.updateAttribute("status", EXPIRED, function(err, value){
                                        if(err){
                                            console.error(err);
                                        }
                                        //Now sending expiry mail to the chef..
                                        sendMail(server, packageObj, chefObj);
                                    });
                                }
                            })
                            .catch(function(err){
                                console.error(err);
                            });


                    }

                }
            })
            .catch(function(err){
                console.error(err);
            });
    }
};



//Send expiry mail..
var sendMail = function(server, packageObj, chef){
    var customer = chef.customer();
    if(customer.email){
        var title = "Expiry notice for " + packageObj.company.name + " chef";
        //Send expiry notice to all chefs who has expired..
        server.models.adminEmail.expiryNotice(customer.email, title,
            {
                'title': title,
                'company':packageObj.company
            }, function(err, send){
                if(err){

                    console.error(err);
                }else{
                    console.log("Successfully send expiry mail to ");
                    console.log(send);
                }

            });
    }
};





var getErrorObj = function(message) {
    message = message || "Data validation failed";
    // If not return 400 response which means unauthroized.
    var err = new Error(message);
    err.status = 400;
    return err;
};





var getChefExpiredErrorObj = function(message) {
    message = message || "Data chef data expired";
    // If not return 420 response which means unauthroized.
    var err = new Error(message);
    err.status = 420;
    return err;
};


var capitalize = function(text) {
    if (text) {
        if (text.length === 1) {
            return text.toUpperCase();
        } else {
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        }
    }
};


function capitalizeEachWord(str) {
    var words = str.split(" ");
    var arr = [];
    for (var i in words) {
        var temp = words[i].toLowerCase();
        temp = temp.charAt(0).toUpperCase() + temp.substring(1);
        arr.push(temp);
    }
    return arr.join(" ");
}


module.exports = {
    init: init
};