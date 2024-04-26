const Joi = require('joi');
//channel 
 const chanData={
    hdid:  Joi.number().integer().required().label('headend name required'),
    bcid: Joi.number().integer().required().label('broadcaster name required'),
    channame:Joi.string().required().label('channel name required'),
    chanlcm:  Joi.number().integer().required().label('lcm number required'),
    chanmode:Joi.string().required().label('channelmode name required'),
    langid:  Joi.number().integer().required().label('langugae required'),
    genreid: Joi.number().integer().required().label('genre required'),
    chantype:Joi.string().required().label('channel type required'),
   price:  Joi.number().integer().min(0).required().label('Price required'),
    // status:  Joi.boolean().required().label("status"),
   
   
   
 }
 const channelData = { id: Joi.number().integer().required().label('ID Required') }
 
module.exports.chanDataSchema = Joi.object().keys(
    chanData
).options({ stripUnknown: true });

module.exports.editchanDataSchema = Joi.object().keys({
    chanData, channelData
}).options({ stripUnknown: true });

// channel srv
const chansrvData={

hdid:Joi.number().integer().required().label('headend name required'),
casid:Joi.number().integer().required().label('castype required'),
channelid:Joi.number().integer().required().label('channel name required'),
casserviceid:Joi.number().integer().required().label(' service id  required'),


}

const channelsrvData = { id: Joi.number().integer().required().label('ID Required') }
 
module.exports.chansrvDataSchema = Joi.object().keys(
    chansrvData
).options({ stripUnknown: true });

module.exports.editchansrvDataSchema = Joi.object().keys({
    chansrvData, channelsrvData
}).options({ stripUnknown: true });
//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&GENRE&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&//
const chngenreData={

    hdid:Joi.number().integer().required().label('headend name required'),
    langid:  Joi.number().integer().required().label('langugae required'),
    genrename:Joi.string().required().label('genre name required')

    }
    
    const genreData = { id: Joi.number().integer().required().label('ID Required') }
     
    module.exports.chngenreDataSchema = Joi.object().keys(
        chngenreData
    ).options({ stripUnknown: true });
    
    module.exports.editchngenreDataSchema = Joi.object().keys({
        chngenreData, genreData
    }).options({ stripUnknown: true });
    //------------------------------------------------LANGUGe----------------------------------------------------------------------//
    const langData={

        hdid:Joi.number().integer().required().label('headend name required'),
        langname:  Joi.string().required().label('langugae required'),
       
    
        }
        
        const languageData = { langid: Joi.number().integer().required().label('ID Required') }
         
        module.exports.langDataSchema = Joi.object().keys(
           langData
        ).options({ stripUnknown: true });
        
        module.exports.editlangDataSchema = Joi.object().keys({
            langData, languageData
        }).options({ stripUnknown: true });