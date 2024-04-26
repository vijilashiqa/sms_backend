"use strict";
var express = require('express'),
	compress = require('compression'),
	operations = express.Router(),
	pool = require('../connection/conn'),
	poolPromise = require('../connection/conn').poolp;





    async function packrenewal(req) {
        console.log('Pack Renewal Data:', req.jwt_data);
        return new Promise(async (resolve, reject) => {
            var erroraray = [], data = req.body, jwtdata = req.jwt_data;
            let conn = await poolPromise.getConnection();
            if (conn) {
                await conn.beginTransaction();
                console.log('package :',data.package);
                let packid =(data.package).toString()
                let basepack = await conn.query(`SELECT packid FROM package WHERE (packtype=0 OR packtype=3) AND FIND_IN_SET(packid,('${packid}'))`);
                if (basepack[0].length > 0) {
                    let index = data.package.indexOf(x => x.package == basepack[0][0].packid);
                    data.package.splice(0, 0, data.package.splice(index, 1)[0]);
                }
                packid =(data.package)
                console.log("After Sort", packid);

                // try {
                //     let hdid = '';
                //     if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
                //     if (jwtdata.role <= 777) hdid = jwtdata.hdid;
                //     if (hdid == '' || hdid == null) {
                //         erroraray.push({ msg: "Please Select Headend.", err_code: 78 });
                //         await conn.rollback();
                //     }
                //     // console.log('Data', data);
                //    let checkprofile="SELECT COUNT(*) cnt FROM smsv2.`users` WHERE  hdid="+hdid+" and (fullname=RTRIM(LTRIM('"+data.fullname+"')) or profileid=RTRIM(LTRIM('"+data.profileid+"'))) "
                //    console.log('checkprofile Query :',checkprofile); 
                //    checkprofile = await conn.query(checkprofile);
                //     console.log('check',checkprofile[0][0]['cnt']);
                //     if (checkprofile[0][0]['cnt'] == 0) {
                //         let status = data.status == true ? 1 : 0;
                //         data.installation_addr = data.installation_addr.replace("'", ' ');
                //         let addhd = `INSERT INTO smsv2.users SET profileid='${data.profileid}',usertype=770, password=md5('${data.password}'),fullname='${data.fullname}', mobile =${data.mobile},phoneno=${data.phoneno}
                //                 ,email1='${data.email1}', email2='${data.email2}',district=${data.districtid},city=${data.cityid},area=${data.area},pincode=${data.pincode},installation_addr='${data.installation_addr}',country=${data.countryid}
                //                 ,cby=${jwtdata.id},hdid=${data.hdid},state=${data.stateid}`;
    
                //         if (data.descr != '' && data.descr != null) addhd += ",`descs`='" + data.descr + "' ";
    
                //         console.log('ADD Broadcast Query: ', addhd);
                //         addhd = await conn.query(addhd);
                //         if (addhd[0]['affectedRows'] > 0) {
                //             let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD BROADCASTER',`longtext`='DONE BY',hdid="+hdid+",usertype=770,cby=" + jwtdata.id;
                //             sqllog = await conn.query(sqllog);
                //             if (sqllog[0]['affectedRows'] > 0) {
                //                 erroraray.push({ msg: " Broadcaster Created Succesfully", err_code: 0 });
                //                 await conn.commit();
                //             }
                //         } else {
                //             erroraray.push({ msg: "Contact Your Admin.", err_code: 49 });
                //             await conn.rollback();
                //         }
                //     } else {
                //         erroraray.push({ msg: " Broadcaster Already Exist.", err_code: 53 });
                //         await conn.rollback();
                //     }
                // } catch (e) {
                //     console.log('Error ', e);
                //     erroraray.push({ msg: 'Please try after sometimes', err_code: '58' })
                //     await conn.rollback();
                // }
                console.log('Success--1');
                console.log('connection Closed.');
                conn.release();
            } else {
                erroraray.push({ msg: 'Please try after sometimes', err_code: 65 })
                return;
            }
            console.log('success--2');
            return resolve(erroraray);
        });
    }
    
    
    operations.post('/packrenewal', async (req, res) => {
        req.setTimeout(864000000);
      
        let result = await packrenewal(req);
        console.log("Process Completed", result);
        res.end(JSON.stringify(result));
    });



    module.exports=operations;