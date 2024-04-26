"use strict";
var express = require('express'),
    compress = require('compression'),
    broadcaster = express.Router(),
    pool = require('../connection/conn'),
    poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/broadcaster')


async function addbroadcaster(req) {
    console.log('Add Broadcaster Data:', req.jwt_data);
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 78 });
					await conn.rollback();
				}
                // console.log('Data', data);
               let checkprofile="SELECT COUNT(*) cnt FROM smsv2.`users` WHERE  hdid="+hdid+" and (fullname=RTRIM(LTRIM('"+data.fullname+"')) or profileid=RTRIM(LTRIM('"+data.profileid+"'))) "
               console.log('checkprofile Query :',checkprofile); 
               checkprofile = await conn.query(checkprofile);
                console.log('check',checkprofile[0][0]['cnt']);
                if (checkprofile[0][0]['cnt'] == 0) {
                    let status = data.status == true ? 1 : 0;
                    data.installation_addr = data.installation_addr.replace("'", ' ');
                    let addhd = `INSERT INTO smsv2.users SET profileid='${data.profileid}',usertype=770, password=md5('${data.password}'),fullname='${data.fullname}', mobile =${data.mobile},phoneno=${data.phoneno}
                            ,email1='${data.email1}', email2='${data.email2}',district=${data.districtid},city=${data.cityid},area=${data.area},pincode=${data.pincode},installation_addr='${data.installation_addr}',country=${data.countryid}
                            ,cby=${jwtdata.id},hdid=${data.hdid},state=${data.stateid}`;

                    if (data.descr != '' && data.descr != null) addhd += ",`descs`='" + data.descr + "' ";

                    console.log('ADD Broadcast Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD BROADCASTER',`longtext`='DONE BY',hdid="+hdid+",usertype=770,cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Broadcaster Created Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Contact Your Admin.", err_code: 49 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " Broadcaster Already Exist.", err_code: 53 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes', err_code: '58' })
                await conn.rollback();
            }
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


broadcaster.post('/addbroadcaster', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.broadcastDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '198' }]);
    }
    let result = await addbroadcaster(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

broadcaster.post('/listbroadcaster', function (req, res, err) {   
    var where = [],jwtdata =req.jwt_data,  data = req.body,
     sql, sqlquery = `SELECT u.profileid,h.hdname,u.fullname,u.id,u.mobile,u.email1,u.installation_addr FROM smsv2.users u INNER JOIN smsv2.hd h ON u.hdid=h.hdid WHERE u.usertype=770   `,
        sqlqueryc = `SELECT count(*) count
            FROM smsv2.users u INNER JOIN smsv2.hd h ON u.hdid=h.hdid where u.usertype=770    `, 
            finalresult = [];
      console.log('listbroadcaster------\n\r',data);
        if(jwtdata.role > 777 && data.hdid !=''&&data.hdid != null) where+=(` and  u.hdid=${data.hdid}`);
        if(jwtdata.role <= 777) where+= (` and  u.hdid=${jwtdata.hdid}`);
        if (where != '') {
            sqlquery += where;
            sqlqueryc += where;
        }
        if(data.index!=null) console.log('-----');
        if(data.index!=null && data.limit!=null) sqlquery +=' LIMIT '+data.index+','+data.limit;
    console.log('getlist...', sqlquery,'\n\r sqlqueryc :',sqlqueryc);


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


broadcaster.post('/getbroadcasteredit', function (req, res) {
    console.log('Get BroadCast');
    var jwtdata = req.jwt_data, where = [], data = req.body,
        sql, sqlquery = 'SELECT u.profileid,u.hdid,u.fullname,u.id,u.mobile,u.email1,u.installation_addr,u.phoneno,u.email2,u.country,u.state,u.district,u.city,u.installation_addr,u.descs,u.area,u.pincode FROM smsv2.users u WHERE u.usertype=770 ';
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` And u.hdid = ${data.hdid}`);
    if (jwtdata.role <= 777) where.push(` And u.hdid = ${jwtdata.hdid}`);
   
    if (data.hasOwnProperty('id') && data.id) {
        sqlquery += ` AND u.id =${data.id}`
    }
    if (where.length > 0) {
        where =  where.join(' AND ');
        sqlquery += where;
    }
// console.log('data',data);
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                console.log('get broadcast id', sql.sql);
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                }
            });
        }
    });
});


