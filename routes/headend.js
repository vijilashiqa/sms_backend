"use strict";
var express = require('express'),
    compress = require('compression'),
    headend = express.Router(),
    pool = require('../connection/conn'),
    poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/headend');

headend.use(compress());


async function addheadend(req) {
    console.log('Add Headend Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        console.log('data ', data);
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let regex = "^[0-9]{2}[A-Z]{4,5}[0-9]{4,5}[A-Z]{1}[1-9A-Z]{1}[A-Z]{1}[0-9A-Z]{1}$";
                let gststatus = data.gst.match(regex) ? false : true;
                if (gststatus == true) {
                    erroraray.push({ msg: "Invalid GST Number", error_msg: 23 });
                    console.log("Invalid GST Number");
                    await conn.rollback();
                } else {
                    let checkgst = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`hd` WHERE hdname='" + data.hdname + "'");
                    if (checkgst[0][0]['cnt'] == 0) {
                        let status = data.status == true ? 1 : 0;
                        data.crop_addr = data.crop_addr.replace("'", ' ');
                        data.comm_addr = data.comm_addr.replace("'", ' ');
                        let addhd = `INSERT INTO smsv2.hd SET hdname='${data.hdname}',gst='${data.gst}',mobileno='${data.mobileno}',countryid='${data.countryid}', hdlid ='${data.headendid}',com_invid='${data.com_invid}'
                                    ,pincode=${data.pincode}, status=${status}, stateid=${data.stateid},districtid=${data.districtid},cityid=${data.cityid},areaid=${data.areaid},email='${data.email}',
                                    crop_addr='${data.crop_addr}',comm_addr='${data.comm_addr}',postpaiddate=${data.postpaiddate},postpaidtime='${data.postpaidtime}'
                                    ,cby=${jwtdata.id},igst=${data.igst},cgst=${data.cgst},sgst=${data.sgst}`;

                        if (data.descr != '' && data.descr != null) addhd += `,descr='${data.descr}'`;

                        console.log('ADD HD Query: ', addhd); 
                        addhd = await conn.query(addhd);
                        if (addhd[0]['affectedRows'] > 0) {
                            let addrole = `INSERT INTO smsv2.hd_role (hdid,menurole,rolename,role) SELECT ${addhd[0].insertId},menurole,rolename,role FROM smsv2.role`
                            console.log('ADD HD GST LOG Query: ', addrole);
                            addrole = await conn.query(addrole);
                            if (addrole[0]['affectedRows'] > 0) {
                                erroraray.push({ msg: " Headend Added Succesfully", err_code: 0 });
                                await conn.commit();

                            } else {
                                erroraray.push({ msg: "HD Role Not Updated" });
                                await conn.rollback();
                            }

                            let gstlog = `INSERT INTO smsv2.gst_log SET hdid=${addhd[0].insertId},igst=${data.igst},cgst=${data.cgst},sgst=${data.sgst},cby=${jwtdata.id}`;
                            console.log('ADD HD GST LOG Query: ', gstlog);
                            gstlog = await conn.query(gstlog);
                            if (gstlog[0]['affectedRows'] > 0) {
                                let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD Headend',`longtext`='DONE BY' ,usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                                sqllog = await conn.query(sqllog);
                                if (sqllog[0]['affectedRows'] > 0) {
                                    erroraray.push({ msg: " Headend Added Succesfully", err_code: 0 });
                                    await conn.commit();
                                }
                            } else {
                                erroraray.push({ msg: "Can Not Add GST Log.", err_code: 387 });
                                await conn.rollback();
                            }
                        } else {
                            erroraray.push({ msg: "Contact Your Admin.", err_code: 391 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Headend Name Already Available.", err_code: 395 });
                        await conn.rollback();
                    }
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
            erroraray.push({ msg: 'Please try after sometimes', err_code: 408 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

headend.post('/addheadend', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.headEndSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await addheadend(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

headend.post('/listheadend', function (req, res, err) {
    var jwtdata = req.jwt_data, where = [], sql, sqlquery = `SELECT h.hdid,h.hdname,h.gst,h.mobileno,h.countryid,h.pincode,h.stateid,h.districtid,h.cityid,h.areaid,h.email,h.crop_addr,h.comm_addr,
    h.descr,h.postpaiddate,h.postpaidtime,h.status,h.igst,h.cgst,h.sgst,h.com_invid,c.country_name,s.state_name,d.district_name,ct.city_name,a.area_name
    FROM smsv2.hd h INNER JOIN geo.country c ON h.countryid = c.country_pk INNER JOIN geo.state s ON h.stateid = s.state_pk
    INNER JOIN geo.district d ON h.districtid = d.district_pk INNER JOIN geo.city ct ON h.cityid = ct.id
    INNER JOIN geo.area a ON h.areaid = a.id`,
        sqlqueryc = `SELECT count(*) count
         FROM smsv2.hd h INNER JOIN geo.country c ON h.countryid = c.country_pk INNER JOIN geo.state s ON h.stateid = s.state_pk
        INNER JOIN geo.district d ON h.districtid = d.district_pk INNER JOIN geo.city ct ON h.cityid = ct.id
        INNER JOIN geo.area a ON h.areaid = a.id`, finalresult = [],
        data = req.body;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` h.hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where.push(` h.hdid= ${jwtdata.hdid} `);
    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ');
        sqlquery += where;
        sqlqueryc += where;
    }
    if (data.index != null) console.log('-----');
    if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
    console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
    console.log('getlist...', sqlquery);
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
headend.post('/getheadendedit', function (req, res) {
    var   data = req.body,jwtdata=req.jwt_data,where=[], 
        sql, sqlquery = ' SELECT hdid,hdname,hdlid,gst,mobileno,countryid,pincode,stateid,districtid,cityid,areaid,email,crop_addr,comm_addr, ' +
            'descr,postpaiddate,postpaidtime,STATUS,igst,cgst,sgst,com_invid FROM smsv2.hd ';
            if(jwtdata.role > 777 && data.hdid !='' && data.hdid != null)where.push(` hdid=${data.hdid} `);
            if(jwtdata.role <= 777)where.push(` hdid =${jwtdata.hdid}`);
            if(where.length > 0){
             where= where.join( ' AND ' );  
             sqlquery+= where ; 
            }
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, data.id, function (err, result) {
                console.log('get headend', sql.sql);
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                }
            });
        }
    });
});
async function editheadend(req) {
    console.log('Edit Headend Data:', req.body);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog = "";
        console.log('dataddd', data);
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let regex = "^[0-9]{2}[A-Z]{4,5}[0-9]{4,5}[A-Z]{1}[1-9A-Z]{1}[A-Z]{1}[0-9A-Z]{1}$";
                let gststatus = data.gst.match(regex) ? false : true;
                if (gststatus == true) {
                    erroraray.push({ msg: "Invalid GST Number", error_msg: 23 });
                    console.log("Invalid GST Number");
                    await conn.rollback();
                } else {

                    let checkgst = await conn.query("SELECT * FROM smsv2.`hd` WHERE hdid =" + data.id + "  AND hdname!='" + data.hdname + "'");
                    if (checkgst[0].length == 1) {
                        let sh = checkgst[0][0];
                        let status = data.status == true ? 1 : 0;
                        let edithd = `UPDATE smsv2.hd SET  gst='${data.gst}',mobileno='${data.mobileno}',countryid='${data.countryid}', hdlid ='${data.headendid}',com_invid='${data.com_invid}'
                                    ,pincode=${data.pincode}, status=${status}, stateid=${data.stateid},districtid=${data.districtid},cityid=${data.cityid},areaid=${data.areaid},email='${data.email}',
                                    crop_addr='${data.crop_addr}',comm_addr='${data.comm_addr}',postpaiddate=${data.postpaiddate},postpaidtime='${data.postpaidtime}'
                                    ,cby=${jwtdata.id},igst=${data.igst},cgst=${data.cgst},sgst=${data.sgst}`;

                        if (data.descr != '' && data.descr != null) edithd += `,descr='${data.descr}'`;
                        if (sh.hdname != data.hdname) {
                            edithd += ` , hdname='${data.hdname}'`
                            alog += ` Headend name Chanegd From ${sh.hdname} To ${data.hdname}`
                        }
                        edithd += ' WHERE hdid =' + data.id
                        console.log('EDIT HD Query: ', edithd);
                        edithd = await conn.query(edithd);

                        if (edithd[0]['affectedRows'] > 0) {
                            let gstlog = `INSERT INTO smsv2.gst_log SET hdid=${edithd[0].insertId},igst=${data.igst},cgst=${data.cgst},sgst=${data.sgst}`;
                            console.log('EDIT HD GST LOG Query: ', gstlog);
                            gstlog = await conn.query(gstlog);
                            if (gstlog[0]['affectedRows'] > 0) {
                                let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE HEADEND',`longtext`=' " + alog + "  DONE BY', usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                                sqllog = await conn.query(sqllog);
                                if (sqllog[0]['affectedRows'] > 0) {
                                    erroraray.push({ msg: " Headend Updated Succesfully", err_code: 0 });
                                    await conn.commit();
                                }

                            } else {
                                erroraray.push({ msg: "Can Not Add GST Log.", err_code: 214 });
                                await conn.rollback();
                            }
                        } else {
                            erroraray.push({ msg: "Contact Your Admin.", err_code: 218 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Headend Exists.", err_code: 222 });
                        await conn.rollback();
                    }
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes err', err_code: 'ERR' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 235 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

headend.post('/editheadend', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.editheadEndSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await editheadend(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});


headend.post('/getHeadend', function (req, res) {

    var jwtdata = req.jwt_data, where = [], data = req.body, sql, sqlq = 'SELECT hdid,hdname FROM smsv2.`hd`'

    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);
    // if (data.hasOwnProperty('op_type') && data.op_type) {
    // 	where.push(' user.user_type = ' + data.op_type);
    // }
    console.log('data', data);
    // if (data.hasOwnProperty('like') && data.like) {
    //     sqlq += ' WHERE hdname LIKE "%' + data.like + '%" '
    // }

    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ');
        sqlq += where;
        sqlq += where;
    }

    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('Error');
        } else {
            sql = conn.query(sqlq, function (err, result) {
                conn.release();
                if (!err) {
                    res.json(result);
                }
            });
        }
    });
});

async function addcas(req) {
    console.log('Add CAS Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                console.log('channel Data', data);
                let checkchannel = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`cas` WHERE casname='" + data.casname + "'");
                if (checkchannel[0][0]['cnt'] == 0) {
                    // let status = data.status == true ? 1 : 0;
                    let addchn = `INSERT INTO smsv2.cas SET casname='${data.casname}'`;
                    console.log('ADD CAS Query: ', addchn);
                    addchn = await conn.query(addchn);
                    if (addchn[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD CAS',`longtext`='DONE BY',usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Cas created Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " CAS Name Already Exists.", err_code: 1111 });
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
            erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

headend.post('/listcas', function (req, res, err) {
    var sql, sqlquery = `SELECT casid,cas_name FROM smsv2.hd_cas `,
        sqlqueryc = `SELECT count(*) count
        FROM smsv2.cas
        `, finalresult = [],
        data = req.body;
    console.log(data, 'gfdrtdrtcfgdtrd')
    console.log('listhdcas...', sqlquery);
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        if (!err) {
                            finalresult.push(result[0]);
                            res.json(finalresult)
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});

async function editcas(req) {
    console.log('update Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                console.log('Data', data);
                let checkprofile = await conn.query("SELECT COUNT(*) cnt FROM smsv2.cas  WHERE  casname = '" + data.casname + "' ");
                if (checkprofile[0][0]['cnt'] == 0) {
                    let status = data.status == true ? 1 : 0;
                    let addhd = `UPDATE  smsv2.cas SET						 						
						
						 casname='${data.casname}'
						`;
                    addhd += ' WHERE casid =' + data.casid
                    console.log('Update channel Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE CAS ',`longtext`='DONE BY',usertype=" + jwtdata.role + ", cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Cas Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
                        await conn.rollback();
                    }
                } else {
                    console.log('no data', checkprofile)
                    erroraray.push({ msg: " Cas Name already Exits", err_code: 1111 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes err', err_code: 'ERR' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

headend.post('/addcas', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.addcaSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await addcas(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

headend.post('/editcas', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.editcaSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        //  return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await editcas(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

headend.post('/getCas', function (req, res) {
    pool.getConnection(function (err, conn) {
        var data = req.body, sql, sqlq = ' SELECT casid,cas_name FROM smsv2.hd_cas '
        if (data.hasOwnProperty('like') && data.like) {
            sqlq += ' WHERE casname LIKE "%' + data.like + '%" '
        }
        if (err) {
            console.log('Error');
        } else {
            sql = conn.query(sqlq, function (err, result) {
                conn.release();
                if (!err) {
                    res.json(result);
                }
            });
        }
    });
});

headend.post('/Caslist', function (req, res, err) {
    var sql, sqlquery = `SELECT casid,casname FROM smsv2.cas`,
        sqlqueryc = `SELECT count(*) count
        FROM smsv2.cas
        `, finalresult = [],
        data = req.body;
    console.log('jwt_Data', req.jwt_data);
    console.log(data, 'gfdrtdrtcfgdtrd')
    console.log('listhdcas...', sqlquery);
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        if (!err) {
                            finalresult.push(result[0]);
                            res.json(finalresult)
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});



// Headend CAS Management

async function addHdCas(req) {
    console.log('Add HdCAS Data:', req.body);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        const jwt_data = req.jwt_data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let locq = " SELECT COUNT(*) cnt FROM smsv2.`hd_cas` WHERE hdid= ? AND casid = ? "
                let casloc = await conn.query(locq, [data.hdid, data.casid]);
                console.log('lod---', casloc);

                if (casloc[0][0]['cnt'] == 0) {
                    let addhd = `INSERT INTO smsv2.hd_cas (hdid,casid,cas_name,caslid,ip,port,smsidate,casidate,cby) 
                         SELECT ${data.hdid},${data.casid},casname,'${data.caslid}','${data.ip}',${data.port},'${data.smsidate}','${data.casidate}',${jwt_data.id} FROM smsv2.cas WHERE casid = ${data.casid}`;
                    console.log('ADD HDCAS Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD HEADEND CAS',`longtext`='DONE BY',  hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Headend CAS Added Succesfully", err_code: 0 });
                            await conn.commit();
                        } else {
                            erroraray.push({ msg: "Please try after sometimes.", err_code: 621 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 625 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: "Cas Location Already Exists", err_code: 629 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes', err_code: '634' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 641 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

headend.post('/listHdcas', function (req, res, err) {
    var sql, sqlquery = `SELECT c.cas_name ,hd.hdname,c.casidate,c.smsidate,c.caslid,c.hdcasid,hd.hdid FROM smsv2.hd hd INNER JOIN hd_cas c ON c.hdid =hd.hdid `,
        sqlqueryc = `SELECT count(*) count
        FROM smsv2.hd hd INNER JOIN hd_cas c ON c.hdid =hd.hdid 
        `, finalresult = [],
        data = req.body;
    console.log('jwt_Data', req.jwt_data);
    if (data.hdid) {
        sqlquery += ` where c.hdid =${data.hdid} `
        sqlqueryc += ` where c.hdid =${data.hdid} `

    }
    console.log(data, 'gfdrtdrtcfgdtrd')
    console.log('listhdcas...', sqlquery);
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        if (!err) {
                            finalresult.push(result[0]);
                            res.json(finalresult)
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});

headend.post('/gethdcasedit', function (req, res) {
    var data = req.body,
        sql, sqlquery = `SELECT  * FROM smsv2.hd_cas c WHERE c.hdcasid =${data.hdcasid}`;
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, data.id, function (err, result) {
                console.log('lanfg', sql.sql);
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                }
            });
        }
    });
});


async function editHdCas(req) {
    console.log('edit HdCAS Data:', req.body);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog = '';
        const jwt_data = req.jwt_data;
        let conn = await poolPromise.getConnection();
        console.log('data.....', data)
        if (conn) {
            await conn.beginTransaction();
            try {
                console.log('------', data.id);
                let locq = " SELECT * FROM smsv2.`hd_cas` WHERE   hdcasid = ? "
                let casloc = await conn.query(locq, [data.id]);
                console.log('lod---', casloc[0]);
                if (casloc[0].length == 1) {
                    let hd = casloc[0][0];
                    console.log('hd', hd)
                    // check editing cas id same or not

                    let addhd = `UPDATE smsv2.hd_cas SET  caslid='${data.caslid}',smsidate='${data.smsidate}',casidate='${data.casidate}',lmby=${jwt_data.id}`
                    console.log(hd.casid, data.casid);
                    if (hd.casid != data.casid) {
                        let checknewcas = ` select count(*) cnt from hd_cas where hdid=${data.hdid} and casid=${data.casid} `;
                        checknewcas = await conn.query(checknewcas);
                        console.log(checknewcas[0][0]['cnt']);
                        if (checknewcas[0][0]['cnt'] == 0) {

                            addhd += ` ,casid=${data.casid},cas_name=(SELECT casname FROM smsv2.cas WHERE casid = ${data.casid}) `;
                            alog += ` CAS Name :${hd.cas_name} Removed. `

                        }
                        else {
                            erroraray.push({ msg: "CAS Already Exists.", err_code: 677 });
                            await conn.rollback();
                        }
                    }
                    if (hd.hdid != data.hdid) {
                        let checknewcas = ` select count(*) cnt from hd_cas where hdid=${data.hdid} and casid=${data.casid} `;
                        checknewcas = await conn.query(checknewcas);
                        console.log(checknewcas[0][0]['cnt']);
                        if (checknewcas[0][0]['cnt'] == 0) {
                            let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) hd from 
                            (select hdname from hd where hdid=${hd.hdid} ) a
                            ,(select hdname from hd where hdid=${data.hdid} ) b `;
                            checkhdid = await conn.query(checkhdid);
                            addhd += ` ,hdid='${data.hdid}'`;
                            alog += ` hdid Changed ${checkhdid[0][0].hd}.`;
                        }
                        else {
                            erroraray.push({ msg: "Headend Already Exists.", err_code: 677 });
                            await conn.rollback();
                        }
                    }

                    if (hd.ip != data.ip) {
                        addhd += ` ,ip='${data.ip}'`;
                        alog += ` CAS IP Changed FROM ${hd.ip} TO ${data.ip}.`
                    }
                    if (hd.port != data.port) {
                        addhd += ` ,port=${data.port}`;
                        alog += ` CAS Port Changed FROM ${hd.port} TO ${data.port}.`
                    }

                    addhd += ` WHERE hdcasid=?`
                    console.log('EDIT HDCAS Query: ', addhd);
                    addhd = await conn.query(addhd, data.id);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE HEADEND CAS',`longtext`='" + alog + " DONE BY', hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwt_data.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Headend CAS Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        } else {
                            erroraray.push({ msg: "Please try after sometimes.", err_code: 677 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 681 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: "Headend CAS Already Exists", err_code: 685 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes err', err_code: 'ERR' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 697 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}


headend.post('/addHdCas', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.addHdCasSchema.validate(req.body);
    console.log('Valid', validation);
    if (validation.error) return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    let result = await addHdCas(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

headend.post('/editHdCas', async (req, res) => {
    req.setTimeout(864000000);
    // `const validation = joiValidate.editHdCasSchema.validate(req.body);
    // if (validation.error) return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);`
    let result = await editHdCas(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

headend.post('/editlang', function (req, res) {
    var sql, data = req.body, updatesata;
    const jwt_data = req.jwt_data;
    updatesata = [
        data.lagid,
        jwt_data.id,
        data.langid1
    ];
    console.log(data)
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('Error');
        } else {
            sql = conn.query('SELECT EXISTS(SELECT langid,langname FROM smsv2.`channel_lang` WHERE langname = ? AND langid=?)AS COUNT', [data.langid1, data.lagid], function (err, result) {
                if (!err) {
                    if (result[0].COUNT == 0) {
                        sql = conn.query('UPDATE smsv2.`channel_lang` SET langname = ?,cby=? WHERE langid=?', updatesata, function (err) {
                            if (err) {
                                Errorhandle('Language not Update');
                            } else {
                                console.log(sql.sql)
                                Errorhandle('Language Updated Successfully', 1);

                            }
                        });
                    } else {
                        Errorhandle('Language Already Exist');
                    }
                } else {
                    console.log(sql.sql)
                    Errorhandle('Pls Contact Admin')
                }
            });
        }
        function Errorhandle(msg, status = 0) {
            conn.release();
            res.end(JSON.stringify({ msg: msg, status: status }));
        }
    });
});

headend.post('/editgenre', function (req, res) {
    var sql, data = req.body, updatesata;
    const jwt_data = req.jwt_data;
    updatesata = [
        data.genrename,
        jwt_data.id,
        data.genreid,
        data.langid
    ];
    console.log('data form', data)
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('Error');
        } else {
            sql = conn.query('SELECT EXISTS(SELECT genreid,genrename,langid FROM smsv2.`channel_genre`WHERE genrename =? AND genreid = ?)AS COUNT', [data.genrename, data.genreid, data.lagid], function (err, result) {
                if (!err) {
                    if (result[0].COUNT == 0) {
                        sql = conn.query('UPDATE smsv2.`channel_genre` SET genrename = ?,cby=?,langid=? WHERE genreid=?', updatesata, function (err) {
                            if (err) {
                                Errorhandle('Genre not Update');
                            } else {
                                console.log(sql.sql)
                                Errorhandle('Genre Updated Successfully', 1);

                            }
                        });
                    } else {
                        Errorhandle('Genre Already Exist');
                    }
                } else {
                    console.log(sql.sql)
                    Errorhandle('Pls Contact Admin')
                }
            });
        }
        function Errorhandle(msg, status = 0) {
            conn.release();
            res.end(JSON.stringify({ msg: msg, status: status }));
        }
    });
});

module.exports = headend;