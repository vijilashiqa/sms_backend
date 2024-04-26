
"use strict";
var express = require('express'),
    compress = require('compression'),
    operator = express.Router(),
    pool = require('../connection/conn');
const joiValidate = require('../schema/operator');
const multer = require('multer');




operator.post('/profilelistrole', function (req, res, err) {
    var where = '', jwtdata = req.jwt_data,sql, sqlquery = ` SELECT u.id,u.profileid,h.rolename,u.fullname FROM smsv2.users u 
    LEFT JOIN smsv2.hd_role h ON u.usertype=h.role WHERE u.usertype!=770 AND u.hdid=h.hdid  `,
        sqlqueryc = `SELECT COUNT(*) AS count FROM smsv2.users u 
        LEFT JOIN smsv2.hd_role h ON u.usertype=h.role WHERE u.usertype!=770 AND u.hdid=h.hdid`, finalresult = [],
        data = req.body;
        
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where += (`  u.hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where +=(` AND u.hdid= ${jwtdata.hdid} `);
    if (jwtdata.role > 777 && data.usertype != '' && data.usertype != null) where += (` u.usertype= ${data.usertype} `);
    if (jwtdata.role <= 777) where += (` AND  u.usertype< ${jwtdata.role} `);
        if (where != '') {
            sqlquery += where;
            sqlqueryc += where;
        }
    console.log(data, 'data h')
    if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
    console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
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
async function resetpasswaord(req) {
    console.log('update Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data, password_en;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                console.log('Data', data);

                let checkprofile = await conn.query("SELECT password FROM users WHERE  id=" + data.id + " ");
                console.log('checkprofile', checkprofile)
                if (checkprofile[0]['password'] == password_en) {
                    // let status = data.status == true ? 1 : 0;
                    let addbox = `UPDATE  smsv2.users SET password='${data.password_en}' WHERE id =` + data.id;
                    console.log('Update boxmodel Query: ', addbox);
                    addbox = await conn.query(addbox);
                    if (addbox[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE USERS',`longtext`='DONE BY',hdid=" + jwtdata.hdid + ",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Password Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 90 });
                        await conn.rollback();
                    }
                } else {
                    console.log('no data', checkprofile)
                    erroraray.push({ msg: " password already exits.", err_code: 95 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes', err_code: 'TRYE' });
                await conn.rollback();
            }
        } else {
            erroraray.push({ msg: 'Please try after ', err_code: 104 });
            return resolve(erroraray);
        }
        if (conn) conn.release();
        console.log('connection Closed.');
        return resolve(erroraray);
    });
}
operator.post('/resetpassword', async (req, res) => {
    req.setTimeout(864000000);
    let result = await resetpasswaord(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
})





operator.post('/listmso', function (req, res, err) {
    var where = '', jwtdata = req.jwt_data, sql, sqlquery = ' SELECT  us.id, h.hdname,r.rolename,us.profileid,us.fullname,us.business_name,us.mobile,us.email1,us.hdid FROM smsv2.users us  LEFT JOIN smsv2.hd h ON us.hdid=h.hdid  LEFT JOIN smsv2.role r ON us.usertype=r.role   ',
        sqlqueryc = 'SELECT COUNT(*) AS count FROM smsv2.users us  LEFT JOIN smsv2.hd h ON us.hdid=h.hdid  LEFT JOIN smsv2.role r ON us.usertype=r.role '
        , finalresult = [], data = req.body;
    sqlquery += ' WHERE us.usertype=777 OR us.usertype=775 ';
    sqlqueryc += ' WHERE us.usertype=777 OR us.usertype=775 ';

    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where += (` and  us.hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where +=(` and  us.hdid= ${jwtdata.hdid} `);
    if (jwtdata.role > 777 && data.usertype != '' && data.usertype != null) where += (` and  us.usertype= ${data.usertype} `);
    if (jwtdata.role <= 777) where += (` AND  us.usertype< ${jwtdata.role} `);
    if (jwtdata.role > 777 && data.id != '' && data.id != null) where += (` AND us.id= ${data.id} `);
    if (jwtdata.role <= 777) where += (` AND  us.id= ${jwtdata.id} `);
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


async function addoperator(req) {
    console.log('Add model Data:', req.jwt_data);
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
                    erroraray.push({ msg: "Please Select Headend.", err_code: 205 });
                    await conn.rollback();
                }
                console.log('model Data', data);

                let addoperator = await conn.query("SELECT EXISTS(SELECT * FROM users WHERE profileid = '" + data.profileid + "'  AND hdid=" + data.hdid + "  )AS count");
                if (addoperator[0][0]['count'] == 0) {
                    let taxpayby = data.taxpayby == true ? 1 : 0;
                    let share_imedate = data.share_imedate == true ? 1 : 0;
                    let holderflg = data.holderflg == true ? 1 : 0;
                    let addsflag = data.addsflag == true ? 1 : 0;
                    data.installation_addr = data.installation_addr.replace("'", ' ');
                    data.billing_addr = data.billing_addr.replace("'", ' ');
                    let addoperator = `INSERT INTO smsv2.users SET 
                        profileid='${data.profileid}',
                        hdid=${data.hdid},
                        fullname='${data.fullname}',
                        dob='${data.dob}',
                        gender=${data.gender},
                        password=md5('${data.password}'),
                        mobile=${data.mobile},
                        pincode=${data.pincode},
                        country=${data.country},
                        state=${data.state},
                        district=${data.district},
                        city=${data.city},
                        area=${data.area},
                        installation_addr='${data.installation_addr}',
                        billing_addr='${data.billing_addr}',
                        addsflag=${addsflag},
                        email1='${data.email}',
                        prooftype=${data.prooftype},
                        proofno='${data.proofno}',  
                        usertype=${data.usertype},
                        holderflg=${holderflg} ,                   
                        share_imedate=${share_imedate},
                        cby=${jwtdata.id}`;
                    // if (data.usertype == 1 ? data.lcoid : null) addoperator += `,lcoid='${data.lcoid}'`;
                    // if (data.usertype == 3 ? data.subdistid : null) addoperator += `,subdistid='${data.subdistid}'`;
                    // if (data.usertype == 2 ? data.distid : null) addoperator += `,distid='${data.distid}'`;
                    if (data.dist_or_sub_flg != '' && data.dist_or_sub_flg != null) addoperator += `,dist_or_sub_flg='${data.dist_or_sub_flg}'`;
                    if (data.mso_share != '' && data.mso_share != null) addoperator += `,mso_share='${data.mso_share}'`;
                    if (data.subcode != '' && data.subcode != null) addoperator += `,lcocode='${data.subcode}'`;
                    if (data.distributercode != '' && data.distributercode != null) addoperator += `,lcocode='${data.distributercode}'`;
                    if (data.lcoid != '' && data.lcoid != null) addoperator += `,lcoid='${data.lcoid}'`;
                    if (data.subdistid != '' && data.subdistid != null) addoperator += `,subdistid='${data.subdistid}'`;
                    if (data.distid != '' && data.distid != null) addoperator += `,distid='${data.distid}'`;
                    if (data.desc != '' && data.desc != null) addoperator += `,descs='${data.desc}'`;
                    if (data.phoneno != '' && data.phoneno != null) addoperator += `,phoneno='${data.phoneno}'`;
                    if (data.lcocode != '' && data.lcocode != null) addoperator += `,lcocode='${data.lcocode}'`;
                    if (data.sub_dist_share != '' && data.sub_dist_share != null) addoperator += `,sub_dist_share=${data.sub_dist_share}`;
                    if (data.lco_share != '' && data.lco_share != null) addoperator += `,lco_share=${data.lco_share}`;
                    if (data.dist_share != '' && data.dist_share != null) addoperator += `,dist_share=${data.dist_share}`;
                    if (data.hotel_share != '' && data.hotel_share != null) addoperator += `,hotel_share=${data.hotel_share}`;
                    if (data.folino != '' && data.folino != null) addoperator += `,foliono='${data.folino}'`;
                    if (data.email2 != '' && data.email2 != null) addoperator += `,email2='${data.email2}'`;
                    if (data.business_name != '' && data.business_name != null) addoperator += `,business_name='${data.business_name}'`;
                    if (data.subscription_start_date != '' && data.subscription_start_date != null) addoperator += `,subscrip_start_date='${data.subscription_start_date}'`;
                    if (data.subscription_end_date != '' && data.subscription_end_date != null) addoperator += `,subscrip_end_date='${data.subscription_end_date}'`;
                    if (data.postalregno != '' && data.postalregno != null) addoperator += `,postalregno='${data.postalregno}'`;
                    if (taxpayby != '' && taxpayby != null) addoperator += `,taxpayby=${taxpayby}`;
                    if (data.gstno != '' && data.gstno != null) addoperator += `,gstno='${data.gstno}'`;
                    if (data.panno != '' && data.panno != null) addoperator += `,panno='${data.panno}'`;
                    if (data.tanno != '' && data.tanno != null) addoperator += `,tanno='${data.tanno}'`;
                    if (data.srvtaxno != '' && data.srvtaxno != null) addoperator += `,srvtaxno='${data.srvtaxno}'`;
                    if (data.entertainmenttaxno != '' && data.entertainmenttaxno != null) addoperator += `,entertainmenttaxno='${data.entertainmenttaxno}'`;
                    // distr_code: data.operatortype == 2 ? data.distributercode : null,
                    // sub_dstr_code: data.operatortype == 3 ? data.subcode : null,
                    console.log('ADD operator Query: ', addoperator);
                    addoperator = await conn.query(addoperator);
                    if (addoperator[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD OPERATOR',`longtext`='DONE BY',hdid=" + data.hdid + ",usertype="+jwtdata.role+",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " User created Succesfully", err_code: 0 });
                            await conn.commit();
                        }

                    }

                    else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 236 });
                        await conn.rollback();
                    }

                } else {
                    erroraray.push({ msg: " User  Already Exists.", err_code: 241 });

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
            erroraray.push({ msg: 'Please try after sometimes', err_code: 255 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

operator.post('/addoperator', async (req, res) => {
    req.setTimeout(864000000);

    const validation = joiValidate.operatorDatachema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await addoperator(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

operator.post('/listoperator', function (req, res, err) {
    var where = '', jwtdata = req.jwt_data, sql, sqlquery = ' SELECT  us.id, h.hdname,r.rolename,us.profileid,us.fullname,us.business_name,us.mobile,us.email1,us.hdid,us.enablestatus FROM smsv2.users us  LEFT JOIN smsv2.hd h ON us.hdid=h.hdid  LEFT JOIN smsv2.role r ON us.usertype=r.role   ',
        sqlqueryc = 'SELECT COUNT(*) AS count FROM smsv2.users us  LEFT JOIN smsv2.hd h ON us.hdid=h.hdid  LEFT JOIN smsv2.role r ON us.usertype=r.role '
        , finalresult = [], data = req.body;               
    sqlquery += ' WHERE us.usertype not in (777,770,665,554,443,332,221,999) ';
    sqlqueryc += ' WHERE us.usertype not in (777,770,665,554,443,332,221,999) ';

    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where += (` AND us.hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where +=(` AND us.hdid= ${jwtdata.hdid} `);
    if (jwtdata.role > 777 && data.usertype != '' && data.usertype != null) where += (` AND us.usertype= ${data.usertype} `);
    if (jwtdata.role <= 777) where += (` AND  us.usertype < ${jwtdata.role} `);
    if (data.id != '' && data.id != null) where += (` AND us.id= ${data.id} `);
    if (jwtdata.role > 777 && data.status != '' && data.status != null) where += (` AND us.enablestatus= ${data.status} `);
    if (data.status) where += (` AND  us.enablestatus= ${data.status} `);
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

operator.post('/getuser', function (req, res) {
	console.log('getuser',req.body)
	var data = req.body, where = [], jwtdata = req.jwt_data,

		sqlquery = `SELECT id,hdid, profileid, depositamt FROM smsv2.users u WHERE u.usertype in (444,555,666) `;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` and  u.hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` and  u.hdid= ${jwtdata.hdid}`);
    if (data.hasOwnProperty('userid') && data.userid) where.push (` and u.id = ${data.userid} `)
    if (data.hasOwnProperty('like') && data.like) where.push (` and u.id LIKE '%${data.like}%'`);
	if (where.length > 0) {
		where = where.join(' AND ');
		sqlquery += where;
	}
	console.log('data', sqlquery)
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log(err);
		} else {
			var sql = conn.query(sqlquery, function (err, result) {

				conn.release();
				if (!err) {
					res.end(JSON.stringify(result));
				}
			});
		}
	});
});

operator.post('/searchoperator', function (req, res) {

    var where = [], jwtdata = req.jwt_data, sql, data = req.body,

        sqlquery = `SELECT id,profileid,fullname FROM smsv2.users WHERE  `;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);
    if (data.hasOwnProperty('usertype') && data.usertype) where.push (`  usertype = ${data.usertype} `)
    if (where.length > 0) {
		where = where.join(' AND ');
		sqlquery += where;
	}
     console.log('data',sqlquery);

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
async function editoperator(req) {
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
                    erroraray.push({ msg: "Please Select Headend.", err_code: 150 });
                    await conn.rollback();
                }
                console.log('User Data', data);
                let checkoperator = await conn.query(`SELECT * FROM smsv2.users WHERE   id= ${data.id} `);
                if (checkoperator[0].length == 1) {
                    let co = checkoperator[0][0];
                    let taxpayby = data.taxpayby == true ? 1 : 0;
                    let enablestatus = data.enablestatus == true ? 1 : 0;
                    let share_imedate = data.share_imedate == true ? 1 : 0;
                    let holderflg = data.holderflg == true ? 1 : 0;
                    let addsflag = data.addsflag == true ? 1 : 0;
                    data.installation_addr = data.installation_addr.replace("'", ' ');
                    data.billing_addr = data.billing_addr.replace("'", ' ');
                    let addoperator = `UPDATE  smsv2.users SET  
                    dob='${data.dob}',
                    gender=${data.gender},
                    password=md5('${data.password}'),
                    mobile=${data.mobile},
                    pincode=${data.pincode},
                    country=${data.country},
                    state=${data.state},
                    district=${data.district},
                    city=${data.city},
                    area=${data.area},
                    installation_addr='${data.installation_addr}',
                    billing_addr='${data.billing_addr}',
                    addsflag=${addsflag},
                    email1='${data.email}',
                    prooftype=${data.prooftype},
                    proofno='${data.proofno}',                       
                    enablestatus=${enablestatus},
                    holderflg=${holderflg},                   
                    share_imedate=${share_imedate},
                    lmby=${jwtdata.id}`;
                    if (data.dist_or_sub_flg != '' && data.dist_or_sub_flg != null) addoperator += `,dist_or_sub_flg='${data.dist_or_sub_flg}'`;
                    if (data.mso_share != '' && data.mso_share != null) addoperator += `,mso_share='${data.mso_share}'`;
                    if (data.lcoid != '' && data.lcoid != null) addoperator += `,lcoid='${data.lcoid}'`;
                    if (data.subdistid != data.subdistid != null) addoperator += `,subdistid='${data.subdistid}'`;
                    if (data.distid != '' && data.distid != null) addoperator += `,distid='${data.distid}'`;
                    if (data.hotel_share != '' && data.hotel_share != null) addoperator += `,hotel_share='${data.hotel_share}'`;
                    if (data.lcocode != '' && data.lcocode != null) addoperator += `,lcocode='${data.lcocode}'`;
                    if (data.subcode != '' && data.subcode != null) addoperator += `,lcocode='${data.subcode}'`;
                    if (data.distributercode != '' && data.distributercode != null) addoperator += `,lcocode='${data.distributercode}'`;
                    if (data.desc != '' && data.desc != null) addoperator += `,descs='${data.desc}'`;
                    if (data.phoneno != '' && data.phoneno != null) addoperator += `,phoneno='${data.phoneno}'`;
                    if (data.sub_dist_share != '' && data.sub_dist_share != null) addoperator += `,sub_dist_share=${data.sub_dist_share}`;
                    if (data.lco_share != '' && data.lco_share != null) addoperator += `,lco_share=${data.lco_share}`;
                    if (data.dist_share != '' && data.dist_share != null) addoperator += `,dist_share=${data.dist_share}`;
                    if (data.folino != '' && data.folino != null) addoperator += `,foliono='${data.folino}'`;
                    if (data.email2 != '' && data.email2 != null) addoperator += `,email2='${data.email2}'`;
                    if (data.business_name != '' && data.business_name != null) addoperator += `,business_name='${data.business_name}'`;
                    if (data.subscription_start_date != '' && data.subscription_start_date != null) addoperator += `,subscrip_start_date='${data.subscription_start_date}'`;
                    if (data.subscription_end_date != '' && data.subscription_end_date != null) addoperator += `,subscrip_end_date='${data.subscription_end_date}'`;
                    if (data.postalregno != '' && data.postalregno != null) addoperator += `,postalregno='${data.postalregno}'`;
                    if (taxpayby != '' && taxpayby != null) addoperator += `,taxpayby=${taxpayby}`;
                    if (data.gstno != '' && data.gstno != null) addoperator += `,gstno='${data.gstno}'`;
                    if (data.panno != '' && data.panno != null) addoperator += `,panno='${data.panno}'`;
                    if (data.tanno != '' && data.tanno != null) addoperator += `,tanno='${data.tanno}'`;
                    if (data.srvtaxno != '' && data.srvtaxno != null) addoperator += `,srvtaxno='${data.srvtaxno}'`;
                    if (data.entertainmenttaxno != '' && data.entertainmenttaxno != null) addoperator += `,entertainmenttaxno='${data.entertainmenttaxno}'`;

                    if (co.hdid != hdid) {
                        let [checkprofile] = await conn.query(`SELECT * FROM smsv2.users WHERE  hdid=${hdid} AND profileid='${data.profileid}'`);
                        console.log('checkprofile : ', checkprofile);
                        if (checkprofile.length == 1) {
                            erroraray.push({ msg: " Headend Already Exits.", err_code: 427 });
                            await conn.rollback();
                        } else {
                            let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) co from 
														(select hdname from hd where hdid=${co.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
                            checkhdid = await conn.query(checkhdid);
                            addoperator += ` ,hdid='${hdid}'`;
                            alog += ` Headend  Changed ${checkhdid[0][0].co}.`
                        }

                    }
                    if (co.profileid != data.profileid) {
                        let [checkprofile] = await conn.query(`SELECT * FROM smsv2.users WHERE  hdid=${hdid} AND profileid='${data.profileid}'`);
                        console.log('checkprofile : ', checkprofile);
                        if (checkprofile.length == 1) {
                            erroraray.push({ msg: " Profile Id Already Exists .", err_code: 443 });
                            await conn.rollback();
                        } else {

                            addoperator += ` ,profileid='${data.profileid}'`;
                            alog += ` Profile Id   Changed  from ${co.profileid} to ${data.profileid}.`
                        }

                    }
                    if (co.usertype != data.usertype) {
                        let checkrole = ` select concat(' From ',a.rolename,' TO ',b.rolename) co from 
                        (select rolename from hd_role where role=${co.usertype} ) a
                        ,(select rolename from hd_role where role=${data.usertype} ) b `;
                        checkrole = await conn.query(checkrole);
                        addoperator += ` ,usertype='${data.usertype}'`;
                        alog += ` Operator Changed  from ${checkrole[0][0].co} .`
                    }
                    if (co.fullname != data.fullname) {
                        addoperator += ` ,fullname='${data.fullname}'`;
                        alog += ` Name Changed  from ${co.fullname} to ${data.fullname}.`
                    }
                    if (co.lcoid != data.lcoid) {
                        addoperator += ` ,lcoid='${data.lcoid}'`;
                        alog += ` LCO  Changed  from ${co.lcoid} to ${data.lcoid}.`
                    }
                    if (co.subdistid != data.subdistid) {
                        addoperator += ` ,subdistid='${data.subdistid}'`;
                        alog += ` Subdistributor   Changed  from ${co.subdistid} to ${data.subdistid}.`
                    }
                    if (co.distid != data.distid) {
                        addoperator += ` ,distid='${data.distid}'`;
                        alog += ` Distributor   Changed  from ${co.distid} to ${data.distid}.`
                    }
                    if (co.lco_share != data.lco_share) {
                        addoperator += ` ,lco_share='${data.lco_share}'`;
                        alog += ` LCO Share   Changed  from ${co.lco_share} to ${data.lco_share}.`
                    }
                    if (co.dist_share != data.dist_share) {
                        addoperator += ` ,dist_share='${data.dist_share}'`;
                        alog += ` Distributor Share  Changed  from ${co.dist_share} to ${data.dist_share}.`
                    }
                    if (co.mso_share != data.mso_share) {
                        addoperator += ` ,mso_share='${data.mso_share}'`;
                        alog += ` MSO Share  Changed  from ${co.mso_share} to ${data.mso_share}.`
                    }
                    if (co.sub_dist_share != data.sub_dist_share) {
                        addoperator += ` ,sub_dist_share='${data.sub_dist_share}'`;
                        alog += ` sub_dist_share   Changed  from ${co.sub_dist_share} to ${data.sub_dist_share}.`
                    }
                    addoperator += ' WHERE id =' + data.id
                    addoperator = await conn.query(addoperator);
                 

                    if (addoperator[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE USER',`longtext`='" + alog + " DONE BY',hdid=" + hdid + ",usertype ="+jwtdata.role+", cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Operator Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Please Check User ID", err_code: 504 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " Operator Already Exists.", err_code: 508 });
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
            erroraray.push({ msg: 'Please try after sometimes', err_code: 522 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);

    });

}


operator.post('/editoperator', async (req, res) => {
    req.setTimeout(864000000);

    const validation = joiValidate.editoperatorDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await editoperator(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});


operator.post('/geteditoperator', function (req, res) {
    console.log('Get operator');
    var data = req.body,jwtdata=req.jwt_data,where=[],
        sql, sqlquery = 'SELECT * FROM smsv2.users where id=' + data.id;
        if(jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` AND hdid=${data.hdid}`);
        if(jwtdata.role <= 777) where.push(`AND  hdid=${jwtdata.hdid}`);
        if(where.length > 0){
            where = where.join (' AND ');
            sqlquery+= where;
        }

    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                console.log('get operator id', sql.sql);
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                }
            });
        }
    });
});


operator.post('/assignusercas', function (req, res) {
    // const validation = joiValidate.editlangDataSchema.validate(req.body);
    // if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
    var sql, data = req.body, updatesata;

    updatesata = [
        data.hdcasid.toString(),
        data.hdid,
        data.id

    ];
    console.log(data)
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('Error');
        } else {
            sql = conn.query('SELECT EXISTS(SELECT * FROM smsv2.users WHERE  hdid!=? AND  id=?)AS COUNT', [data.hdid, data.id], function (err, result) {
                if (!err) {
                    if (result[0].COUNT == 0) {
                        sql = conn.query('UPDATE  smsv2.users SET   hdcasid = ?,hdid=? WHERE  id=? ', updatesata, function (err) {
                            if (err) {
                                console.log(sql.sql)
                                Errorhandle('HD Cas  not Update');
                            } else {
                                console.log(sql.sql)
                                Errorhandle('HD Cas Updated Successfully', 1);

                            }
                        });
                    } else {
                        Errorhandle('HD CAS Already Exist');
                    }
                } else {
                    console.log(sql.sql)
                    Errorhandle('Pls Contact Admin')
                }
            });
        }
        function Errorhandle(msg, err_code = 0) {
            conn.release();
            res.end(JSON.stringify({ msg: msg, err_code: err_code }));
        }
    });
});

