const Joi = require('joi');
const { max } = require('joi/lib/types/array');

/*
const gstValid = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$";

const options = {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true // remove unknown props
};
*/


// HEADEND VALIDTAION
const headEndData = {
    hdname: Joi.string().max(20).trim(true).required().label('Headend name required'),
    headendid: Joi.string().required().label('Headend ID Required'),
    mobileno: Joi.number().min(10).required().label('Mobile Number required'),
    email: Joi.string().trim(true).email({ minDomainAtoms: 2 }).required().label('Email Required'),  
    countryid: Joi.number().integer().required().label('Country ID required'),
     stateid: Joi.number().integer().required().label('State ID required'),
    districtid: Joi.number().integer().required().label('District ID required'),
    cityid: Joi.number().integer().required().label('City ID required'),
    areaid: Joi.number().integer().required().label('Area ID required'),
    pincode: Joi.number().integer().required().label('Pincode required'),  
   crop_addr: Joi.string().required().label('Address Required'),
    comm_addr: Joi.string().required().label('Address Required'),   
    postpaiddate: Joi.number().integer().min(1).max(31).required().label('Postpaid Date Value Required'),
    postpaidtime: Joi.string().regex(/^([0-9]{2})\:([0-9]{2})(:[0-5][0-9])?$/).required().label('postPaid Time Required'),
    descr: Joi.string().optional().allow('', null),    
    sgst: Joi.number().integer().required().label('SGST Required'),
    cgst: Joi.number().integer().required().label('CGST Required'),
    gst: Joi.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).required().label("Invalid GST Number"),
    igst: Joi.number().integer().required().label('IGST Required'),
   
  
}
const hdData = { id: Joi.number().integer().required().label('ID Required') }

module.exports.headEndSchema = Joi.object().keys(
    headEndData
).options({ stripUnknown: true });

module.exports.editheadEndSchema = Joi.object().keys({
    headEndData, hdData
}).options({ stripUnknown: true });

// HEADEND CAS VALIDATION  

const hdCasData = {
    hdid: Joi.number().integer().required().label('Headend ID Required'),
    casid: Joi.number().integer().required().label('Cas ID Required'),
    caslid: Joi.string().trim(true).required().label('Cas Location Required'),
    ip: Joi.string().regex(/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/).required().label('IP Required or Invalid IP'),
    port: Joi.number().integer().required().label('Port Required'),
    smsidate: Joi.date().required(),
    casidate: Joi.date().required()
}

const hdCasId = { hdcasid: Joi.number().integer().required().label('Headend CAS ID Required') }

module.exports.addHdCasSchema = Joi.object().keys(
    hdCasData
).options({ stripUnknown: true });

module.exports.editHdCasSchema = Joi.object().keys(
    hdCasData, hdCasId
).options({ stripUnknown: true });



const casData = {
   
    casname:Joi.string().required().label('cas name required')
}
const cassData = { casid: Joi.number().integer().required().label('Headend CAS ID Required') }

module.exports.addcaSchema = Joi.object().keys(
    casData
).options({ stripUnknown: true });

module.exports.editcaSchema = Joi.object().keys(
    casData,cassData
).options({ stripUnknown: true });
    



//channelsrv
