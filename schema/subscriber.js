const Joi = require('joi');
const { max } = require('joi/lib/types/array');
const subscriberData={
    hdid:Joi.number().required().label('Headdend ID Required'),
    // userid:Joi.number().required().label('Operator Type Required'),
    // profileid:Joi.string().required().label('Username Required'),
    // cafno:Joi.number().required().label('Caf Number Required'),
    fullname:Joi.string().required().label('First Name Required'),
    dob:Joi.date().required(),
    password :Joi.string().required().label('password is  Required'),
    stb_no:Joi.number().required().label('STB Number Required'),
    // mobile: Joi.number().integer().min(10).max(10).required().label('Mobile Number required'),
    // postpaidtime: Joi.string().regex(/^([0-9]{2})\:([0-9]{2})(:[0-5][0-9])?$/).required().label('postPaid Time Required'),
   mobile: Joi.string().regex(/^([0-9]{10})$/).required().label('Mobile Number required'),
    country: Joi.number().integer().required().label('country required'),
    state: Joi.number().integer().required().label('State required'),
    district: Joi.number().integer().required().label('District  required'),
    city: Joi.number().integer().required().label('City  required'),
    area: Joi.number().integer().required().label('Area required'),
    pin_no: Joi.number().integer().required().label('Pincode required'),  
    installation_addr: Joi.string().required().label('Address Required'),
    billing_addr: Joi.string().required().label('Address Required'),
    email: Joi.string().trim(true).email({ minDomainAtoms: 2 }).required().label('Email Required'),  
   
   
}

const subData={ id: Joi.number().integer().required().label('ID Required') }

module.exports.subscriberDatachema = Joi.object().keys(
    subscriberData
).options({ stripUnknown: true });  

module.exports.editsubscriberDataSchema = Joi.object().keys({
    subscriberData, subData
}).options({ stripUnknown: true });    