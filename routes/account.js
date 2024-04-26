"use strict";
var express = require('express'),
    compress = require('compression'),
    account = express.Router(),
    pool = require('../connection/conn');
poolPromise = require('../connection/conn').poolp;
const multer = require('multer');
const { resolve } = require('path');
const joiValidate = require('../schema/account');


async function adddeposite(req) {
    console.log('Add deposite Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                console.log('deposite Data', data);
                let hdid = '', userinfo = '';
                if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
                if (jwtdata.role <= 777) hdid = jwtdata.hdid;
                if (hdid == '' || hdid == null) {
                    erroraray.push({ msg: "Please Select Headend.", err_code: 25 });
                    await conn.rollback();
                }
                let note = data.note.replace("'", '').replace('"', '');
                if (data.deposit_type != 4) {
                    userinfo = "SELECT depositamt FROM smsv2.users where id=" + data.userid
                    userinfo = await conn.query(userinfo);
                    if (userinfo[0].length == 0) {
                        let addudep = `UPDATE smsv2.users SET depositamt=${data.deposit_amount} where id=${data.userid}`;
                        addudep = await conn.query(addudep);
                    }
                } else {
                    erroraray.push({ msg: "Failed To Deposite.", err_code: 37 });
                    await conn.rollback();
                }
                let adddep = `INSERT INTO smsv2.deposit SET 
                        hdid=${hdid},
                        role=${data.role},
                        userid=${data.userid},
                        paymode=${data.paymode},
                        deposit_type=${data.deposit_type},
                        cby=${jwtdata.id}`;
                if (data.paymode == 2) adddep += `,utr='${data.utr}'`;
                if (data.deposit_type == 1) adddep += `,deposit_amount=${data.deposit_amount}`;
                if (data.deposit_type == 2) adddep += `,deposit_amount=${data.deposit_amount}`;
                if (data.deposit_type == 3) adddep += `,deposit_amount=${data.deposit_amount}`;
                if (data.received_amount == 4) adddep += `,received_amount='${data.received_amount}'`;
                if (data.note != '' && data.note != null) adddep += `,note='${data.note}'`;
                console.log('ADD deposite Query: ', adddep);
                adddep = await conn.query(adddep);
                if (adddep[0]['affectedRows'] > 0) {
                    if (data.deposit_type == 1) {
                        let adduser = ` UPDATE smsv2.users SET depositamt=depositamt+${data.deposit_amount} WHERE id=${data.userid}`
                        adduser = await conn.query(adduser);
                        console.log('adddep', adddep);
                    }

                    if (data.deposit_type == 2) {
                        let addus = ` UPDATE smsv2.users SET depositamt=depositamt-${data.deposit_amount} WHERE id=${data.userid}`
                        addus = await conn.query(addus);
                    }

                    let addamt = " UPDATE smsv2.deposit AS d, smsv2.users AS  u  SET  d.before_amount=u.depositamt WHERE u.id=d.userid"
                    addamt = await conn.query(addamt);
                    if (adddep[0]['affectedRows'] > 0) {
                        let sqllog = `INSERT INTO smsv2.deposit_log SET
                            dep_id=${adddep[0].insertId},
                            hdid=${hdid},
                            role=${data.role},
                            userid=${data.userid},
                            paymode=${data.paymode},
                            deposit_type=${data.deposit_type},
                            created_by=${jwtdata.id}`;
                        // if (data.paymode == 2) sqllog += `,utr='${data.utr}'`;
                        if (data.deposit_type == 1) sqllog += `,deposit_amount='${data.deposit_amount}'`;
                        if (data.deposit_type == 2) sqllog += `,deposit_amount='${data.deposit_amount}'`;
                        if (data.deposit_type == 3) sqllog += `,deposit_amount='${data.deposit_amount}'`;
                        if (data.received_amount == 4) sqllog += `,received_amount='${data.received_amount}'`;


                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {

                            let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD DEPOSITE',`longtext`='DONE BY',hdid=" + jwtdata.hdid + ", usertype="+jwtdata.role+",cby=" + jwtdata.id;
                            sqllog = await conn.query(sqllog);
                            if (sqllog[0]['affectedRows'] > 0) {
                                erroraray.push({ msg: "  Deposite Created Succesfully ", id: adddep[0].insertId, err_code: 0 });
                                await conn.commit();
                            }
                        } else {
                            erroraray.push({ msg: "Contact Your Admin.", err_code: 95 });
                            await conn.rollback();
                        }

                    } else {
                        erroraray.push({ msg: "Please Check Deposite Log ", err_code: 100 });
                        await conn.rollback();
                    }


                } else {
                    erroraray.push({ msg: "Contact Your Admin.", err_code: 106 });
                    await conn.rollback();
                }


            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes', err_code: 113 });
                await conn.rollback();
            }
            console.log('Success--1');
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 118 });
            return resolve(erroraray);
        }
        if (conn) conn.release();
        console.log('connection Closed.');
        return resolve(erroraray);
    });
}
account.post('/adddeposite', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.accDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        return res.json([{ msg: validation.error.details[0].message, err_code: '131' }]);
    }
    let result = await adddeposite(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        console.log('request file--', file)
        let namefile = file.originalname.split('-')[1], folder_status = false;
        console.log('file name ', file.originalname)
        const fs = require("fs")
        const filename = namefile
        console.log('filename++++++++', filename);
        const imagePath = `${__dirname}/../Documents/${filename}`;
        fs.exists(imagePath, exists => {
            if (exists) {
                folder_status = true
                console.log(" Directory Already created.")
            } else {
                folder_status = true
                fs.mkdir(imagePath,{ recursive: true }, function (err) {
                    if (err) {
                        console.log(err)
                    } else { console.log("New directory successfully created.") }
                })
            }
            if (folder_status) { callback(null, imagePath); }
        });
    },
    filename: function (req, file, callback) {
        console.log("Filename", file.originalname)
        let nowdate = new Date();
        let edate = ((nowdate).toISOString().replace(/T/, '-').replace(/\..+/, '')).slice(0, 16);
        console.log('edateeee', edate);
        let filename = file.originalname.split('-')[0]
        // callback(null, file_name + '-' + nowdate.toISOString().slice(0, 10) + '.' + file.mimetype.split('/')[1])
        callback(null, filename + '-' + 'deposit' + '-' + nowdate.toISOString().slice(0, 10) + '.' + 'png')
    }
})
const upload = multer({ storage: storage }).array('file', 4)
account.post('/uploadfile', function (req, res) {
    var erroraray = [], data, sqlquery, file;
    console.log('nnnnnnnnn',req);
    upload(req, res, function (err) {
        console.log('file', file)
        console.log('nnnnnnnnn',req.body);
        if (err) {
            console.log("Error uploading file.", err)
            erroraray.push({ msg: "Upload Failed", error_msg: 254 });
            res.end(JSON.stringify(erroraray));
        } else {
            data = req.body, file = req.files;
            console.log("Request.", req.body, file)
            console.log("Request Files .", file.length)
            let filename = `${file[0].filename}`;
            sqlquery = " UPDATE smsv2.deposit SET img='" + filename + "' WHERE id =" + data.id

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
                                erroraray.push({ msg: "Upload Failed", error_msg: 201 });
                                res.end(JSON.stringify(erroraray));
                            }
                        } else {
                            console.log("File Not uploaded.", err)
                            erroraray.push({ msg: "Upload Failed", error_msg: 206 });
                            res.end(JSON.stringify(erroraray));
                        }
                    });

                }
            });

        }
    });
});


