
const Joi = require('joi');


const operatorData={
    hdid:Joi.number().required().label('Headdend ID Required'),
    profileid:Joi.string().required().label('Username Required'),
    password:Joi.number().required().label('password Required'),
    fullname:Joi.string().required().label('First Name Required'),
    dob:Joi.date().required(),
    gender:Joi.number().required().label('gender Required'),
    mobile: Joi.number().min(10).required().label('Mobile Number required'),
    country: Joi.number().integer().required().label('country required'),
    state: Joi.number().integer().required().label('State required'),
    district: Joi.number().integer().required().label('District  required'),
    city: Joi.number().integer().required().label('City  required'),
    area: Joi.number().integer().required().label('Area required'),
    pincode: Joi.number().integer().required().label('Pincode required'),  
    installation_addr: Joi.string().required().label('Address Required'),
    billing_addr: Joi.string().required().label('Address Required'),
    email: Joi.string().trim(true).email({ minDomainAtoms: 2 }).required().label('Email Required'),  
    prooftype:Joi.number().required().label('prooftype  Required'),
    proofno:Joi.string().required().label('Proof no  Required'),
    usertype: Joi.number().integer().required().label('operator Type  required'),
    business_name:Joi.string().required().label('business Name Required'),
    gstno: Joi.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).required().label("Invalid GST Number"),
}

const optData={ id: Joi.number().integer().required().label('ID Required') }

module.exports.operatorDatachema = Joi.object().keys(
    operatorData
).options({ stripUnknown: true });  

module.exports.editoperatorDataSchema = Joi.object().keys({
    operatorData, optData
}).options({ stripUnknown: true });       