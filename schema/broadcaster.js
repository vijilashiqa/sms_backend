
const Joi = require('joi');

const broadcastData={
    hdid: Joi.number().required().label('headdend name  is required'),
    profileid:Joi.string().required().label('profileid Required'), 
    fullname : Joi.string().required().label('Name Required'),
    password :Joi.string().required().label('password is  Required'),
    mobile : Joi.number().required().label('Mobile Number required'),
    phoneno: Joi.number().required().label('phone Number required'),
    email1: Joi.string().trim(true).email({ minDomainAtoms: 2 }).required().label('Email Required'),
    email2: Joi.string().trim(true).email({ minDomainAtoms: 2 }).required().label('Email Required'),
    countryid: Joi.number().required().label('Country is required'),
    districtid: Joi.number().required().label('District is  required'),
    stateid:Joi.number().required().label('state is  required'),
    cityid: Joi.number().required().label('City is required'),
    // status:Joi.boolean().required().label("status"),

    cityid: Joi.number().required().label('City is required'),
    installation_addr:Joi.string().required().label('Address Required'),
    // status:Joi.boolean().required().label("status"),
    
    
}
const brdcastData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.broadcastDataSchema = Joi.object().keys(
    broadcastData
).options({ stripUnknown: true });

module.exports.editbrdcastDataSchema = Joi.object().keys({
    broadcastData, brdcastData
}).options({ stripUnknown: true });