"use strict";
var express = require('express'),
    compress = require('compression'),
    vendordet = express.Router(),
    pool = require('../connection/conn');
poolPromise = require('../connection/conn').poolp;
 const joiValidate = require('../schema/inventory');

async function addvendordet(req) {
    console.log('Add vendordetail Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        let status = data.status == true ? 1 : 0;
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
                // console.log('Data', data);
                let checkprofile = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`vendor_det` WHERE hdid="+hdid+ " AND vendorid='" + data.vendorid + "' AND  loc ='" + data.loc + "'");
                if (checkprofile[0][0]['cnt'] == 0) {
                    let status = data.status == true ? 1 : 0;
                    
                    data.addr = data.addr.replace("'", ' ');
                    let addhd = `INSERT INTO smsv2.vendor_det SET   hdid=${hdid},contact_person='${data.contact_person}',  vendorid =${data.vendorid}, loc='${data.loc}',
                             mobile1=${data.mobile1},  email='${data.email}',addr='${data.addr}',gst='${data.gst}',cin='${data.cin}',gst_type=${data.gst_type},
                         status=${status},created_by=${jwtdata.id}`;

                    if (data.descr != '' && data.descr != null) addhd += ",`descr`='" + data.descr + "' ";

                    if (data.gst_type == 1) {
                        addhd += ` ,c_gst='${data.c_gst}',s_gst='${data.s_gst}'`
                    } else {
                        addhd += `,i_gst='${data.i_gst}'`
                     }

                    console.log('ADD Broadcast Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id=' ADD VENDOR',`longtext`='DONE BY',hdid="+hdid+",usertype="+jwtdata.role+",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Vendor Detail Created Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 53 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " Vendor Detail ID Already Exists.", err_code: 57 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes Error', err_code: 'ERR' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 69 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}
// vendordet.post('/listvendordet', function (req, res) {
//     console.log(req.body)	
//     var where = [], jwtdata = req.jwt_data, sqlquery = 'SELECT h.hdname,v.vendor_name,v_det.vendordetid, v_det.vendorid,v_det.loc,v_det.mobile1,v_det.mobile2,v_det.email,v_det.addr, ' +
//         'v_det.gst,v_det.cin,v_det.gst_type,v_det.i_gst,v_det.c_gst,v_det.s_gst,v_det.descr,v_det.`status`,v_det.contact_person ' +
//         'FROM smsv2.`vendor` AS v,smsv2.`vendor_det` AS v_det ' +
//         'INNER JOIN smsv2.hd h ON v_det.hdid=h.hdid ' +
//         'WHERE v.vendorid = v_det.vendorid  ',
//         data = req.body,
//         sqlqueryc = 'SELECT COUNT(*) AS count ' +
//         'FROM smsv2.`vendor` AS v,smsv2.`vendor_det` AS v_det ' +
//         'INNER JOIN smsv2.hd h ON v_det.hdid=h.hdid ' +
//         'WHERE v.vendorid = v_det.vendorid',finalresult = [];
//         if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null)where.push (` v_det.hdid= ${data.hdid} `);
//         if (jwtdata.role <= 777) where.push(` AND v_det.hdid= ${jwtdata.hdid} `);
        
    
//         if (where != '') {
//             sqlquery += where;
//             sqlqueryc += where;
//         } 
//         if (data.limit && data.index) {
//             sqlquery += ' LIMIT ?,?'
//         }
//      console.log('data',data);
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log('Error');
//         } else {
//             console.log(data)
//             var sql = conn.query(sqlquery, [data.index, data.limit], function (err, result) {
//                 console.log(sql.sql)
//                 if (!err) {
//                     var val = [];
//                     val.push(result);
//                     sql = conn.query(sqlqueryc, function (err, result) {
//                         // console.log(sql.sql)
//                         conn.release();
//                         if (!err) {
//                             val.push(result[0]);
//                             res.send(JSON.stringify(finalresult));
//                         }
//                     });
//                 } else {
//                     conn.release();
//                 }
//             });
//         }
//     });
// });
vendordet.post('/listvendordet', function (req, res, err) {
    var where = '', jwtdata = req.jwt_data, sql, sqlquery = 'SELECT h.hdname,v.vendor_name,v_det.vendordetid, v_det.vendorid,v_det.loc,v_det.mobile1,v_det.mobile2,v_det.email,v_det.addr, ' +
           'v_det.gst,v_det.cin,v_det.gst_type,v_det.i_gst,v_det.c_gst,v_det.s_gst,v_det.descr,v_det.`status`,v_det.contact_person ' +
           'FROM smsv2.`vendor` AS v,smsv2.`vendor_det` AS v_det ' +
            'INNER JOIN smsv2.hd h ON v_det.hdid=h.hdid ' +
            'WHERE v.vendorid = v_det.vendorid   ',
        sqlqueryc = 'SELECT COUNT(*) AS count ' +
                'FROM smsv2.`vendor` AS v,smsv2.`vendor_det` AS v_det ' +
              'INNER JOIN smsv2.hd h ON v_det.hdid=h.hdid ' +
                'WHERE v.vendorid = v_det.vendorid'
        , finalresult = [], data = req.body;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where += (` AND v_det.hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where +=(` AND v_det.hdid= ${jwtdata.hdid} `);
    if (where != '') {
        sqlquery += where;
        sqlqueryc += where;
    }
    if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
    console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
    console.log('data', data)
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release(); result
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
async function editvendordet(req) {
    console.log('Add Broadcaster Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data,alog='';
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let hdid = '';
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 22 });
					await conn.rollback();
                }
                console.log('Data', data);
                let chkprofile="SELECT *  FROM smsv2.`vendor_det` WHERE  vendordetid =" + data.id
                    // console.log(chkprofile);
                let checkprofile = await conn.query(chkprofile);
                // console.log('checkprofile',checkprofile)
                if(checkprofile[0].length == 1) {
                  let  cvd=checkprofile[0][0];
                    let status = data.status == true ? 1 : 0;
                    data.addr = data.addr.replace("'", ' ');
                    let addhd = `UPDATE  smsv2.vendor_det SET   mobile1=${data.mobile1}, email='${data.email}',addr='${data.addr}',cin=${data.cin},gst_type=${data.gst_type},
                    i_gst=${data.i_gst},c_gst=${data.c_gst},s_gst=${data.s_gst},status=${status},modified_by=${jwtdata.id}`;

                    if (data.descr != '' && data.descr != null) addhd += ",`descr`='" + data.descr + "' ";

                    if (data.gst_type == 1) {
                        addhd += ` ,c_gst=${data.c_gst},s_gst=${data.s_gst}`
                    } else {
                        addhd += `,i_gst=${data.i_gst}`
                    }

                    if (cvd.hdid != hdid) {
						let [checkvendor] = await conn.query(`SELECT * FROM smsv2.vendor_det WHERE contact_person='${data.contact_person}' and hdid=${hdid} and vendorid =${data.vendorid} and  loc='${data.loc}' and gst='${data.gst}'`);
						console.log('checkvendor : ', checkvendor);
						if (checkvendor.length == 1) {
							erroraray.push({ msg: "   This Headend Already Available .", err_code: 78 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) cvd from 
														(select hdname from hd where hdid=${cvd.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addhd += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].cvd}.`
						}

					}
                    if (cvd.vendorid != data.vendorid) {
						let [checkvendor] = await conn.query(`SELECT * FROM smsv2.vendor_det WHERE contact_person='${data.contact_person}' and hdid=${hdid} and vendorid =${data.vendorid} and  loc='${data.loc}' and gst='${data.gst}'`);
						console.log('checkvendor : ', checkvendor);
						if (checkvendor.length == 1) {
							erroraray.push({ msg: "Vendor Already Available In This Headend.", err_code: 78 });
							await conn.rollback();
						} else {
							let checkvendorid = ` select concat(' From ',a.vendor_name,' TO ',b.vendor_name) cvd from 
														(select vendor_name from vendor where vendorid=${cvd.vendorid} ) a
														,(select vendor_name from vendor where vendorid=${data.vendorid} ) b `;
							checkvendorid = await conn.query(checkvendorid);
							addhd += ` ,vendorid='${data.vendorid}'`;
							alog += ` Vendor  Changed ${checkvendorid[0][0].cvd}.`
						}

					}
                    if (cvd.loc != data.loc) {
						let [checkvendor] = await conn.query(`SELECT * FROM smsv2.vendor_det WHERE contact_person='${data.contact_person}' and hdid=${hdid} and vendorid =${data.vendorid} and  loc='${data.loc}'and gst='${data.gst}'`);
						console.log('checkvendor : ', checkvendor);
						if (checkvendor.length == 1) {
							erroraray.push({ msg: "Vendor Location Already Available In This Headend.", err_code: 183 });
							await conn.rollback();
						} else {
							
							addhd += ` ,loc='${data.loc}'`;
							alog += ` Loacation  Changed from ${cvd.loc}' to '${data.loc}.`
						}

					}
                    if (cvd.contact_person != data.contact_person) {
						let [checkvendor] = await conn.query(`SELECT * FROM smsv2.vendor_det WHERE contact_person='${data.contact_person}' and hdid=${hdid} and vendorid =${data.vendorid} and  loc='${data.loc}'and gst='${data.gst}'`);
						console.log('checkvendor : ', checkvendor);
						if (checkvendor.length == 1) {
							erroraray.push({ msg: "Vendor Already Available In This Headend.", err_code: 196 });
							await conn.rollback();
						} else {
							
							addhd += ` ,contact_person='${data.contact_person}'`;
							alog += ` VendorName  Changed from ${cvd.contact_person}to ${data.contact_person}.`
						}

					}
                    if (cvd.gst != data.gst) {
						let [checkvendor] = await conn.query(`SELECT * FROM smsv2.vendor_det WHERE contact_person='${data.contact_person}' and hdid=${hdid} and vendorid =${data.vendorid} and  loc='${data.loc}' and gst='${data.gst}'`);
						console.log('checkvendor : ', checkvendor);
						if (checkvendor.length == 1) {
							erroraray.push({ msg: "GST Already Available In This Headend.", err_code: 78 });
							await conn.rollback();
						} else {
							
							addhd += ` ,gst='${data.gst}'`;
							alog += ` GST Changed from ${cvd.gst} to ${data.gst}.`
						}

					}
                    addhd += ' WHERE vendordetid =' + data.id
                    console.log('Edit Broadcast Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO  smsv2.activitylog SET table_id='UPDATE VENDOR DETAIL',`longtext`=' " + alog + "  DONE BY',hdid="+hdid+",usertype="+jwtdata.role+",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Vendor Detail Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 229 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: "Location Already exists.", err_code: 233 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                console.log(e)
                erroraray.push({ msg: 'Please try after sometimes Error', err_code: 'ERR' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 246 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

vendordet.post('/addvendordet', async (req, res) => {
    req.setTimeout(864000000);

    const validation = joiValidate.vendordetDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await addvendordet(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});
vendordet.post('/editvendordet', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.editvendordetDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await editvendordet(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));

});
vendordet.post('/getvendordet', function (req, res) {

    var where = [], jwtdata = req.jwt_data, data = req.body,
        sql, sqlquery = 'SELECT * FROM smsv2.vendor_det'
        if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid} `);
        if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);
        if (data.vendordetid != '' && data.vendordetid != null) where.push (`  vendordetid= ${data.vendordetid} `);
        if (where.length > 0) {
            where = ' WHERE' + where.join(' AND ');
            sqlquery += where;
            
        }
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, data.id, function (err, result) {
                // console.log(id,"++++++++++");
                console.log('get vendor detail', sql.sql);
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                    console.log(result[0], "--------");
                }
            });
        }
    });
});
// vendordet.post('/addvendordet', function (req, res) {
//     var sql, data = req.body, insertdata, jwt_data = req.jwt_data;

//     console.log(data ,'fefewteesdf')

//     insertdata = {

//         contact_person: data.contact_person,
//         vendorid:data.vendorid,
//         loc: data.loc,
//         mobile1:data.mobile1,
//         mobile2:data.mobile2 == '' ? null : data.mobile2,
//         email:data.email,
//         addr:data.addr,
//         gst:data.gst,
//         cin:data.cin,
//         gst_type:data.gst_type,
//         i_gst: data.i_gst,
//         c_gst: data.c_gst,
//         s_gst: data.s_gst,
//         descr: data.descr,
//         status: data.status ? 1 : 0,
//         created_by: jwt_data.id
//     };
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log('Error');
//         } else {
//             sql = conn.query('INSERT INTO smsv2.`vendor_det` SET ? ', insertdata, function (err) {
//                 if (err) {
//                     Errorhandle('Vendor Info Not Created');
//                     console.log(sql.sql);
//                 } else {
//                     Errorhandle('Vendor Info Created Successfully', 1);
//                 }
//             });
//         }
//         function Errorhandle(msg, status = 0) {
//             conn.release();
//             console.log(sql.sql)
//             res.end(JSON.stringify({ msg: msg, status: status }));
//             // log.activeLogs ("Add Vendor Detail", data, msg   ,"created_by=" + jwtdata.id, err, req.ip);
//         }
//     });
// });

//*****************************************HSN*******************************************//


// vendordet.post('/addhsn', function (req, res) {
//     var sql, data = req.body, insertdata;
//     const jwt_data = req.jwt_data;
//     insertdata = {

//         hsn_num: data.hsn_num,
//         hsn_name: data.hsn_name,
//         status: data.status ? 1 : 0,
//         hdid: data.hdid,
//         created_by: jwt_data.id
//     };
//     console.log(data, 'jhbhbvhbhbh')
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log('Error');
//         } else {
//             sql = conn.query('SELECT EXISTS(SELECT * FROM smsv2.hsn_num WHERE hsn_num = ? OR hsn_name=?  )AS COUNT', [data.hsn_num, data.hsn_name], function (err, result) {
//                 if (!err) {
//                     if (result[0].COUNT == 0) {
//                         sql = conn.query('INSERT INTO smsv2.hsn_num SET ?', insertdata, function (err) {
//                             if (err) {
//                                 console.log(' HSN   in f', sql.sql)
//                                 Errorhandle('HSN  not Created');

//                             } else {
//                                 Errorhandle('HSN  Created Successfully', 1);


//                             }
//                         });
//                     } else {
//                         Errorhandle('HSN  Already Exist');
//                     }
//                 } else {
//                     Errorhandle('Pls Contact Admin')
//                 }
//             });
//         }
//         function Errorhandle(msg, status = 0) {
//             conn.release();
//             res.end(JSON.stringify({ msg: msg, status: status }));
//         }
//     });
// });
// async function addhsn(req) {
//     console.log('Add vendordetail Data:', req.jwt_data);
//     return new Promise(async (resolve, reject) => {
//         var erroraray = [], data = req.body, jwtdata = req.jwt_data;
//         let conn = await poolPromise.getConnection();
//         if (conn) {
//             await conn.beginTransaction();
//             try {
//                 console.log('Data', data);
//                 let checkprofile = await conn.query("SELECT COUNT(*) cnt smsv2.hsn_num WHERE hsn_num='" + data.hsn_num + "' OR  hsn_name ='" + data.hsn_name + "'");
//                 if (checkprofile[0][0]['cnt'] == 0) {
//                     let status = data.status == true ? 1 : 0;
//                     data.addr = data.addr.replace("'", ' ');
//                     let addhd = `INSERT INTO smsv2.hsn_num SET 
//                          hsn_num=${data.hsn_num}, 
//                          hsn_name ='${data.hsn_name}',
//                          status=${data.status},
//                          created_by=${jwtdata.id}`;
//                     console.log('ADD Hsn Query: ', addhd);
//                     addhd = await conn.query(addhd);
//                     if (addhd[0]['affectedRows'] > 0) {
//                         let sqllog = "INSERT INTO smsv2.activitylog SET table_id=' hsn detail',`longtext`='DONE BY',cby=" + jwtdata.id;
//                         sqllog = await conn.query(sqllog);
//                         if (sqllog[0]['affectedRows'] > 0) {
//                             erroraray.push({ msg: " hsn deatil created Succesfully", err_code: 0 });
//                             await conn.commit();
//                         }
//                     } else {
//                         erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
//                         await conn.rollback();
//                     }
//                 } else {
//                     erroraray.push({ msg: " hsn detail ID Already Exists.", err_code: 1111 });
//                     await conn.rollback();
//                 }
//             } catch (e) {
//                 console.log('Error ', e);
//                 erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
//                 await conn.rollback();
//             }
//             console.log('Success--1');
//             console.log('connection Closed.');
//             conn.release();
//         } else {
//             erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
//             return;
//         }
//         console.log('success--2');
//         return resolve(erroraray);
//     });
// }
// vendordet.post('/listhsn', function (req, res, err) {
//     var sql, sqlquery = 'SELECT hsn.hsn_id,hsn.hsn_num,hsn.hsn_name,hsn.status,h.hdname,h.hdid FROM `smsv2`.hsn_num hsn LEFT JOIN smsv2.hd h ON  hsn.hdid=h.hdid LIMIT ?,? ',
//         sqlqueryc = ' SELECT COUNT(*) AS count FROM `smsv2`.hsn_num hsn LEFT JOIN smsv2.hd h ON  hsn.hdid=h.hdid', finalresult = [],
//         data = req.body;
//     pool.getConnection(function (err, conn) {
//         if (!err) {
//             sql = conn.query(sqlquery, [data.index, data.limit], function (err, result) {
//                 if (!err) {
//                     finalresult.push(result);
//                     sql = conn.query(sqlqueryc, function (err, result) {
//                         conn.release();
//                         if (!err) {
//                             finalresult.push(result[0]);
//                             res.end(JSON.stringify(finalresult));
//                         } else {
//                             console.log('err');
//                         }
//                     });
//                 } else {
//                     conn.release();
//                 }
//             });
//         }
//     });
// });


// vendordet.post('/edithsn', function (req, res) {
//     var sql, data = req.body, updatesata, jwt_data = req.jwt_data;

//     updatesata = [
//         data.hsn_num,
//         data.hsn_name,
//         data.status ? 1 : 0,
//         data.hdid,
//         jwt_data.id,
//         data.hsn_id

//     ];
//     console.log('fvjdrhgjhh', data)
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log('Error');
//         } else {
//             sql = conn.query('SELECT EXISTS(SELECT * FROM smsv2.`hsn_num` WHERE hsn_num = ? AND  hsn_name=? AND hdid=? AND hsn_id!=?)AS COUNT', [data.hsn_num, data.hsn_name, data.hdid, data.hsn_id], function (err, result) {
//                 if (!err) {
//                     if (result[0].COUNT == 0) {
//                         sql = conn.query('UPDATE smsv2.`hsn_num` SET hsn_num=?,hsn_name=?,status=?,hdid=?,modified_by=? WHERE hsn_id=?', updatesata, function (err) {
//                             console.log('HSN  update', sql.sql);
//                             if (err) {
//                                 // console.log('HSN  update', sql.sql);
//                                 Errorhandle('HSN Number not Update');
//                             } else {
//                                 Errorhandle('HSN Number Updated Successfully', 1);

//                             }
//                         });
//                     } else {
//                         Errorhandle('HSN Number Already Exist');
//                         console.log(sql.sql)
//                     }
//                 } else {
//                     Errorhandle('Pls Contact Admin')
//                     console.log(sql.sql)
//                 }
//             });
//         }
//         function Errorhandle(msg, status = 0) {
//             conn.release();
//             res.end(JSON.stringify({ msg: msg, status: status }));
//         }
//     });
// });
// async function edithsn(req) {
//     console.log('Add Broadcaster Data:', req.jwt_data);
//     return new Promise(async (resolve, reject) => {
//         var erroraray = [], data = req.body, jwtdata = req.jwt_data;
//         let conn = await poolPromise.getConnection();
//         if (conn) {
//             await conn.beginTransaction();
//             try {
//                 console.log('Data', data);
//                 let checkprofile = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`hsn_num` WHERE hsn_num'" + data.vendorid + "' AND hdid=" + data.hdid + " ");
//                 if (checkprofile[0][0]['cnt'] == 0) {
//                     let status = data.status == true ? 1 : 0;
//                     data.addr = data.addr.replace("'", ' ');
//                     let addhd = `UPDATE  smsv2.vendor_det SET 
//                     hsn_num=${data.hsn_num}, 
//                     hsn_name =${data.hsn_name},
//                     status=${data.status},  
//                     modified_by=${jwtdata.id}`;
//                     addhd += ' WHERE hsn_id =' + data.hsn_id
//                     console.log('Edit Broadcast Query: ', addhd);
//                     addhd = await conn.query(addhd);
//                     if (addhd[0]['affectedRows'] > 0) {
//                         let sqllog = "INSERT INTO  smsv2.activitylog SET table_id='UPDATE hsn Detail',`longtext`='DONE BY',cby=" + jwtdata.id;
//                         sqllog = await conn.query(sqllog);
//                         if (sqllog[0]['affectedRows'] > 0) {
//                             erroraray.push({ msg: " hsn detail Updated Succesfully", err_code: 0 });
//                             await conn.commit();
//                         }
//                     } else {
//                         erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
//                         await conn.rollback();
//                     }
//                 } else {
//                     erroraray.push({ msg: "hsn Already exists.", err_code: 1111 });
//                     await conn.rollback();
//                 }
//             } catch (e) {
//                 console.log('Error ', e);
//                 console.log(e)
//                 erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
//                 await conn.rollback();
//             }
//             console.log('Success--1');
//             console.log('connection Closed.');
//             conn.release();
//         } else {
//             erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
//             return;
//         }
//         console.log('success--2');
//         return resolve(erroraray);
//     });
// }


// vendordet.post('/gethsn', function (req, res) {
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log(err);
//         } else {
//             var sql = conn.query('SELECT  hsn_id,hsn_name FROM smsv2.`hsn_num`', function (err, result) {
//                 conn.release();
//                 if (!err) {
//                     res.end(JSON.stringify(result));
//                 }
//             });
//         }
//     });
// });
// vendordet.post('/addhsn', async (req, res) => {
//     req.setTimeout(864000000);

//     const validation = joiValidate.hsnDataSchema.validate(req.body);
//     if (validation.error) {
//         console.log(validation.error.details);
//         // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
//         return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
//     }
//     let result = await addhsn(req);
//     console.log("Process Completed", result);
//     res.end(JSON.stringify(result));
// });
// vendordet.post('/edithsn', async (req, res) => {
//     req.setTimeout(864000000);
//     const validation = joiValidate.edithsnDataSchema.validate(req.body);
//     if (validation.error) {
//         console.log(validation.error.details);
//         return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
//     }
//     let result = await edithsn(req);
//     console.log("Process Completed", result);
//     res.end(JSON.stringify(result));

// });


//*******************************************************************STOCK*************************************************************//
// async function addstock(req) {
//     console.log('Add Stock Data:', req.jwt_data);
//     return new Promise(async (resolve, reject) => {
//         var erroraray = [], data = req.body, jwtdata = req.jwt_data;
//         let conn = await poolPromise.getConnection();
//         if (conn) {
//             await conn.beginTransaction();
//             try {
//                 console.log('stock Data', data);
//                 let checkstock = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE  hdid=${data.hdid} AND invoiceno=${data.invoiceno} `);
//                 if (checkstock[0].length == 0) {
//                     // let tax = data.enable_tax == true ? 1 : 0;
//                     let addpack = `INSERT INTO smsv2.stock_inward SET  
//                     hdid=${data.hdid},
// 					invoiceno=${data.invoiceno},
//                     invoice_date='${data.invoice_date}',
// 					location=${data.location},
// 					warranty_type= ${data.warranty_type},
// 					warranty_period=${data.warranty_period} ,
// 					vendorid=${data.vendorid},
// 					hsnid=${data.hsnid},
// 					created_by=${jwtdata.id}`;
//                     addpack = await conn.query(addpack);
//                     if (addpack[0]['affectedRows'] > 0) {
//                         let stockinid = addpack[0].insertId
//                         // if (data.srvtype != 3) {
//                         for (let pid = 0; pid < data.stockinid.length; pid++) {
//                             const p = data.stockinid[pid];
//                             console.log('----------', p);

//                             console.log('-------', checkstock[0].length);
//                             if (checkstock[0].length == 0) {
//                                 let addprod = `INSERT INTO smsv2.material_detail set  hdid=${data.hdid}, stockinid=${stockinid}, boxmodelid=${p.boxmodelid},qty=${p.qty},price=${p.price},created_by=${jwtdata.id} `;
//                                 addprod = await conn.query(addprod);
//                                 if (addprod[0]['affectedRows'] == 0) {
//                                     erroraray.push({ msg: " Product ID:" + p.productid + " Stock ID Not Added.", err_code: 74 });
//                                     await conn.rollback();
//                                     continue;
//                                 }
//                             } else {
//                                 //prodect id already available
//                                 console.log('prodect id already available');
//                                 erroraray.push({ msg: " Product ID:(" + p.productid + ") Exits.", err_code: 74 });
//                                 await conn.rollback();
//                                 continue;
//                             }
//                         }
//                         // }
//                     } else {
//                         erroraray.push({ msg: "Please Check Stock ID", err_code: 1111 });
//                         await conn.rollback();
//                     }

//                     if (addpack[0]['affectedRows'] > 0) {
//                         let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD stock',`longtext`='DONE BY',cby=" + jwtdata.id;
//                         sqllog = await conn.query(sqllog);
//                         if (sqllog[0]['affectedRows'] > 0) {
//                             erroraray.push({ msg: " Stock ID Created Succesfully", err_code: 0 });
//                             await conn.commit();
//                         }
//                     } else {
//                         erroraray.push({ msg: "Please Check Stock ID", err_code: 1111 });
//                         await conn.rollback();
//                     }
//                 } else {
//                     erroraray.push({ msg: " Stock ID Already Exists.", err_code: 1111 });
//                     await conn.rollback();
//                 }
//             } catch (e) {
//                 console.log('Error ', e);
//                 erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })


//                 await conn.rollback();
//             }
//             console.log('Success--1');
//             console.log('connection Closed.');
//             conn.release();
//         } else {
//             erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
//             return;
//         }
//         console.log('success--2');
//         return resolve(erroraray);

//     });
// }
// vendordet.post('/listStock', function (req, res) {
//     // console.log(req.body)	
//     var sqlquery = `SELECT   s.stockinid,s.hdid,s.invoiceno,s.invoice_date,s.location,s.stocktype,s.warranty_type,s.warranty_period,
//     s.vendorid,s.hsnid,h.hdname,v.vendor_name,SUM(m.price) price FROM smsv2.stock_inward s 
//     INNER JOIN smsv2.material_detail m ON s.stockinid=m.stockinid
//     INNER JOIN smsv2.hd h ON s. hdid=h.hdid 
//     INNER JOIN smsv2.vendor v ON s.vendorid=v.vendorid
//     GROUP BY s.stockinid`,
//         data = req.body,
//         sqlqueryc = 'SELECT COUNT(*) COUNT FROM smsv2.stock_inward s  INNER JOIN smsv2.hd h ON s. hdid=h.hdid   INNER JOIN smsv2.vendor v ON s.vendorid=v.vendorid';
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log('Error');
//         } else {
//             // console.log(data)
//             var sql = conn.query(sqlquery, [data.index, data.limit], function (err, result) {
//                 // console.log(sql.sql)
//                 if (!err) {
//                     var val = [];
//                     val.push(result);
//                     sql = conn.query(sqlqueryc, function (err, result) {
//                         console.log(sql.sql)
//                         conn.release();
//                         if (!err) {
//                             val.push(result[0]);
//                             res.send(JSON.stringify(val));
//                         }
//                     });
//                 } else {
//                     conn.release();
//                 }
//             });
//         }
//     });
// });

// vendordet.post('/listmaterial', function (req, res) {
//     console.log(req.body)	
//     var sqlquery = `SELECT m.materialid,m.stockinid,m.boxmodelid,m.qty,m.price,(m.qty * m.price) amt ,v.modelname
//     FROM smsv2.material_detail m LEFT JOIN smsv2.boxmodel v ON m.boxmodelid = v.bmid`,
//         data = req.body,
//         sqlqueryc = 'SELECT COUNT(*) FROM smsv2.material_detail m LEFT JOIN smsv2.boxmodel v ON m.boxmodelid = v.bmid ';
    
//     if(data.stockinid){
//         sqlquery += ` where m.stockinid=${data.stockinid}`
//         sqlqueryc += ` where m.stockinid=${data.stockinid}`
//     }

//         pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log('Error');
//         } else {
//             console.log(data)
//             var sql = conn.query(sqlquery,  function (err, result) {
//                 console.log(sql.sql)
//                 if (!err) {
//                     var val = [];
//                     val.push(result);
//                     sql = conn.query(sqlqueryc, function (err, result) {
//                         console.log(sql.sql)
//                         conn.release();
//                         if (!err) {
//                             val.push(result[0]);
//                             res.send(JSON.stringify(val));
//                         }
//                     });
//                 } else {
//                     conn.release();
//                 }
//             });
//         }
//     });
// });




// vendordet.post('/geteditstock', function (req, res) {
//     var sql, sqlq, sqlm, value = [], data = req.body
//     console.log('data', data)
//     sqlq = `  SELECT stockinid, hdid,invoiceno,invoice_date,location,stocktype,warranty_type,warranty_period,vendorid,vendordetid,hsnid
//     FROM smsv2.stock_inward WHERE stockinid =` + data.stockinid;
//     sqlm = `  SELECT * FROM smsv2.material_detail WHERE stockinid =` + data.stockinid
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log(err);
//         } else {
//             sql = conn.query(sqlq, data, function (err, result) {
//                 if (!err) {
//                     value.push(result)
//                     // console.log('aa',value)
//                     sql = conn.query(sqlm, data, function (err, result) {
//                         conn.release()

//                         if (!err) {
//                             console.log('err')
//                             value.push(result)
//                             res.json(value)
//                         }
//                     });

//                 } else {
//                     conn.release()
//                 }
//             });
//         }
//     });
// });



// async function editstock(req) {
//     console.log('Edit Stock Data:', req.jwt_data);
//     return new Promise(async (resolve, reject) => {
//         var erroraray = [], data = req.body, jwtdata = req.jwt_data;
//         let conn = await poolPromise.getConnection();
//         if (conn) {
//             await conn.beginTransaction();
//             try {
//                 console.log('stock Data', data);
//                 let checkstock = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE  hdid=${data.hdid} AND invoiceno=${data.invoiceno} AND  stockinid != ${data.id} `);
//                 if (checkstock[0].length == 0) {
//                     // let tax = data.enable_tax == true ? 1 : 0;
//                     let addpack = `UPDATE  smsv2.stock_inward SET  
//                     hdid=${data.hdid},
// 					invoiceno=${data.invoiceno},
//                     invoice_date='${data.invoice_date}',
// 					location=${data.location},
// 					warranty_type= ${data.warranty_type},
// 					warranty_period=${data.warranty_period} ,
// 					vendorid=${data.vendorid},
// 					hsnid=${data.hsnid},
// 					modified_by=${jwtdata.id}`;
//                     addpack += ' WHERE stockinid =' + data.id
//                     addpack = await conn.query(addpack);
//                     if (addpack[0]['affectedRows'] > 0) {
                       
//                         // if (data.srvtype != 3) {
//                         for (let pid = 0; pid < data.stockinid.length; pid++) {
//                             const p = data.stockinid[pid];
//                             console.log('----------', p);

                      
//                                 let addprod = `UPDATE  smsv2.material_detail set stockinid=${data.id}, boxmodelid=${p.boxmodelid},qty=${p.qty},price=${p.price},modified_by=${jwtdata.id}  WHERE stockinid = ${data.id}  AND materialid= ${p.materialid} `;
//                                 addprod = await conn.query(addprod);
//                                 if (addprod[0]['affectedRows'] == 0) {
//                                     erroraray.push({ msg: " Product ID:" + p.productid + " Stock ID Not Added.", err_code: 74 });
//                                     await conn.rollback();
//                                     continue;
//                                 }
                           
//                         }
//                         // }
//                     } else {
//                         erroraray.push({ msg: "Please Check Stock ID", err_code: 1111 });
//                         await conn.rollback();
//                     }

//                     if (addpack[0]['affectedRows'] > 0) {
//                         let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE STOCK',`longtext`='DONE BY',cby=" + jwtdata.id;
//                         sqllog = await conn.query(sqllog);
//                         if (sqllog[0]['affectedRows'] > 0) {
//                             erroraray.push({ msg: " Stock ID Updated Succesfully", err_code: 0 });
//                             await conn.commit();
//                         }
//                     } else {
//                         erroraray.push({ msg: "Please Check Stock ID", err_code: 1111 });
//                         await conn.rollback();
//                     }
//                 } else {
//                     erroraray.push({ msg: " Invoice ID Already Exists.", err_code: 1111 });
//                     await conn.rollback();
//                 }
//             } catch (e) {
//                 console.log('Error ', e);
//                 erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })


//                 await conn.rollback();
//             }
//             console.log('Success--1');
//             console.log('connection Closed.');
//             conn.release();
//         } else {
//             erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
//             return;
//         }
//         console.log('success--2');
//         return resolve(erroraray);

//     });
// }




// vendordet.post('/addstock', async (req, res) => {
//     req.setTimeout(864000000);

//     // const validation = joiValidate.stockDataSchema.validate(req.body);
//     // if (validation.error) {
//     //     console.log(validation.error.details);
//     //     // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
//     //     return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
//     // }
//     let result = await addstock(req);
//     console.log("Process Completed", result);
//     res.end(JSON.stringify(result));
// });




// vendordet.post('/editstock', async (req, res) => {
//     req.setTimeout(864000000);
//     console.log('edit stock');
//     // const validation = joiValidate.editstockDataSchema.validate(req.body);
//     // if (validation.error) {
//     //     console.log(validation.error.details);
//     //     return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
//     // }
//     let result = await editstock(req);
//     console.log("Process Completed", result);
//     res.end(JSON.stringify(result));
// });


// vendordet.post('/getstockvendor', function (req, res) {
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log(err);
//         } else {
//             var sql = conn.query('SELECT vendorid ,vendor_name FROM smsv2.`vendor`', function (err, result) {
//                 conn.release();
//                 if (!err) {
//                     res.end(JSON.stringify(result));
//                 }
//             });
//         }
//     });
// });


// vendordet.post('/getstockmodel', function (req, res) {
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log(err);
//         } else {
//             var sql = conn.query('SELECT modelname,bmid FROM smsv2.`boxmodel`	', function (err, result) {
               
          

//                 conn.release();
//                 if (!err) {
//                     res.end(JSON.stringify(result));
//                 }
//             });
//         }
//     });
// });

// vendordet.post('/getstocklocation', function (req, res, err) {
//     var data = req.body, sqlquery = 'SELECT loc,vendordetid FROM smsv2.vendor_det ';

//     if (data.vendorid) {
//         sqlquery += ' WHERE vendorid =' + data.vendorid
//     }

//     pool.getConnection(function (err, conn) {
//         if (!err) {
//             var sql = conn.query(sqlquery, function (err, result) {
//                 console.log('sql', sql.sql);
//                 conn.release();
//                 if (!err) {
//                     res.send(JSON.stringify(result));
//                 }
//             });
//         }
//     });
// });


module.exports = vendordet;