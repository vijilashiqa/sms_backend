const Joi = require('joi');
 

const stbmData={
    hdid:Joi.number().required().label('Headdend ID Required'),
    casid:Joi.number().required().label('Cas ID Required'),
    modelid:Joi.number().required().label('Model ID Required'),
    stockinwardid:Joi.number().required().label('invoice ID Required'),
    // boxno:Joi.number().required().label('box no  Required')
    
   
}

const stData={ id: Joi.number().integer().required().label('ID Required') }

module.exports.stbmDataSchema = Joi.object().keys(
      stbmData
).options({ stripUnknown: true });  

module.exports.editboxmodelDataSchema = Joi.object().keys({
    stbmData, stData
}).options({ stripUnknown: true });          