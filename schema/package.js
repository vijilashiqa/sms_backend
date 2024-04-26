const Joi = require('joi');

const packageData = {
    hdid: Joi.number().required().label('headdend name  is required'),
    // bcid: Joi.number().required().label('broadcaster name  is required'),
    // broadcaster_share:  Joi.number().required().label('broadcaster share is required'),
    // bcamt:  Joi.number().required().label('broadcaster amount is required'),
    packname: Joi.string().required().label(' Pack name Required'),

}
const packData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.packageDataSchema = Joi.object().keys(
    packageData
).options({ stripUnknown: true });  

module.exports.editpackageDataSchema = Joi.object().keys({
   packageData,packData
}).options({ stripUnknown: true });