account.post('/listdeposit', function (req, res, err) {
    var where = [], jwtdata = req.jwt_data, data = req.body,
        sql, sqlquery = `                        
     SELECT d.id, h.hdname,hd.rolename,u.fullname,d.deposit_type,dm.dep_mode_name,d.paymode,d.utr,d.deposit_amount,d.note,d.cdate FROM smsv2.deposit d
                    LEFT JOIN smsv2.hd h ON h.hdid=d.hdid
                    LEFT JOIN smsv2.hd_role hd ON hd.role=d.role 
                    LEFT JOIN smsv2.users u ON u.id=d.userid 
                    LEFT JOIN smsv2. deposit_mode dm ON dm.id=d.deposit_type  WHERE d.hdid=hd.hdid `,
        sqlqueryc = `SELECT count(*) count
        FROM smsv2.deposit d
        LEFT JOIN smsv2.hd h ON h.hdid=d.hdid
        LEFT JOIN smsv2.hd_role hd ON hd.role=d.role 
        LEFT JOIN smsv2.users u ON u.id=d.userid 
        LEFT JOIN smsv2. deposit_mode dm ON dm.id=d.deposit_type  WHERE d.hdid=hd.hdid `,
        finalresult = [];
    console.log('listdepppppp------\n\r', data);
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where +=(` And  d.hdid=${data.hdid}`);
    if (jwtdata.role <= 777) where +=(` AND d.hdid=${jwtdata.hdid}`);
    if ( data.usertype != '' && data.usertype != null) where +=(` AND  d.role= ${data.usertype} `);
    if ( data.userid != '' && data.userid != null) where +=(` AND  d.userid= ${data.userid} `);
    if ( data.depid != '' && data.depid != null) where +=(` AND  d.deposit_type= ${data.depid} `);

    if (where != '') {
        sqlquery += where;
        sqlqueryc += where;
    }
    if (data.index != null) console.log('-----');
    if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
    console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);


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
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});


account.post('/selectdpositemode', function (req, res) {
    var jwtdata = req.jwt_data, where = [], sql, sql1 = '', data = req.body,
        sqlquery = ' SELECT id,dep_mode_name FROM smsv2.deposit_mode ';

    // if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid} `);
    // if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);
    
    // if (jwtdata.role > 777 && data.role != '' && data.role != null) where.push(` usertype= ${data.role} `);
    // if (jwtdata.role <= 777) where.push(` usertype= ${jwtdata.role} `);

    // if (data.hasOwnProperty('userid') && data.userid) where.push(` userid =${data.userid} `);

    // if (where.length > 0) {
    //     where = ' WHERE' + where.join(' AND ');
    //     sqlquery += where;
    // }
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            sql = conn.query(sqlquery,  function (err, result) {
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});
module.exports = account;