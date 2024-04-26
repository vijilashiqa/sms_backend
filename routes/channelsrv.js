"use strict";
var express = require('express'),
	compress = require('compression'),
	channelsrv = express.Router(),
	pool = require('../connection/conn'),
	poolPromise = require('../connection/conn').poolp;
	const joiValidate = require('../schema/channel')


async function addchannelsrv(req) {
	console.log('Add channelsrv Data:', req.jwt_data);
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 22 });
					await conn.rollback();
				}
				console.log('channelsrv Data', data);
				let checkchannel = await conn.query("SELECT COUNT(*) cnt FROM smsv2.channel_service WHERE casserviceid='" + data.casserviceid + "' AND hdid="+hdid+"");
				if (checkchannel[0][0]['cnt'] == 0) {
					// let status = data.status == true ? 1 : 0;
					let addchn = `INSERT INTO smsv2.channel_service  SET  hdid=${hdid},channelid=${data.channelid},casserviceid =${data.casserviceid},casid=${data.casid},cby= ${jwtdata.id}`;
					console.log('ADD CHANNEL Query: ', addchn);
					addchn = await conn.query(addchn);

					if (addchn[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD SERVICE',`longtext`='DONE BY',hdid="+hdid+",usertype="+jwtdata.role+",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Service ID Created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Please Check Service ID", err_code: 41 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Service ID  Already Exists.", err_code: 45 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes er', err_code: '50' })

				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 58 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}

channelsrv.post('/addchannelsrv', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.chansrvDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        return res.json([{ msg: validation.error.details[0].message, err_code: '189' }]);
    }
	let result = await addchannelsrv(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});

channelsrv.post('/listchannelsrv', function (req, res, err) {
	var where=[], jwtdata = req.jwt_data, sql, sqlquery = ` 
	SELECT cs.id ,cs.hdid,h.hdname,cs.casid,b.cas_name,cs.channelid,c.channame,cs.casserviceid
		   FROM channel_service cs
		   LEFT JOIN channel c ON c.chanid=cs.channelid
		   LEFT JOIN hd_cas b ON b.hdcasid=cs.casid
		   LEFT JOIN hd h ON h.hdid=cs.hdid`,
		sqlqueryc = `SELECT count(*) count FROM channel_service cs
		LEFT JOIN channel c ON c.chanid=cs.channelid
		   LEFT JOIN hd_cas b ON b.hdcasid=cs.casid
		   LEFT JOIN hd h ON h.hdid=cs.hdid`, finalresult = [],
		data = req.body;
		if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` cs.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(`cs.hdid= ${jwtdata.hdid} `);

	if (where.length > 0) {
		where = ' WHERE ' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where;
	}
	if(data.index!=null) console.log('-----');
	if(data.index!=null && data.limit!=null) sqlquery +=' LIMIT '+data.index+','+data.limit;
	// sqlquery += ' LIMIT ?,? ';
	console.log('list channel ...', sqlquery);
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

channelsrv.post('/selectchannel', function (req, res) {
    var jwtdata=req.jwt_data,where =[], sql,data = req.body,
     sqlquery = " SELECT channame,hdid,chantype,chanid FROM smsv2.channel ";
	 if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid} `);
	 if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);
	 if (where.length > 0) {
		 where = ' WHERE' + where.join(' AND ');
		 sqlquery += where;
		 
	 }
        // if (data.hasOwnProperty('chantype') && data.chantype) {
        //     sqlquery+=` AND chantype =${data.chantype}`;
        // }
      
       console.log(data,'yaaaaa')
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
channelsrv.post('/getchannelsrvedit', function (req, res) {
	var data = req.body,
		sql, sqlquery = `SELECT hd.hdcasid,hd.cas_name,cs.id,cs.casserviceid,cs.channelid FROM smsv2.hd_cas hd
		left join  smsv2.channel_service cs on cs.casid=hd.hdcasid and cs.hdid=hd.hdid
		and  cs.channelid =${data.id} and cs.hdid=${data.hdid}`;
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery,  function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get channelsrv', sql.sql);
				conn.release();
				if (!err) {
					console.log(result, "--------");
					res.end(JSON.stringify(result));
					
				}
			});
		}
	});
});


async function channelsrvedit(req) {
	console.log('Edit channelsrv Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data,alog=" ";
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				let hdid = '';
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 227 });
					await conn.rollback();
				}
				console.log('channelsrv Data', data);
				let checkchannel = await conn.query("SELECT * FROM smsv2.channel_service WHERE id =" + data.id + " AND casserviceid!='" + data.casserviceid + "'");
				if (checkchannel[0].length == 1) {
					let si=checkchannel[0][0];
					// let status = data.status == true ? 1 : 0;
					let updateData = {
						hdid: hdid, casid: data.casid, channelid: data.channelid, casserviceid: data.casserviceid, mby: jwtdata.id
					}
					if (si.hdid != data.hdid) {
						updateData['hdid'] = hdid;
						alog += ` Headend Changed From ${si.hdid} To ${hdid}.`;
					}
					if (si.casid != data.casid) {
						updateData['casid'] = data.casid;
						alog += ` Cas Changed From ${si.casid} To ${data.casid}.`;
					}
					if (si.channelid != data.channelid) {
						updateData['channelid'] = data.channelid;
						alog += ` Channel Changed From ${si.channelid} To ${data.channelid}.`;
					}
					if (si.casserviceid != data.casserviceid) {
						updateData['casserviceid'] = data.casserviceid;
						alog += ` Service id Changed From ${si.casserviceid} To ${data.casserviceid}.`;
					}

					
					let update = ` UPDATE smsv2.channel_service SET mdate=NOW(), ? WHERE id= ?`
					console.log('ADD CHANNEL Query: ', update);
					let addchn = await conn.query(update, [updateData, data.id]);
					if (addchn[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE CHANNEL SERVICE',`longtext`=' "+ alog+" DONE BY',hdid="+hdid+",usertype="+jwtdata.role+",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Service ID Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Please Check Service ID", err_code: 223 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Service ID  Already Exists.", err_code: 227 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes', err_code: '232' })

				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 240 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}

