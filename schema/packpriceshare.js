const Joi = require('joi');

const packageshareData = {
    hdid: Joi.number().required().label('headdend name  is required'),
    // rese: Joi.number().required().label('broadcaster name  is required'),
    // broadcaster_share:  Joi.number().required().label('broadcaster share is required'),
    // bcamt:  Joi.number().required().label('broadcaster amount is required'),
    // packid: Joi.number().required().label(' Pack ID Required'),

}
const packshareData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.packageshareDataSchema = Joi.object().keys(
    packageshareData
).options({ stripUnknown: true });  

module.exports.editpackageshareDataSchema = Joi.object().keys({
    packshareData,packageshareData
}).options({ stripUnknown: true });