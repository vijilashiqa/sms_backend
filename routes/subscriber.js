"use strict";
var express = require('express'),
    compress = require('compression'),
    subscriber = express.Router(),
    pool = require('../connection/conn');
poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/subscriber');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        console.log('request file--', file)
        let namefile = file.originalname.split('-')[0], folder_status = false;
        console.log('file name ', file.originalname)
        const fs = require("fs")
        const filename = namefile
        const imagePath = `${__dirname}/../Documents/subscriber/${filename}`;
        fs.exists(imagePath, exists => {
            if (exists) {
                folder_status = true
                console.log(" Directory Already created.")
            } else {
                folder_status = true
                fs.mkdir(imagePath, { recursive: true }, function (err) {
                    if (err) {
                        console.log(err)
                    } else { console.log("New directory successfully created.") }
                })
            }
            if (folder_status) { callback(null, imagePath); }
        });
    },
    filename: function (req, file, callback) {
        console.log("Filename*****", file.originalname)
        let nowdate = new Date();
        let edate = ((nowdate).toISOString().replace(/T/, '-').replace(/\..+/, '')).slice(0, 16);
        console.log('edateeee', edate);
        // let uid = file.originalname.split('-')[0],filetype=file.originalname.split('-')[1]

        // console.log('uid : ',uid,'\n\r file type :',filetype);
        // let idtype =filetype=='CAF'?3:filetype=='IDproof'?2:filetype=='AddressProof'?1:10
        // callback(null, file_name + '-' + nowdate.toISOString().slice(0, 10) + '.' + file.mimetype.split('/')[1])
        // callback(null, filename + '-' + 'CAF'+'-'+nowdate.toISOString().slice(0, 10) + '.' + 'png')
        // callback(null,  + '-' + 'ID'+'-'+nowdate.toISOString().slice(0, 10) + '.' + 'png')
        callback(null, (file.originalname.split('-')[1]) + '-' + nowdate.toISOString().slice(0, 10) + '.' + 'png');
    }
})
const upload = multer({ storage: storage }).array('file', 4)
subscriber.post('/uploadfile', function (req, res) {
    var erroraray = [], data, sqlquery, file;
    upload(req, res, function (err) {
        // console.log('file',file)
        if (err) {
            console.log("Error uploading file.", err)
            erroraray.push({ msg: "Upload Failed", error_msg: 'FAIL' });
            res.end(JSON.stringify(erroraray));
        } else {
            data = req.body, file = req.files;
            console.log("Request.", req.body, file)
            console.log("Request Files .", file.length)

            // var checkfile = conn.query(`SELECT * FROM smsv2.user_document  WHERE userid=${data.id} AND proof_type=${proof_type} `);
            // if (checkfile[0].length == 0) {
            //    for (let i = 0; index < file.length; i++) {
            //     const element = array[index];

            //    }
            const proof = [
                {
                    id: 1,
                    name: 'AddressProof'
                },
                {
                    id: 2,
                    name: 'IDproof'
                },
                {
                    id: 3,
                    name: 'CAF'
                }
            ]
            let insertvalue = [];
            file.forEach(x => {
                let proofValue = proof.find(value => value.name == x.originalname.split('-')[1]).id;
                console.log('proooo', proofValue);

                let prooftype = proofValue == 1 ? data.addressproof : proofValue == 2 ? data.idproof : 0;
                insertvalue.push(['(' + data.id, "'" + x.filename + "'", proofValue, prooftype, 1 + ')'])
                console.log('daaaatta', insertvalue);
            })
            console.log('insertvalue Array', insertvalue);
            sqlquery = ` insert into smsv2.user_document (userid,filename,proof,proof_type,status) VALUES ${insertvalue} `
            console.log("Update Logo Query.", sqlquery)
            pool.getConnection(function (err, conn) {
                if (err) {
                    console.log("Failed")
                } else {
                    var sql = conn.query(sqlquery, function (err, result) {
                        conn.release();
                        if (!err) {
                            if (result.affectedRows > 0) {
                                erroraray.push({ msg: "Succesfully Added", error_msg: 0 });
                                console.log("File is uploaded.")
                                res.end(JSON.stringify(erroraray));
                            } else {
                                console.log("File Not uploaded.", err)
                                erroraray.push({ msg: "Upload Failed", error_msg: 'FAIL' });
                                res.end(JSON.stringify(erroraray));
                            }

                        } else {
                            console.log("File Not uploaded.", err)
                            erroraray.push({ msg: "Upload Failed", error_msg: 'FAIL' });
                            res.end(JSON.stringify(erroraray));
                        }

                    });

                }
            });
            // }


        }

    });

});

