//-------------------------------------------------------- VENDOR---------------------------------------------------------------------//
const Joi = require('joi');

// const number = require('joi/lib/types/number');

const vendorData={
    hdid:Joi.number().required().label('Headdend ID Required'),
    vendor_name: Joi.string().required().label(' Vendor name Required')
}

const vendata={ id: Joi.number().integer().required().label('ID Required') }

    module.exports.vendorDataSchema = Joi.object().keys(
        vendorData
    ).options({ stripUnknown: true });  
    
    module.exports.editvendorDataSchema = Joi.object().keys({
        vendorData, vendata
    }).options({ stripUnknown: true });

    
    //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$//
 //---------------------------------------------------------- STB TYPE --------------------------------------------------------------//


const boxmodelData={
        hdid:Joi.number().required().label('Headdend ID Required'),
        boxtypename: Joi.string().required().label(' boxtype name Required'),
}

const boxData={ id: Joi.number().integer().required().label('ID Required') }

    module.exports.boxmodelDataSchema = Joi.object().keys(
        boxmodelData
    ).options({ stripUnknown: true });  
    
    module.exports.editboxmodelDataSchema = Joi.object().keys({
        boxmodelData, boxData
    }).options({ stripUnknown: true });                                            

 //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$//
 //-----------------------------------------------------------MODEL----------------------------------------------------------------------//
 
  const modelData={
    modelname:Joi.string().required().label('modelname required'),
    hdid:Joi.number().required().label('headed name Required'),
    hdcasid:Joi. number().required().label('Cas name reqired'),
    vendorid:Joi.number().required().label('vendor name Required'),
    stbtypeid:Joi.number().required().label('stb number Required')

  }
  const modData={ id: Joi.number().integer().required().label('ID Required') }

   module.exports.modelDataSchema = Joi.object().keys(
       modelData
   ).options({ stripUnknown: true });  
   
   module.exports.editmodelDataSchema = Joi.object().keys({
       modelData, modData
   }).options({ stripUnknown: true });

 //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$//
 //------------------------------------------------VENDOR DETAIL---------------------------//
 const vendordetData={
    hdid:Joi.number().required().label('headend id required'),
    contact_person:Joi.string().required().label('vendor name required'),
    vendorid:Joi.number().required().label('vendor name Required'),
    loc: Joi.string().required().label('Location name reqired'),
    mobile1:Joi.number().required().label('Mobile 1 Number required'),
    email:Joi.string().trim(true).email({ minDomainAtoms: 2 }).required().label('Email Required'),
    gst: Joi.string().required().label('GST reqired'),
    addr:Joi.string().required().label('address required'),
    cin:Joi.string().required().label('cin required'),
    gst_type:Joi.string().required().label('GST Type Required')
   
 }
 const vendetData={ id: Joi.number().integer().required().label('ID Required') }
  

  module.exports.vendordetDataSchema = Joi.object().keys(
      vendordetData
  ).options({ stripUnknown: true });  
  
  module.exports.editvendordetDataSchema = Joi.object().keys({
      vendordetData, vendetData
  }).options({ stripUnknown: true });
  //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$//
  //-----------------------------------------------HSN------------------------------------//
  const hsnData={

    hdid:Joi.number().required().label('headed name Required'),
    hsn_name:Joi.string().required().label(' hsn name required'),
    hsn_num:Joi.number().required().label('hsn number Required'),
    
 }
 const hData={ id: Joi.number().integer().required().label('ID Required') }

  module.exports.hsnDataSchema = Joi.object().keys(
      hsnData
  ).options({ stripUnknown: true });  
  
  module.exports.edithsnDataSchema = Joi.object().keys({
      hsnData, hData
  }).options({ stripUnknown: true });
// ****************************************************************************************//
//                                             STOCK                                       //

const material=Joi.object().keys({
    boxmodelid:Joi.number().required().label(' model Number Required'),
    qty:Joi.number().required().label('Quantity Required'),
    price:Joi.number().required().label('Price required')
})
const stockData={
                     hdid:Joi.number().required().label('headed name Required'),
                     vendorid:Joi.number().required().label('vendor name Required'),					
					vendordetid:Joi.number().required().label('Location  is  required'),
                    stocktype:Joi.number().required().label('stocktype  is  required'),
					warranty_type:Joi.number().required().label('Warranty is  required'),						
					hsnid:Joi.number().required().label('HSN  Required'),
                    warranty_period:Joi.number().required().label('Warrenty Period is  required') ,			
                    invoiceno:Joi.number().required().label('Invoice Number Required'),
                    warranty_period: Joi.date().required(),
                  stockinid:Joi.array().items(material)

                  
                
}
const stData={ id: Joi.number().integer().required().label('ID Required') }

module.exports.stockDataSchema = Joi.object().keys(
          stockData
).options({ stripUnknown: true });  

module.exports.editstockDataSchema = Joi.object().keys({
    stockData, stData
}).options({ stripUnknown: true });