channelsrv.post('/channelsrvedit', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editchansrvDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        return res.json([{ msg: validation.error.details[0].message, err_code: '253' }]);
    }
	let result = await channelsrvedit(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});

//Bulk Channel Service

async function bulkchannelsrv(req) {
	return new Promise(async (resolve, reject) => {
		var data = req.body, errorarray = [], status = true,jwtdata=req.jwt_data;
		let conn = await poolPromise.getConnection();
		if (conn) {
			console.log('Add file', data.channel.length);
			for (var i = 0; i < data.channel.length; i++) {
				await conn.beginTransaction();
				try {
					let bulkup = data.channel[i];
					console.log('client data', bulkup);
					console.log('data',data)

					let sqlexists = "SELECT EXISTS(SELECT * FROM smsv2.channel_service WHERE casserviceid =" + bulkup.casserviceid + " AND casid = " + bulkup.casid + "  AND hdid='" + bulkup.hdid + "' ) count";
					sqlexists = await conn.query(sqlexists);
					if (sqlexists[0][0]['count'] != 0) {
						console.log('Service ID already exists');
						errorarray.push({ msg: 'Service ID :'+bulkup.casserviceid+' Already Assigned to the Cas ID :'+bulkup.casid, err_code: '305' });
						await conn.rollback();
						continue;
					} else {
						let sqlquery = ` INSERT INTO smsv2.channel_service SET hdid =${bulkup.hdid},casid=${bulkup.casid},channelid=(select max(chanid) from smsv2.channel WHERE channame='${bulkup.channelid}'), casserviceid = ${bulkup.casserviceid}`;
						console.log('Add mul Query----', sqlquery);
						let result = await conn.query(sqlquery);
						if (result[0]['affectedRows'] > 0 && result[0]['insertId'] > 0) {
							status = false;
							// errorarray.push({ msg: 'Successfully Added', err_code: 0 })
							await conn.commit();
						}
						else {
							console.log('Add mul Query Failed');
							errorarray.push({ msg: 'Channel Name :'+bulkup.channelid+' Already Exits', err_code: '319' });
							await conn.rollback();
							continue;
						}
					}
					if (!status) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='BULK CHANNEL SERVICE',`longtext`='DONE BY',data='" + JSON.stringify(data) + "',usertype=" + jwtdata.role + ",hdid=" + bulkup.hdid + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							errorarray.push({ msg: 'Successfully Added', err_code: 0 })
							await conn.commit();
						}else{
							errorarray.push({ msg: 'Please Try After Sometimes err', err_code: '341' });
							await conn.rollback();
						}
		
					}

				} catch (e) {
					console.log('Inside Catch Error', e);
					errorarray.push({ msg: 'Please Try After Sometimes err2', err_code: '327' });
					await conn.rollback();
				}
			
				// conn.release();
			}
			

		} else {
			errorarray.push({ msg: 'Please Try After Sometimes', err_code: '348' });
			conn.release();
			return;
		}
		console.log('Success-1', errorarray);
		console.log('Connection Closed');
		conn.release();
		return resolve(errorarray);

	});
}

channelsrv.post('/addchannelsrvbulk', async (req, res) => {
	req.setTimeout(864000000);
	let result = await bulkchannelsrv(req);
	console.log('Process Completed', result);
	res.end(JSON.stringify(result));

});


module.exports = channelsrv;



// const joiValidate = require('../schema/headend');
// channelsrv.post('/channelsrvedit', function (req, res) {
// 	var sql, data = req.body, updatesata;
// 	const jwt_data = req.jwt_data;
// 	updatesata = [
// 		data.hdid,
// 		jwt_data.id,
// 		data.channelid,
// 		data.casserviceid,
// 		data.casid
// 	];
// 	console.log('data form', data)
// 	pool.getConnection(function (err, conn) {
// 		if (err) {
// 			console.log('Error');
// 		} else {
// 			sql = conn.query('SELECT EXISTS(SELECT hdid,channaleid,casserviceid,casid FROM smsv2.channel_service WHERE hdid =? AND channelid = ?)AS COUNT'
// 			, [data.hdid, data.channelid, data.casserviceid], function (err, result) {
// 				if (!err) {
// 					if (result[0].COUNT == 0) {
// 						sql = conn.query('UPDATE smsv2.`channel_service` SET channelid = ?,mby=?,channelid=? WHERE casserviceid=?', updatesata, function (err) {
// 							if (err) {
// 								console.log(sql.sql)
// 								Errorhandle('Service ID not Update');
// 							} else {
// 								console.log(sql.sql)
// 								Errorhandle('Service ID Updated Successfully', 1);
// 							}
// 						});
// 					} else {
// 						console.log('adddpp', sql.sql)
// 						Errorhandle('ServiceID Already Exist');
// 					}
// 				} else {
// 					console.log(sql.sql)
// 					Errorhandle('Pls Contact Admin')
// 				}
// 			});
// 		}
// 		function Errorhandle(msg, status = 0) {
// 			conn.release();
// 			res.end(JSON.stringify({ msg: msg, status: status }));
// 		}
// 	});
// });