broadcaster.post('/getbroadcast', function (req, res, err) {
    console.log('get broadcaset');
    var data = req.body,jwtdata=req.jwt_data,where=[], sqlquery = `SELECT id,fullname FROM smsv2.users   WHERE usertype=770 `;
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` and hdid = ${data.hdid}`);
    if (jwtdata.role <= 777) where.push(` And hdid = ${jwtdata.hdid}`);
    if (data.hasOwnProperty('like') && data.like) {
        sqlquery += 'AND  LIKE "%' + data.like + '%" '
    }
    console.log('get broadcaset',sqlquery);
    if(where.length>0){
        where =  where.join(' AND ');
        sqlquery+= where;
    }
  
    pool.getConnection(function (err, conn) {
        if (!err) {
            var sql = conn.query(sqlquery, function (err, result) {
                conn.release();
                if (!err) {
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});


async function editbroadcaster(req) {
    console.log('Add Broadcaster Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data,alog="";
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                let hdid = '';
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 189 });
					await conn.rollback();
				}

                console.log('Data', data);
                let checkprofile = await conn.query("SELECT * FROM smsv2.users WHERE id='" + data.id + "'");
                if (checkprofile[0].length== 1) {
                    let bc=checkprofile[0][0];
                    let status = data.status == true ? 1 : 0;
                    data.installation_addr = data.installation_addr.replace("'", ' ');
                    let addhd = `UPDATE  smsv2.users SET usertype=770,  mobile =${data.mobile},phoneno=${data.phoneno}
                            ,email1='${data.email1}', email2='${data.email2}',district=${data.districtid},city=${data.cityid},area=${data.area},pincode=${data.pincode},installation_addr='${data.installation_addr}',country=${data.countryid}
                            ,lmby=${jwtdata.id},state=${data.stateid}`;

                    if (data.descr != '' && data.descr != null) addhd += ",`descs`='" + data.descr + "' ";
                    if (bc.hdid != hdid) {
						let [checkhdid] = await conn.query(`SELECT * FROM smsv2.users WHERE hdid=${hdid} and fullname='${data.fullname}'`);
						console.log('checkhdid : ', checkhdid);
						if (checkhdid.length == 1) {
							erroraray.push({ msg: " Name Already Available In This Headend.", err_code: 208 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) bc from 
														(select hdname from hd where hdid=${bc.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addhd += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].bc}.`
						}

					}
                    if (bc.fullname != data.fullname) {
						let [checkfullname] = await conn.query(`SELECT * FROM smsv2.users WHERE fullname='${data.fullname}' and hdid=${hdid}`);
						console.log('checkfullname : ', checkfullname);
						if (checkfullname.length == 1) {
							erroraray.push({ msg: " Name Already Available .", err_code: 224 });
							await conn.rollback();
						} else {
							addhd += ` ,fullname='${data.fullname}'`;
							alog += ` Name Changed FROM ${bc.fullname} TO ${data.fullname}.`;
						}

					}

                    addhd += ' WHERE id =' + data.id
                    console.log('Edit Broadcast Query: ', addhd);
                    addhd = await conn.query(addhd);
                    if (addhd[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE BROADCASTER',`longtext`=' "+ alog+" DONE BY', hdid="+hdid+",usertype=770,cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Broadcaster Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Broadcaster Not Updated.", err_code: 244 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " No Data Fund.", err_code: 248 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e);
                erroraray.push({ msg: 'Please try after sometimes err', err_code: '253' })
                await conn.rollback();
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ msg: 'Contact Your Admin.', err_code: 260 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

broadcaster.post('/editbroadcaster', async (req, res) => {
    req.setTimeout(864000000);
    const validation = joiValidate.editbrdcastDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await editbroadcaster(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});




module.exports = broadcaster;