operator.post('/gethdcas', function (req, res, err) {
    var data = req.body,jwtdata=req.jwt_data,where=[],
        sql, sqlquery = `SELECT hc.hdcasid,hc.cas_name,IF(FIND_IN_SET(hc.hdcasid,u.hdcasid)!=0,1,0) casstatus FROM hd_cas hc INNER JOIN users u ON hc.hdid=u.hdid WHERE u.id=${data.id}   `,
        sqlqueryc = `SELECT count(*) count
         FROM  hd_cas hc INNER JOIN users u ON hc.hdid=u.hdid WHERE u.id=${data.id}  `, finalresult = [];

         if(jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` AND hc.hdid=${data.hdid}`);
         if(jwtdata.role <= 777) where.push(` and  hc.hdid=${jwtdata.hdid}`);
         if(where.length > 0){
             where = where.join (' AND ');
             sqlquery+= where;
             sqlqueryc+= where;
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

operator.post('/getlcooperator', function (req, res, err) {
    var data = req.body,jwtdata=req.jwt_data,where=[],
        sql, sqlquery = `SELECT id,lcoid,distid, subdistid,dist_or_sub_flg,lcocode,business_name,profileid FROM smsv2.users WHERE usertype=444  `,
        sqlqueryc = `SELECT count(*) count
        FROM smsv2.users WHERE usertype=444  `, finalresult = [];
        if(jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` AND hdid=${data.hdid}`);
        if(jwtdata.role <= 777) where.push(` and  hdid=${jwtdata.hdid}`);
        if(where.length > 0){
            where = where.join (' AND ');
            sqlquery+= where;
            sqlqueryc+= where;
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
operator.post("/getprofilerole", (req, res) => {
    let jwtdata = req.jwt_data, sqlg, data = req.body;
    console.log("Data--", data);
    pool.getConnection((err, con) => {
        let sqlpr = `select id,profileid,menurole from smsv2.users  where id =${data.id}`;
        if (jwtdata.role <= 777) sqlpr += ` AND hdid =${jwtdata.hdid} `;
        console.log("Query---", sqlpr);
        if (data.id) {
            sqlg = con.query(sqlpr, data.id, (err, result) => {
                con.release();
                if (err) {
                    console.log(err);
                } else {
                    console.log(result)
                    res.send(JSON.stringify(result));
                }
            });
        }
        else {
            errorvalue.push({ msg: "Please Try After Sometimes", err_code: 103 });

        }
    });
});
operator.post("/getuserprofilerole", (req, res) => {
    let jwtdata = req.jwt_data, sqlg, data = req.body;
    console.log("Data--", data);
    pool.getConnection((err, con) => {
        let sqlpr = `select id,profileid,menurole from smsv2.users  where id =${data.id}`;
        if (jwtdata.role <= 777) sqlpr += ` AND h.hdid =${jwtdata.hdid} `;
        console.log("Query---", sqlpr);
        if (data.id) {
            sqlg = con.query(sqlpr, data.id, (err, result) => {
                con.release();
                if (err) {
                    console.log(err);
                } else {
                    console.log(result)
                    res.send(JSON.stringify(result));
                }
            });
        }
        else {
            errorvalue.push({ msg: "Please Try After Sometimes", err_code: 103 });

        }
    });
});
async function profileeditrole(req, res) {
    return new Promise(async (resolve, reject) => {
        let data = req.body, jwtdata = req.jwt_data, conn, erroraray = [], insertdata = { menurole: JSON.stringify(data.menurole), };
        try {
            let hdid = '';
            if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
            if (jwtdata.role <= 777) hdid = jwtdata.hdid;
            conn = await poolPromise.getConnection();
            if (conn) {
                await conn.beginTransaction();
                console.log("update", data);
                let sqlq = `select exists(select * from smsv2.users where id ='${data.id}' `;
                if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') sqlq += ` AND hdid=${hdid} `;
                sqlq += ` ) count `;
                console.log("project query", sqlq);
                let resp = await conn.query(sqlq);
                console.log("result", resp);
                if (resp[0][0].count == 0) {
                    erroraray.push({ msg: "No Data Found", err_code: 1 });
                    await conn.rollback();
                } else {
                    let sqlupdate = `update smsv2.users set profileid='${data.profileid}',menurole='${insertdata.menurole}' where id ='${data.id}' `;
                    if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') sqlupdate += ` AND hdid=${hdid} `;
                    console.log("update query", sqlupdate);
                    let result = await conn.query(sqlupdate, data);
                    console.log("result", result);
                    if (result[0]["affectedRows"] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='EDIT USER MENU ROLE',`longtext`='DONE BY',hdid=" + jwtdata.hdid + ",usertype="+jwtdata.role+",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: "Edit Menu Role Succesfully Updated.", err_code: 0 });
                            await conn.commit();
                        } else {
                            erroraray.push({ msg: "Audit Log Cant Add.", err_code: 1111 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Please Try After Sometimes", err_code: 1111 });
                        await conn.rollback();
                    }
                }
            } else {
                erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
                await conn.rollback();
            }
        } catch (e) {
            console.log("Catch Block Error", e);
            erroraray.push({ msg: "Please try after sometimes", error_msg: "TRYE" });
            await conn.rollback();
        }
        if (conn) conn.release();
        return resolve(erroraray)
    });
}

operator.post("/profileeditrole", async (req, res) => {
    console.log(req.body);
    req.setTimeout(864000000);
    let result = await profileeditrole(req);
    res.end(JSON.stringify(result));
}
);
async function userprofileeditrole(req, res) {
    return new Promise(async (resolve, reject) => {
        let data = req.body, jwtdata = req.jwt_data, conn, erroraray = [], insertdata = { menurole: JSON.stringify(data.menurole), };
        try {
            let hdid = '';
            if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
            if (jwtdata.role <= 777) hdid = jwtdata.hdid;
            conn = await poolPromise.getConnection();
            if (conn) {
                await conn.beginTransaction();
                console.log("update", data);
                let sqlq = `select exists(select * from smsv2.users where id ='${data.id}' `;
                if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') sqlq += ` AND hdid=${hdid} `;
                sqlq += ` ) count `;
                console.log("project query", sqlq);
                let resp = await conn.query(sqlq);
                console.log("result", resp);
                if (resp[0][0].count == 0) {
                    erroraray.push({ msg: "No Data Found", err_code: 1 });
                    await conn.rollback();
                } else {
                    let sqlupdate = `update smsv2.users set menurole='${insertdata.menurole}' where id ='${data.id}' `;
                    if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') sqlupdate += ` AND hdid=${hdid} `;
                    console.log("update query", sqlupdate);
                    let result = await conn.query(sqlupdate, data);
                    console.log("result", result);
                    if (result[0]["affectedRows"] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='EDIT USER MENU ROLE',`longtext`='DONE BY',cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: "EDIT  MENU ROLE Succesfully Updated.", err_code: 0 });
                            await conn.commit();
                        } else {
                            erroraray.push({ msg: "Audit Log Cant Add.", err_code: 1111 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Please Try After Sometimes", err_code: 1111 });
                        await conn.rollback();
                    }
                }
            } else {
                erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
                await conn.rollback();
            }
        } catch (e) {
            console.log("Catch Block Error", e);
            erroraray.push({ msg: "Please try after sometimes", error_msg: "TRYE" });
            await conn.rollback();
        }
        if (conn) conn.release();
        return resolve(erroraray)
    });
}

operator.post("/userprofileeditrole", async (req, res) => {
    console.log(req.body);
    req.setTimeout(864000000);
    let result = await userprofileeditrole(req);
    res.end(JSON.stringify(result));
}
);


const storage = multer.diskStorage({
	destination: function (req, file, callback) {
		console.log(file.originalname, 'file', file)
		let namefile = file.originalname.split('-')[0], folder_status = false;
		const fs = require("fs")
		const filename = namefile
		const imagePath = `${__dirname}/../Documents/msologo/${filename}`;
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
		console.log("Filename", file.originalname)
		let nowdate = new Date();
		let edate = ((nowdate).toISOString().replace(/T/, '-').replace(/\..+/, '')).slice(0, 16);
		let file_name = file.originalname.split('-')[1]
		// callback(null, file_name + '-' + nowdate.toISOString().slice(0, 10) + '.' + file.mimetype.split('/')[1])
		callback(null, file_name + '-' + nowdate.toISOString().slice(0, 10) + '.' + 'png')
	}
})

// const upload = multer({storage: storage}).single('file') 
const upload = multer({ storage: storage }).array('file', 4)

operator.post('/uploadmsologo', function (req, res) {       // Initial Upload mso logo
	var erroraray = [], data, sqlquery, file;
	upload(req, res, function (err) {
		if (err) {   
			console.log("Error uploading file.", err)
			// return res.end("Error uploading file.");
			erroraray.push({ msg: "Upload Failed", error_msg: 'FAIL' });
			res.end(JSON.stringify(erroraray));
		} else {
			data = req.body, file = req.files;
			console.log("Request.", req.body, file)
			console.log("Request Files .", file.length)
			let filename = `${file[0].filename}`;
			sqlquery = " UPDATE smsv2.Isplogo SET msologo='" + filename + "' WHERE ispid =" + data.id

			console.log("Update logo Query.", sqlquery)

			pool.getConnection(function (err, conn) {
				if (err) {
					console.log("Failed")
				} else {
					var sql = conn.query(sqlquery, function (err, result) {
						conn.release();
						console.log("file result", result.affectedRows)
						if (!err) {
							if (result.affectedRows > 0) {
								erroraray.push({ msg: "Succesfully Added mso", error_msg: 0 });
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

		}
	});
});


module.exports = operator;