const Joi = require('joi');

 
 const accData={
    hdid:  Joi.number().integer().required().label('Headend Name Required'),
    role: Joi.number().integer().required().label('Operator Type Required'),
    userid:Joi.number().integer().required().label('Operator Name Required'),
    paymode:  Joi.number().integer().required().label('Payment Mode Required'),
    // deposit_type:Joi.string().required().label('Deposit Type  Required'),
    deposit_amount:  Joi.number().integer().required().label('Deposite Amount Required'),
   
   
   
   
 }
 const accountData = { id: Joi.number().integer().required().label('ID Required') }
 
module.exports.accDataSchema = Joi.object().keys(
    accData
).options({ stripUnknown: true });

module.exports.editaccDataSchema = Joi.object().keys({
    accData, accountData
}).options({ stripUnknown: true });