async function bulkaddsubscriber(req) {
    console.log('Edit User Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Add file', data.bulkdata.length);
            for (var i = 0; i < data.bulkdata.length; i++) {
                await conn.beginTransaction();
                try {
                    let bulkup = data.bulkdata[i];
                    console.log('data', bulkup);
                    console.log('User Data', data);
                    let addsubscriber = await conn.query(`SELECT * FROM smsv2.subscriber WHERE  hdid=${data.hdid} AND profileid='${bulkup.profileid}'  `);
                    if (addsubscriber[0].length == 0) {
                        let [checkbox] = await conn.query(`SELECT  *  FROM smsv2.box WHERE hdid=${data.hdid}  and boxno='${bulkup.stb_no}' and lcoid=${data.userid}`);
                        console.log('Box count query', checkbox);
                        if (checkbox.length > 1) {
                            erroraray.push({ msg: " Two Box  Available .", err_code: 254 });
                            await conn.rollback();
                            continue;
                        }
                        if(checkbox.length==0){
                            erroraray.push({ msg: "  Box  Not Found .", err_code: 254 });
                            await conn.rollback();
                            continue;
                        }
                        if(checkbox[0]['custid']!=null){
                            erroraray.push({ msg: " Subscriber Already Assigned .", err_code: 254 });
                            await conn.rollback();
                            continue;
                        }
                        if(checkbox[0]["lcoid"]!=data.userid){
                            erroraray.push({ msg: " Operator Already Assigned .", err_code: 254 });
                            await conn.rollback();
                            continue;
                        }
                        if(checkbox[0]["pairflg"]!=1){
                            erroraray.push({ msg: " Box Already Paird .", err_code: 254 });
                            await conn.rollback();
                            continue;
                        }

                        let status = data.status == true ? 1 : 0;
                        data.installation_addr = data.installation_addr.replace("'", ' ');
                        let addsubscriber = `INSERT INTO  smsv2.subscriber SET  
                    hdid=${data.hdid},
                    userid=${data.userid},
                    profileid='${bulkup.profileid}',
                    cafno=${bulkup.cafno},
                    fullname='${bulkup.fullname}',
                    password=md5('${bulkup.password}'),
                    mobile=${bulkup.mobile},
                    installation_addr='${bulkup.installation_addr}',
                    email='${bulkup.email}',
                    pin_no=${bulkup.pin_no},
                    enablestatus=${status},
                    cby=${jwtdata.id}`;
                        console.log('ADD operator Query: ', addsubscriber);
                        addsubscriber = await conn.query(addsubscriber);
                        if (addsubscriber[0]['affectedRows'] > 0) {
                            let addloc = " UPDATE smsv2.subscriber AS s, smsv2.users AS  u  SET  s.country = u.country,s.state=u.state,s.district=u.district WHERE u.id=s.userid"
                            let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE Subscriber',`longtext`='DONE BY',hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                            let addr = `UPDATE smsv2.subscriber  s ,geo.area a,geo.city c SET s.area=a.id,s.city=c.id WHERE userid=${data.userid} AND a.area_name='${bulkup.area}' AND c.city_name='${bulkup.city}'  `
                            addr = await conn.query(addr);
                            addloc = await conn.query(addloc);
                            sqllog = await conn.query(sqllog);
                            if (sqllog[0]['affectedRows'] > 0) {
                                erroraray.push({ msg: " Subscriber Uploaded Succesfully:" + data.fullname + " ", err_code: 0 });
                                await conn.commit();
                            }

                        }
                        if (bulkup.stb_no) {

                            let addbox = `update  smsv2.box SET  
                                                            custid=${addsubscriber[0].insertId},stbprimary=1 where boxno='${bulkup.stb_no}'
                                  `;
                            addbox = await conn.query(addbox);
                            if (addbox[0]['affectedRows'] > 0) {
                                let sqllog = `INSERT INTO smsv2.CustBoxAssignLog SET
                                                        hdid=${data.hdid},
                                                        userid=${data.userid},
                                                        custid=${addsubscriber[0].insertId},
                                                        boxid='${bulkup.stb_no}',				
                                                        cby=${jwtdata.id}`;
                                sqllog = await conn.query(sqllog);
                                if (sqllog[0]['affectedRows'] > 0) {
                                               
                                    let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD  CUSTOMER LOG',`longtext`='DONE BY',hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                                    sqllog = await conn.query(sqllog);
                                    if (sqllog[0]['affectedRows'] > 0) {
                                        erroraray.push({ msg: " CustBoxAssignLog Created Succesfully", err_code: 0 });
                                        await conn.commit();

                                    }
                                } else {
                                    erroraray.push({ msg: "Contact Your Admin.", err_code: 199 });
                                    await conn.rollback();
                                }

                            } else {
                                erroraray.push({ msg: "Please Check Box Number", err_code: 204 });
                                await conn.rollback();
                            }

                        }


                    } else {
                        erroraray.push({ msg: " User  Already Exists.", err_code: 212 });

                        await conn.rollback();
                    }
                }


                catch (e) {
                    console.log('Error ', e);
                    erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })

                    await conn.rollback();
                }
            }
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
            return;
        }

        console.log('Success--1');
        console.log('connection Closed.');
        conn.release();
        console.log('success--2');
        return resolve(erroraray);
    });
}
subscriber.post('/bulkaddsubscriber', async (req, res) => {
    req.setTimeout(864000000);

    // const validation = joiValidate.subscriberDatachema.validate(req.body);
    // if (validation.error) {
    //     console.log(validation.error.details);
    //     // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
    //     return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    // }
    let result = await bulkaddsubscriber(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});
subscriber.post('/listviewsubscriber', function (req, res, err) {
    var jwtdata = req.jwt_data, where = [], sql, data = req.body,
        sqlquery = ` SELECT s.cafno,s.custid,s.fullname,s.mobile,s.installation_addr,b.boxno,v.vcno,s.email,s.userid FROM smsv2.box b
    LEFT JOIN smsv2.boxvc v ON b.vcid=v.vcid
    LEFT JOIN smsv2.subscriber  s ON b.boxid=s.userid
     WHERE s.custid=${data.custid}  `,

        sqlqueryc = `SELECT COUNT(*)  count FROM smsv2.box b
        LEFT JOIN smsv2.boxvc v ON b.vcid=v.vcid
        LEFT JOIN smsv2.subscriber  s ON b.boxid=s.userid`, finalresult = []
    data = req.body;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  b.hdid= ${data.hdid}`);
    if (jwtdata.role <= 777) where.push(` b.hdid= ${jwtdata.hdid}`);
    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ');
        sqlquery += where;
    }

    console.log("data", data)
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, [data.index, data.limit], function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        if (!err) {
                            finalresult.push(result[0]);
                            res.end(JSON.stringify(finalresult));
                        } else {
                            console.log('err');
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});
async function editsubscriber(req) {
    console.log('Edit User Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog = '';
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let hdid = '';
                if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
                if (jwtdata.role <= 777) hdid = jwtdata.hdid;
                if (hdid == '' || hdid == null) {
                    erroraray.push({ msg: "Please Select Headend.", err_code: 49 });
                    await conn.rollback();
                }
                console.log('User Data', data);
                let checksubcribe = await conn.query(`SELECT * FROM smsv2.subscriber WHERE    custid= ${data.custid} `);
                if (checksubcribe[0].length == 1) {
                    let csub = checksubcribe[0][0];
                    let status = data.status == true ? 1 : 0;
                    data.installation_addr = data.installation_addr.replace("'", ' ');
                    data.billing_addr = data.billing_addr.replace("'", ' ');
                    let same_addr = data.same_addr == true ? 1 : 0;
                    let addsubscriber = `UPDATE  smsv2.subscriber SET  
                    userid=${data.userid},
                    cafno=${data.cafno},
                    fullname='${data.fullname}',
                    dob='${data.dob}',
                    password=md5('${data.password}'),
                    mobile=${data.mobile},
                    pin_no=${data.pin_no},
                    country=${data.country},
                    state=${data.state},
                    district=${data.district},
                    city=${data.city},
                    area=${data.area},
                    installation_addr='${data.installation_addr}',
                    billing_addr='${data.billing_addr}',
                    same_addr=${same_addr},
                    email='${data.email}', 
                    enablestatus=${status},
                    cby=${jwtdata.id}`;
                    if (data.desc != '' && data.desc != null) addsubscriber += `,desc='${data.desc}'`;
                    if (data.phone != '' && data.phone != null) addsubscriber += `,phone='${data.phone}'`;
                    if (csub.hdid != hdid) {
                        let [checkprofile] = await conn.query(`SELECT * FROM smsv2.subscriber WHERE  hdid=${hdid} AND profileid='${data.profileid}'`);
                        console.log('checkprofile : ', checkprofile);
                        if (checkprofile.length == 1) {
                            erroraray.push({ msg: " Headend Already Exists.", err_code: 330 });
                            await conn.rollback();
                        } else {
                            let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) csub from 
														(select hdname from hd where hdid=${csub.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
                            checkhdid = await conn.query(checkhdid);
                            addsubscriber += ` ,hdid='${hdid}'`;
                            alog += ` Headend  Changed ${checkhdid[0][0].csub}.`
                        }

                    }
                    if (csub.profileid != data.profileid) {
                        let [checkprofile] = await conn.query(`SELECT * FROM smsv2.subscriber WHERE  hdid=${hdid} AND profileid='${data.profileid}'`);
                        console.log('checkprofile : ', checkprofile);
                        if (checkprofile.length == 1) {
                            erroraray.push({ msg: " Profile Id Already Exists.", err_code: 346 });
                            await conn.rollback();
                        } else {

                            addsubscriber += ` ,profileid='${data.profileid}'`;
                            alog += ` Profile Id  Changed from ${csub.profileid} to ${data.profileid}.`
                        }

                    }
                    if (csub.cafno != data.cafno) {
                        addsubscriber += ` ,cafno='${data.cafno}'`;
                        alog += ` CAF Number   Changed  from ${csub.cafno} to ${data.cafno}.`
                    }

                    addsubscriber += ' WHERE custid =' + data.custid
                    addsubscriber = await conn.query(addsubscriber);

                    if (addsubscriber[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE SUBSCRIBER',`longtext`='" + alog + " DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Subscriber Upload Succesfully", err_code: 0 });
                            await conn.commit();
                        }

                    }

                } else {
                    erroraray.push({ msg: " Subscriber Already Exists.", err_code: 374 });

                    await conn.rollback();
                }

            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })

                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 389 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}


subscriber.post('/editsubscriber', async (req, res) => {
    req.setTimeout(864000000);

    const validation = joiValidate.editsubscriberDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await editsubscriber(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

subscriber.post('/geteditsubscriber', function (req, res) {

    var data = req.body, jwtdata = req.jwt - data, where = [],
        sql, sqlquery = `	   
		SELECT  s.custid,s.hdid,s.profileid,s.userid,s.cafno,s.fullname,s.dob,s.password,s.mobile,s.phone,s.pin_no,s.country,s.state,s.district,s.city,s.area,s.installation_addr,s.email,s.proof_type,s.proof_id,b.boxno,b.boxid
   
 FROM smsv2.subscriber s  LEFT JOIN smsv2.box b ON s.custid=b.custid
		WHERE s.custid =` + data.custid;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  s.hdid= ${data.hdid}`);
    if (jwtdata.role <= 777) where.push(` s.hdid= ${jwtdata.hdid}`);
    if (where.length > 0) {
        where = where.join(' AND ');
        sqlquery += where;
    }


    console.log(data, 'vytyhfytyfytftff')
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, data.id, function (err, result) {
                // console.log(id,"++++++++++");

                console.log('get pack', sql.sql);
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                    console.log(result[0], "--------");
                }
            });
        }
    });
});

