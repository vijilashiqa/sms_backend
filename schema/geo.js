
const Joi = require('joi');


  const pinData={

          pincode:Joi.number().integer().required().label('headend name required')
    }
    
    const pincodeData = { id: Joi.number().integer().required().label('ID Required') }
     
    module.exports.pinDataSchema = Joi.object().keys(
       pinData
    ).options({ stripUnknown: true });
    
    module.exports.editpinDataSchema = Joi.object().keys({
        pinData, pincodeData
    }).options({ stripUnknown: true });

    // -------------------------------------------------------------country-------------------------------------------
    const countryData={

      // countryname:Joi.number().integer().required().label('countryrequired')
      countryname: Joi.string().required().label('country name required'),
}

const cntyData = { id: Joi.number().integer().required().label('ID Required') }
 
module.exports.countryDataSchema = Joi.object().keys(
   countryData
).options({ stripUnknown: true });

module.exports.editcountryDataSchema = Joi.object().keys({
    countryData, cntyData
}).options({ stripUnknown: true });


//------------------------------------------------------state------------------------------------------//
const stateData={

  state_name: Joi.string().required().label('state name required'),
}

const stData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.stateDataSchema = Joi.object().keys(
stateData
).options({ stripUnknown: true });

module.exports.editsateDataSchema = Joi.object().keys({
stateData, stData
}).options({ stripUnknown: true });
////////////////////////////////////////////////////////district/////////////////////////////////////////
const distData={

  district_name:Joi.string().required().label('district name required'),
}

const dtData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.distDataSchema = Joi.object().keys(
distData
).options({ stripUnknown: true });

module.exports.editdistDataSchema = Joi.object().keys({
distData, dtData
}).options({ stripUnknown: true });
///////////////////////////////////////////////////city//////////////////////////////////////////////////////////
const cityData={

  city_name:Joi.string().required().label('city name required')
}

const ctData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.cityDataSchema = Joi.object().keys(
cityData
).options({ stripUnknown: true });

module.exports.editcityDataSchema = Joi.object().keys({
cityData, ctData
}).options({ stripUnknown: true });
// +++++++++++++++++++++++++++++++++++++++++++++++++AREA+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const areaData={

  area_name:Joi.string().required().label('area name required')
}

const arData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.areaDataSchema = Joi.object().keys(
areaData
).options({ stripUnknown: true });

module.exports.editareaDataSchema = Joi.object().keys({
areaData, arData
}).options({ stripUnknown: true });