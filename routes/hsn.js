                                          //*******************HSN NUM***************//



"use strict";
var express = require('express'),
compress = require('compression'),
hsn= express.Router(),
pool = require('../connection/conn');
 poolPromise = require('../connection/conn').poolp;
 const joiValidate = require('../schema/inventory');                                        
                                          



async function addhsn(req) {
    console.log('Add vendordetail Data:', req.jwt_data);
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
                console.log('Data', data);
                let checkprofile = await conn.query("SELECT COUNT(*) cnt FROM smsv2.hsn_num WHERE hsn_num=" + data.hsn_num +" OR  hsn_name ='" + data.hsn_name + "'");
                if (checkprofile[0][0]['cnt'] == 0) {
                    let status = data.status == true ? 1 : 0;
                    // data.addr = data.addr.replace("'", ' ');
                    let addhd = `INSERT INTO smsv2.hsn_num SET 
                         hsn_num=${data.hsn_num}, 
                         hsn_name ='${data.hsn_name}',
                         status=${data.status},
                         hdid=${hdid},
                         created_by=${jwtdata.id}`;
                    console.log('ADD Hsn Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id=' hsn detail',`longtext`='DONE BY',hdid="+hdid+", usertype="+jwtdata.role+",cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " HSN Deatil Created Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 52 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " HSN Deatil ID Already Exists.", err_code: 56 });
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
            erroraray.push({ msg: 'Please try after sometimes', err_code: 68 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}
hsn.post('/listhsn', function (req, res, err) {
    var  where =[],jwtdata=req.jwt_data,sql,sqlquery = 'SELECT hsn.hsn_id,hsn.hsn_num,hsn.hsn_name,hsn.status,h.hdname,h.hdid FROM `smsv2`.hsn_num hsn LEFT JOIN smsv2.hd h ON  hsn.hdid=h.hdid LIMIT ?,? ',
        sqlqueryc = ' SELECT COUNT(*) AS count FROM `smsv2`.hsn_num hsn LEFT JOIN smsv2.hd h ON  hsn.hdid=h.hdid', finalresult = [],
        data = req.body;
       
        // if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hsn.hdid= ${data.hdid} `);
        // if (jwtdata.role <= 777) where.push(` hsn.hdid= ${jwtdata.hdid} `);
    
        // if (where.length > 0) {
        //     where = ' WHERE' + where.join(' AND ');
        //     sqlquery += where;
        //     sqlqueryc += where;
        // }
        // sqlquery += ' LIMIT ?,? ';
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

hsn.post('/selecthsn', function (req, res) {
    var where =[],jwtdata=req.jwt_data, sql,data = req.body
     ,sqlquery = 'SELECT hsn_id,hsn_name,hdid,hsn_num FROM smsv2.hsn_num' ;
      if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);

	
        if (data.hasOwnProperty('hsn_id-') && data.hsn_id) {
            sqlquery+=` AND hsn_id =${data.hsn_id}`;
        }
        if (data.hasOwnProperty('hsn_name') && data.hsn_name) {
            sqlquery+=` AND hsn_name =${data.hsn_name}`;
        }
        if (data.hasOwnProperty('hsn_num') && data.hsn_num) {
            sqlquery+=` AND hsn_num =${data.hsn_num}`;
        }
        if (where.length > 0) {
            where = ' WHERE' + where.join(' AND ');
            sqlquery += where;
        }
     console.log('data',data)  
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            sql = conn.query(sqlquery,function (err, result) {
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});

hsn.post('/gethsn', function (req, res) {
	var data = req.body, where =[],jwtdata=req.jwt_data,
		sql, sqlquery = `SELECT hsn_id,hsn_name,hdid,hsn_num,status 
		FROM smsv2.hsn_num WHERE hsn_id =${data.hsn_id}`;
        if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid} `);
        if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);
        if (where.length > 0) {
            where =  where.join(' AND ');
            sqlquery += where;
        }
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get channel', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});


async function edithsn(req) {
    console.log('Add Broadcaster Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data ,alog='';
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let hdid = '';
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 159 });
					await conn.rollback();
				}
                console.log('Data', data);
                let checkprofile = await conn.query("SELECT *  FROM smsv2.`hsn_num` WHERE  hsn_id=" + data.hsn_id + "");
                if (checkprofile[0].length == 1) {
                    let chs=checkprofile[0][0];
                    let status = data.status == true ? 1 : 0;
                    let addhd = `UPDATE  smsv2.hsn_num SET  modified_by=${jwtdata.id}`;
                    if(chs.hdid!=hdid){
                        let [checkhsn] = await conn.query(`SELECT * FROM smsv2.hsn_num WHERE hsn_name='${data.hsn_name}' and hdid=${hdid} and hsn_num=${data.hsn_num} `);
						console.log('checkhsn : ', checkhsn);
						if (checkhsn.length == 1) {
							erroraray.push({ msg: "   This Headend Already Available .", err_code: 191 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) chs from 
														(select hdname from hd where hdid=${chs.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addhd += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].chs}.`
						}
                    }
                    if (chs.hsn_name != data.hsn_name) {
						let [checkhsn] = await conn.query(`SELECT * FROM smsv2.hsn_num WHERE hsn_name='${data.hsn_name}' and hdid=${hdid} and hsn_num=${data.hsn_num}`);
						console.log('checkhsn : ', checkhsn);
						if (checkhsn.length == 1) {
							erroraray.push({ msg: "HSN  Name  Already Available In This Headend.", err_code: 206 });
							await conn.rollback();
						} else {
							
							addhd += ` ,hsn_name='${data.hsn_name}'`;
							alog += ` HSN  Name  Changed from ${chs.hsn_name} to ${data.hsn_name}.`
						}

					}
                    if (chs.hsn_num != data.hsn_num) {
						let [checkhsn] = await conn.query(`SELECT * FROM smsv2.hsn_num WHERE hsn_name='${data.hsn_name}' and hdid=${hdid} and hsn_num=${data.hsn_num}`);
						console.log('checkhsn : ', checkhsn);
						if (checkhsn.length == 1) {
							erroraray.push({ msg: "HSN  Number  Already Available In This Headend.", err_code: 78 });
							await conn.rollback();
						} else {
							
							addhd += ` ,hsn_num='${data.hsn_num}'`;
							alog += ` HSN  Number  Changed from ${chs.hsn_num} to ${data.hsn_num}.`
						}

					}
                    addhd += ' WHERE hsn_id =' + data.hsn_id
                    console.log('Edit Broadcast Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO  smsv2.activitylog SET table_id='UPDATE HSN Deatil',`longtext`=' "+alog+" DONE BY',hdid="+hdid+",usertype="+jwtdata.role+", cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " HSN Deatil Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 239 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: "HSN Already exists.", err_code: 243 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                console.log(e)
                erroraray.push({ msg: 'Please try after sometimes err', err_code: 'ERR' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Please try after sometimes', err_code: 256 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

hsn.post('/addhsn', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.hsnDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await addhsn(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});
hsn.post('/edithsn', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.edithsnDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await edithsn(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));

});



module.exports = hsn;