subscriber.post('/listsubscriber', function (req, res, err) {
    var jwtdata = req.jwt_data, where = [], sql, sqlquery = `SELECT  u.profileid,u.usertype,h.hdname,h.hdid,s.cafno,s.custid,s.profileid,s.fullname,s.mobile,s.email,
    s.installation_addr,b.boxno,b.boxid,s.userid FROM smsv2.subscriber s 
    INNER JOIN smsv2.box b ON s.custid=b.custid
    LEFT JOIN smsv2.hd h ON s.hdid=h.hdid 
    LEFT JOIN smsv2.hd_cas cs ON b.casid=cs.hdcasid
    inner JOIN smsv2.users u ON s.userid=u.id WHERE b.stbprimary=1
      `,

        sqlqueryc = `SELECT COUNT(*)  count FROM smsv2.subscriber s 
        INNER JOIN smsv2.box b ON s.custid=b.custid
        LEFT JOIN smsv2.hd h ON s.hdid=h.hdid 
        LEFT JOIN smsv2.hd_cas cs ON b.casid=cs.hdcasid
        inner JOIN smsv2.users u ON s.userid=u.id WHERE b.stbprimary=1
         `, finalresult = [],
        data = req.body;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  s.hdid= ${data.hdid}`);
    if (jwtdata.role <= 777) where.push(`  s.hdid= ${jwtdata.hdid}`);
    if (data.hasOwnProperty('userid') && data.userid) where.push(`  s.userid = ${data.userid} `)
    if (jwtdata.role > 777 && data.usertype != '' && data.usertype != null) where.push(`   s.usertype<= ${jwtdata.role}`);
    if (jwtdata.role <= 777) where.push(`  s.usertype <= ${jwtdata.role}`);
    if (data.hasOwnProperty('boxno') && data.boxno) where.push(` b.boxid= ${data.boxno}`);
    if (data.hasOwnProperty('cas') && data.cas) where.push(` cs.casid= ${data.cas}`);



    if (where.length > 0) {
        where = ' and ' + where.join(' AND ');
        sqlquery += where;
        sqlqueryc += where;
    }
    if (data.index != null) console.log('-----');
    if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
    console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
    console.log('data', data)
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        if (!err) {
                            finalresult.push(result[0]);
                            res.end(JSON.stringify(finalresult));
                        } else {
                            console.log('err');
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});


subscriber.post('/listsurrendersubscriber', function (req, res, err) {
    var jwtdata = req.jwt_data, where = [], sql, sqlquery = `SELECT  u.profileid,u.usertype,h.hdname,s.cafno,s.custid,s.profileid,s.fullname,s.mobile,s.email,s.installation_addr FROM smsv2.subscriber s 
    LEFT JOIN smsv2.box b ON s.custid=b.custid
     LEFT JOIN smsv2.hd h ON s.hdid=h.hdid 
    LEFT JOIN smsv2.users u ON s.userid=u.id WHERE b.boxno IS NULL AND b.vcid IS NULL
      `,

        sqlqueryc = `SELECT COUNT(*)  count FROM smsv2.subscriber s 
        LEFT JOIN smsv2.box b ON s.custid=b.custid
        LEFT JOIN smsv2.hd h ON s.hdid=h.hdid 
       LEFT JOIN smsv2.users u ON s.userid=u.id WHERE b.boxno IS NULL AND b.vcid IS NULL
         `, finalresult = [],
        data = req.body;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` s.hdid= ${data.hdid}`);
    if (jwtdata.role <= 777) where.push(`AND s.hdid= ${jwtdata.hdid}`);
    if (jwtdata.role > 777 && data.user_type != '' && data.user_type != null) where.push(` u.usertype= ${data.user_type}`);
    if (jwtdata.role <= 777) where.push(`AND u.usertype <= ${jwtdata.role}`);
    // if (jwtdata.role > 777 && data.boxno != '' && data.boxno != null) where.push(` b.boxid= ${data.boxno}`);
    // if (jwtdata.role <= 777) where.push(` b.boxid= ${jwtdata.boxno}`);


    // if (where.length > 0) {
    // 	where = ' WHERE' + where.join(' AND ');
    // 	sqlquery += where;
    // }
    if (data.index != null) console.log('-----');
    if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
    console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
    console.log('data', data)
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        if (!err) {
                            finalresult.push(result[0]);
                            res.end(JSON.stringify(finalresult));
                        } else {
                            console.log('err');
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});



async function addsubscriber(req) {
    console.log('Edit User Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let hdid = '';
                if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
                if (jwtdata.role <= 777) hdid = jwtdata.hdid;
                if (hdid == '' || hdid == null) {
                    erroraray.push({ msg: "Please Select Headend.", err_code: 49 });
                    await conn.rollback();
                }
                console.log('User Data', data);
                let addsubscriber = await conn.query(`SELECT * FROM smsv2.subscriber WHERE  hdid=${hdid} AND profileid='${data.profileid}'  `);
                if (addsubscriber[0].length == 0) {
                    let status = data.status == true ? 1 : 0;
                    data.installation_addr = data.installation_addr.replace("'", ' ');
                    data.billing_addr = data.billing_addr.replace("'", ' ');
                    let same_addr = data.same_addr == true ? 1 : 0;
                    let addsubscriber = `INSERT INTO  smsv2.subscriber SET  
                    hdid=${hdid}
                    ,userid=${data.userid}
                    ,profileid='${data.profileid}'
                    ,cafno=${data.cafno}
                    ,fullname='${data.fullname}'
                    ,dob='${data.dob}'
                    ,password=md5('${data.password}')
                    ,mobile=${data.mobile}
                    ,pin_no=${data.pin_no}
                    ,country=${data.country}
                    ,state=${data.state}
                    ,district=${data.district}
                    ,city=${data.city}
                    ,area=${data.area}
                    ,installation_addr='${data.installation_addr}'
                    ,billing_addr='${data.billing_addr}'
                    ,same_addr=${same_addr}
                    ,email='${data.email}'
                    ,  enablestatus=${status}
                    ,cby=${jwtdata.id}`;
                    if (data.desc != '' && data.desc != null) addsubscriber += `,desc='${data.desc}'`;
                    if (data.phone != '' && data.phone != null) addsubscriber += `,phone=${data.phone}`;


                    console.log('ADD operator Query: ', addsubscriber);

                    addsubscriber = await conn.query(addsubscriber);
                    if (addsubscriber[0]['affectedRows'] > 0) {

                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD SUBSCRIBER',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Subscriber Upload Succesfully", id: addsubscriber[0].insertId, err_code: 0 });
                            await conn.commit();
                        }

                    }

                    if (data.stb_no) {

                        let addbox = `update  smsv2.box SET  
                                                            custid=${addsubscriber[0].insertId},stbprimary=1 where boxid=${data.stb_no}
                                                           `;
                        addbox = await conn.query(addbox);


                        if (addbox[0]['affectedRows'] > 0) {
                            let addcaf = `INSERT INTO smsv2.user_document SET
                                                        userid=${data.userid},
                                                        status=${data.status1},				
                                                        cby=${jwtdata.id}`;
                            addcaf = await conn.query(addcaf);
                            if (addcaf[0]['affectedRows'] > 0) {

                                let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD CUSTOMER LOG',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                                sqllog = await conn.query(sqllog);
                                if (sqllog[0]['affectedRows'] > 0) {
                                    erroraray.push({ msg: " CAF created Succesfully", id: addsubscriber[0].insertId, err_code: 0 });
                                    await conn.commit();

                                }
                            } else {
                                erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
                                await conn.rollback();
                            }

                        } else {
                            erroraray.push({ msg: "Please Check Package ID", err_code: 1111 });
                            await conn.rollback();
                        }

                        if (addbox[0]['affectedRows'] > 0) {
                            let addcust = `INSERT INTO smsv2.CustBoxAssignLog SET
                                                        hdid=${data.hdid},
                                                        userid=${data.userid},
                                                        custid=${addsubscriber[0].insertId},
                                                        boxid=${data.stb_no},					
                                                        cby=${jwtdata.id}`;
                            addcust = await conn.query(addcust);
                            if (addcust[0]['affectedRows'] > 0) {

                                let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD CUSTOMER LOG',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                                sqllog = await conn.query(sqllog);
                                if (sqllog[0]['affectedRows'] > 0) {
                                    erroraray.push({ msg: " CustBoxAssignLog created Succesfully", err_code: 0 });
                                    await conn.commit();

                                }
                            } else {
                                erroraray.push({ msg: "Contact Your Admin.", err_code: 651 });
                                await conn.rollback();
                            }

                        } else {
                            erroraray.push({ msg: "Please Check Customer LOG ID", err_code: 656 });
                            await conn.rollback();
                        }

                    }


                }

                else {
                    erroraray.push({ msg: " User  Already Exists.", err_code: 1111 });

                    await conn.rollback();
                }

            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes', err_code: 8789 })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 679 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}
subscriber.post('/addsubscriber', async (req, res) => {
    req.setTimeout(864000000);

    const validation = joiValidate.subscriberDatachema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await addsubscriber(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

subscriber.post('/getoperator', function (req, res) {
    console.log('hfhghgh')
    var sql, data = req.body, jwtdata = req.jwt_data, where = [],
        sqlquery = `SELECT id,hdid, profileid FROM smsv2.users WHERE usertype!=770 AND usertype!=999 `;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` and hdid=${data.hdid}`);
    if (jwtdata.role <= 777) where.push(` and hdid=${jwtdata.hdid}`);
    if (data.hasOwnProperty('like') && data.like) where.push(`  profileid LIKE '%${data.like}%'`);
    // if (data.hasOwnProperty('chantype') && data.chantype) {
    //     sqlquery+=` AND chantype =${data.chantype}`;
    // }
    if (where.length > 0) {
        where = where.join(' AND ');
        sqlquery += where;
    }
    console.log(sqlquery, 'yaaaaa')
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});






module.exports = subscriber;