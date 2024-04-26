"use strict";
var express = require('express'),
	compress = require('compression'),
	channel = express.Router(),
	pool = require('../connection/conn'),
	poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/channel');

//LANGUAGE///////////////////////////////////////////////
async function addLang(req) {
	console.log('Add genre Data:', req.jwt_data);
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
				console.log('channel Data', data);
				let checkchannel = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`channel_lang` WHERE langname='" + data.langname + "'  AND  hdid=" + hdid + "");
				if (checkchannel[0][0]['cnt'] == 0) {
					let status = data.status == true ? 1 : 0;
					let addchn = `INSERT INTO smsv2.channel_lang SET hdid=${hdid}, status=${status},langname='${data.langname}',cby=${jwtdata.id}`;
					console.log('ADD CHANNEL Query: ', addchn);
					addchn = await conn.query(addchn);
					if (addchn[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD LANGUAGE',`longtext`='DONE BY',hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Language created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 40 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Languge Name Already Exists.", err_code: 44 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err ', err_code: '49' })

				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 57 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}
channel.post('/addLang', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.langDataSchema.validate(req.body);
	if (validation.error) return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	let result = await addLang(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});


channel.post('/listlang', function (req, res, err) {
	var jwtdata = req.jwt_data, where = [], sql, sqlquery = `SELECT l.langname , l.langid , h.hdid,h.hdname ,l.hdid , l.STATUS 
	FROM smsv2.channel_lang l
	INNER JOIN smsv2.hd h ON l.hdid=h.hdid`,
		sqlqueryc = `SELECT count(*) count
		FROM smsv2.channel_lang l
		INNER JOIN smsv2.hd h ON l.hdid=h.hdid
        `, finalresult = [],
		data = req.body;
	console.log('lan', jwtdata);
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  l.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` l.hdid= ${jwtdata.hdid} `);

	if (where.length > 0) {
		where = ' WHERE ' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where;
	}
	if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
	console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
	console.log('data', data)


	console.log('listhdcas...', sqlquery);
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

							// res.end(JSON.stringify(finalresult));
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

channel.post('/getchannellang', function (req, res) {
	var data = req.body, jwtdata = req.jwt_data, where = [],
		sql, sqlquery = `SELECT l.langname , l.langid , h.hdid,h.hdname ,l.hdid,l.STATUS 
		FROM smsv2.channel_lang l
		INNER JOIN smsv2.hd h ON l.hdid=h.hdid  `;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` and  l.hdid=${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` and  l.hdid=${jwtdata.hdid} `);
	if (where.length > 0) {
		where = where.join(' AND ');
		sqlquery += where;
	}
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get channel lang', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});



async function editlang(req) {
	console.log('update Data:', req.jwt_data);
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 153 });
					await conn.rollback();
				}
				console.log('Data', data);
				let checkprofile = await conn.query("SELECT * FROM smsv2.`channel_lang` WHERE   langid=" + data.langid + " ");
				if (checkprofile[0].length == 1) {
					let cl = checkprofile[0][0];
					let status = data.status == true ? 1 : 0;
					let addhd = `UPDATE  smsv2.channel_lang SET	status=${data.status}					 
						`;
					if (cl.hdid != hdid) {
						let [checklangname] = await conn.query(`SELECT * FROM smsv2.channel_lang WHERE langname='${data.langname}' and hdid=${hdid}`);
						console.log('checklangname : ', checklangname);
						if (checklangname.length == 1) {
							erroraray.push({ msg: " Headend Already Available .", err_code: 167 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) cl from 
														(select hdname from hd where hdid=${cl.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addhd += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].cl}.`
						}

					}
					if (cl.langname != data.langname) {
						let [checklangname] = await conn.query(`SELECT * FROM smsv2.channel_lang WHERE langname='${data.langname}' and hdid=${hdid}`);
						console.log('checklangname : ', checklangname);
						if (checklangname.length == 1) {
							erroraray.push({ msg: "Language Already Available .", err_code: 183 });
							await conn.rollback();
						} else {
							addhd += ` ,langname='${data.langname}'`;
							alog += ` Languge Changed FROM ${cl.langname} TO ${data.langname}.`;
						}

					}
					addhd += ' WHERE langid =' + data.langid
					console.log('Update channel Query: ', addhd);
					addhd = await conn.query(addhd);
					if (addhd[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE LANGUAGE',`longtext`=' " + alog + " DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Languge Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 202 });
						await conn.rollback();
					}
				} else {
					// console.log('no data', checkprofile)
					erroraray.push({ msg: " Languge Name already Exits", err_code: 207 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes', err_code: '212' })
				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 220 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}

channel.post('/editlang', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editlangDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await editlang(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});


//////////////////////////////////GENRE///////////////////////////////////////////////////

async function addgenre(req) {
	console.log('Add genre Data:', req.jwt_data);
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 360 });
					await conn.rollback();
				}
				console.log('channel Data', data);
				let checkchannel = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`channel_genre` WHERE genrename='" + data.genrename + "' AND langid=" + data.langid + " AND  hdid=" + hdid + "");
				if (checkchannel[0][0]['cnt'] == 0) {
					let status = data.status == true ? 1 : 0;
					let addchn = `INSERT INTO smsv2.channel_genre SET hdid=${hdid},langid=${data.langid}, status=${status},genrename='${data.genrename}',cby=${jwtdata.id}`;
					console.log('ADD CHANNEL Query: ', addchn);
					addchn = await conn.query(addchn);
					if (addchn[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD GENER',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Genre Created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 272 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Genre Name Already Exists.", err_code: 276 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err', err_code: '281' })

				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 289 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}
channel.post('/addgenre', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.chngenreDataSchema.validate(req.body);
	if (validation.error) return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	let result = await addgenre(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});

channel.post('/listgenre', function (req, res, err) {
	var jwtdata = req.jwt_data, sql, where = [], sqlquery = `SELECT g.genrename ,g.genreid ,g.status, g.langid, h.hdname, l.langname,g.hdid 
	FROM smsv2.channel_genre g 
	INNER JOIN smsv2.channel_lang l ON  g.langid=l.langid
	INNER JOIN smsv2.hd  h ON g.hdid=h.hdid  `,
		sqlqueryc = `SELECT count (*) FROM smsv2.channel_genre g 
		INNER JOIN smsv2.channel_lang l ON  g.langid=l.langid
		INNER JOIN smsv2.hd  h ON g.hdid=h.hdid`, finalresult = [],
		data = req.body;
	console.log('data in jwt req', jwtdata)
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where += (` AND  g.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` g.hdid= ${jwtdata.hdid} `);

	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where;
	}

	if (data.index != null) console.log('-----');
	if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
	console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
	console.log('list Gener', sqlquery);
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
channel.post('/selectgenre', function (req, res) {

	var sql, data = req.body, jwtdata = req.jwt_data, where = [],

		sqlquery = `SELECT genrename,genreid FROM smsv2.channel_genre WHERE  langid=${data.langid}`;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` And hdid=${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` and hdid=${jwtdata.hdid}`);
	if (data.hasOwnProperty('langid') && data.langid) {
		sqlquery += ` AND langid =${data.langid}`;
	}
	console.log('data', sqlquery);
	if (where.length > 0) {
		where = where.join(' AND ');
		sqlquery += where;
	}
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

channel.post('/getchannelgenre', function (req, res) {
	var data = req.body, jwtdata = req.jwt_data, where = [],
		sql, sqlquery = `SELECT g.genrename ,g.genreid ,g.status, g.langid, h.hdname, l.langname,g.hdid 
		FROM smsv2.channel_genre g 
		INNER JOIN smsv2.channel_lang l ON  g.langid=l.langid
		INNER JOIN smsv2.hd  h ON g.hdid=h.hdid   WHERE genreid =${data.genreid}`;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` AND g.hdid=${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` And g.hdid=${jwtdata.hdid}`);
	if (where.length > 0) {
		where = where.join(' AND ');
		sqlquery += where;
	}
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log(' lang genre ', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});
async function editgenre(req) {
	console.log('update Data:', req.jwt_data);
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 423 });
					await conn.rollback();
				}
				console.log('Data', data);
				let checkgener = await conn.query("SELECT * FROM smsv2.`channel_genre` WHERE  genreid=" + data.genreid);
				let status = data.status == true ? 1 : 0;
				if (checkgener[0].length == 1) {
					let cg = checkgener[0][0];

					let addhd = `UPDATE  smsv2.channel_genre SET status=${data.status}`;
					if (cg.hdid != hdid) {
						let [checkgner] = await conn.query(`SELECT * FROM smsv2.channel_genre WHERE genrename='${data.genrename}' and   langid=${data.langid} and hdid=${hdid}`);
						console.log('checkgner : ', checkgner);
						if (checkgner.length == 1) {
							erroraray.push({ msg: "  Headend Already Exists.", err_code: 417 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) cg from 
														(select hdname from hd where hdid=${cg.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addhd += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].cg}.`
						}

					}
					if (cg.langid != data.langid) {
						let [checkgner] = await conn.query(`SELECT * FROM smsv2.channel_genre WHERE  genrename='${data.genrename}' and   langid=${data.langid} and hdid=${hdid}`);
						console.log('checkgner : ', checkgner);
						if (checkgner.length == 1) {
							erroraray.push({ msg: "  Language Already Available .", err_code: 433 });
							await conn.rollback();
						} else {
							let checklang = ` select concat(' From ',a.langname,' TO ',b.langname) chan from 
														(select langname from channel_lang where langid=${cg.langid} ) a
														,(select langname from channel_lang where langid=${data.langid} ) b `;
							checklang = await conn.query(checklang);
							addhd += ` ,langid='${data.langid}'`;
							alog += ` Languge name Changed ${checklang[0][0].chan}.`
						}

					}
					if (cg.genrename != data.genrename) {
						let [checkgner] = await conn.query(`SELECT * FROM smsv2.channel_genre WHERE   genrename='${data.genrename}' and langid=${data.langid} `);
						console.log('checkgner : ', checkgner);
						if (checkgner.length == 1) {
							erroraray.push({ msg: "Genre Name Already Available.", err_code: 449 });
							await conn.rollback();
						} else {
							addhd += ` ,genrename='${data.genrename}'`;
							alog += ` Gener Changed From ${cg.genrename} To ${data.genrename}.`;
						}

					}

					addhd += ' WHERE genreid =' + data.genreid
					console.log('Update channel Query: ', addhd);
					addhd = await conn.query(addhd);
					if (addhd[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE GENRE',`longtext`='" + alog + " DONE BY',hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Genre Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 469 });
						await conn.rollback();
					}
				} else {
					// console.log('no data', checkgener)
					erroraray.push({ msg: " Genre Name already Exits", err_code: 474 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err', err_code: '479' })
				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 482 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}

channel.post('/editgenre', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editchngenreDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		//  return res.status(422).json({ msg: validation.error.details, err_code: '422' });
		return res.json([{ msg: validation.error.details[0].message, err_code: '476' }]);
	}
	let result = await editgenre(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});
//******************************************CHANNEL************************************* */


async function addchannel(req) {
	console.log('Add channel Data:', req.jwt_data);
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 512 });
					await conn.rollback();
				}
				console.log('channel Data', data);
				let checkchannel = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`channel` WHERE channame='" + data.channame + "' AND hdid=" + hdid + "");
				if (checkchannel[0][0]['cnt'] == 0) {
					let status = data.status == true ? 1 : 0;
					let addchn = `INSERT INTO smsv2.channel SET hdid=${data.hdid},channame='${data.channame}',chanlcm=${data.chanlcm}, chanmode =${data.chanmode},langid=${data.langid}
						,genreid=${data.genreid},status=${status},chantype=${data.chantype},bcid=${data.bcid}`;
					if (data.price >= 0) addchn += ` ,price=${data.price}`;
					console.log('ADD CHANNEL Query: ', addchn);
					addchn = await conn.query(addchn);
					if (addchn[0]['affectedRows'] > 0) {
						if (data.casservices) {

							for (let csid = 0; csid < data.casservices.length; csid++) {
								let c = data.casservices[csid]
								console.log('servicesid----------', c.servicesid != null);
								if (c.servicesid != null) {
									let checkserviceid = await conn.query(`SELECT * FROM smsv2.channel_service WHERE casserviceid='${c.servicesid}'  AND hdid=${data.hdid} and casid=${c.hdcasid} `);
									console.log('-------', checkserviceid[0].length == 0);
									if (checkserviceid[0].length == 0) {
										let addcasid = `INSERT INTO smsv2.channel_service  SET  hdid=${hdid},channelid=${addchn[0].insertId},casserviceid ='${c.servicesid}',casid=${c.hdcasid},cby= ${jwtdata.id} `;

										console.log('chanserid----', addcasid);
										addcasid = await conn.query(addcasid);
										if (c.servicesid == 0) {
											erroraray.push({ msg: " Channel Service ID:'" + c.servicesid + "' Channel Service ID Not Added.", err_code: 56 });
											await conn.rollback();
											continue;
										}
									} else {

										console.log('Service id already available');
										erroraray.push({ msg: " Channel Service ID:('" + c.servicesid + "') Exits.", err_code: 63 });
										await conn.rollback();
										continue;
									}
								} else {
									console.log('No serviceid');
								}
							}
						}
					} else {
						erroraray.push({ msg: "Please Check Channel Service", err_code: 70 });
						await conn.rollback();
					}

					if (addchn[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD CHANNEL',`longtext`='DONE BY',hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Channel Created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 540 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Channel Name Already Exists.", err_code: 544 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err ', err_code: '549' })

				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 557 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}




channel.post('/addchannel', async (req, res) => {
	req.setTimeout(864000000);

	const validation = joiValidate.chanDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		// return res.status(422).json({ msg: validation.error.details, err_code: '422' });
		return res.json([{ msg: validation.error.details[0].message, err_code: '768' }]);
	}
	let result = await addchannel(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});


channel.post('/selectchanname', function (req, res) {

	var sql, data = req.body, jwtdata = req.jwt_data, where = [],

		sqlquery = `SELECT chanid,channame FROM smsv2.channel  `;
	if (jwtdata.role > 777 && data.hdid != ' ' && data.hdid != null) where.push(` hdid=${data.hdid}`);
	if (jwtdata.role <= 777) where.push(`hdid=${jwtdata.hdid}`);

	if (where.length > 0) {
		where = ' WHERE ' + where.join('And');
		sqlquery += where;
	}
	console.log('data', sqlquery);
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

// channel.post('/getchannel_for_pack', function (req, res) {
// 	var sql, data = req.body, sqlquery;
// 	if (data.hasOwnProperty('hdid') && data.hdid) {
// 		sqlquery = " SELECT  chan.chanid,chan.channame,genre.genrename,lang.langname " +
// 			" FROM smsv2.`channel` AS chan,smsv2.`channel_genre` AS genre,smsv2.`channel_lang` AS lang " +
// 			" WHERE chan.genreid=genre.genreid AND chan.langid=lang.langid AND chan.hdid=" + data.hdid + " "

// 		if (data.hasOwnProperty('bcid') && data.bcid) { sqlquery += ' and chan.bcid = ' + data.bcid }



// 		sqlquery += " ORDER BY lang.langname,genre.genrename";

// 	}

// 	console.log(sqlquery)
// 	pool.getConnection(function (err, conn) {
// 		sql = conn.query(sqlquery, function (err, result) {
// 			// console.log(sql.sql)
// 			conn.release();
// 			if (!err) {
// 				res.end(JSON.stringify(result));
// 			}
// 		})
// 	});
// });
channel.post('/getchannel_for_pack', function (req, res) {
	var sql, data = req.body, sqlquery, jwtdata = req.jwt_data;
	var where = [];


	if (jwtdata.role > 777 && data.hdid !== '' && data.hdid !== null)
		where.push(`chan.hdid = ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(`chan.hdid = ${jwtdata.hdid}`);



	if (data.hasOwnProperty('bcid') && data.bcid) {
		where.push(`chan.bcid = ${data.bcid}`);
	}

	if (where.length > 0) {
		sqlquery = " SELECT chan.chanid, chan.channame, genre.genrename, lang.langname " +
			" FROM smsv2.channel AS chan, smsv2.channel_genre AS genre, smsv2.channel_lang AS lang " +
			" WHERE chan.genreid = genre.genreid AND chan.langid = lang.langid AND " +
			where.join(" AND ") +
			" ORDER BY lang.langname, genre.genrename";
	}

	console.log(sqlquery);
	pool.getConnection(function (err, conn) {
		sql = conn.query(sqlquery, function (err, result) {
			conn.release();
			if (!err) {
				res.end(JSON.stringify(result));
			}
		});
	});
});


channel.post('/listchannel', function (req, res, err) {
	var jwtdata = req.jwt_data, where = [], sql, sqlquery = `SELECT c.chanid,c.channame,c.chanmode,c.chantype,u.fullname, c.genreid,c.langid,c.hdid,g.genrename,l.langname,h.hdname,c.bcid,c.chanlcm,c.status,c.price FROM smsv2.channel c
	 INNER JOIN channel_genre g ON  g.genreid = c.genreid 
	 INNER JOIN channel_lang l ON  l.langid = c.langid 
	 INNER JOIN hd h ON h.hdid = c.hdid 
	 INNER JOIN users u ON u.id =  c.bcid     
    
	`,
		sqlqueryc = `SELECT count(*) count
		FROM smsv2.channel c 
		INNER JOIN channel_genre g ON  g.genreid = c.genreid 
		INNER JOIN channel_lang l ON  l.langid = c.langid
		 INNER JOIN hd h ON h.hdid = c.hdid 
		 INNER JOIN users u ON u.id =  c.bcid     `, finalresult = [],
		data = req.body;
	console.log('list channel ...', sqlquery);

	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` c.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` c.hdid= ${jwtdata.hdid} `);
	if (data.hasOwnProperty('langid') && data.langid) where.push(`  c.langid= ${data.langid}`);
	if (data.hasOwnProperty('chanlcm') && data.chanlcm) where.push(` c.chanlcm= ${data.chanlcm}`);
	if (data.hasOwnProperty('genreid') && data.genreid) where.push(`  c.genreid= ${data.genreid}`);
	if (data.hasOwnProperty('chantype') && data.chantype) where.push(` c.chantype= ${data.chantype}`);
	if (data.hasOwnProperty('chanid') && data.chanid) where.push(` c.chanid= ${data.chanid}`);
	if (data.hasOwnProperty('bcid') && data.bcid) where.push(` c.bcid= ${data.bcid}`);
	if (data.hasOwnProperty('chanmode') && data.chanmode) where.push(`   c.chanmode= ${data.chanmode}`);
	if (jwtdata.role > 777 && data.status != '' && data.status != null) where.push(` c.status= ${data.status} `);
	if (data.status) where.push(` c.status= ${data.status} `);


	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
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
						}
					});
				} else {
					conn.release();
				}
			});
		}
	});
});

channel.post('/getchanneledit', function (req, res) {
	var data = req.body, jwtdata = req.jwt_data, where = [],
		sql, sqlquery = `SELECT c.channame,c.chanid,c.chanlcm,c.chantype,c.chanmode,c.hdid,c.bcid,c.langid,c.genreid,c.status,cs.casserviceid,cs.casid,c.price,cs.id  FROM smsv2.channel c
		left JOIN  smsv2.channel_service cs on c.chanid=cs.channelid WHERE c.chanid =${data.id}`;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` AND  c.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` AND  c.hdid= ${jwtdata.hdid} `);
	if (where.length > 0) {
		where = where.join(' AND ');
		sqlquery += where;
	}
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log(' lang edit', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});

async function editchannel(req) {
	console.log('update Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog = '', satatus = true;
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				let hdid = '';
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 607 });
					await conn.rollback();
				}
				console.log('Data', data);
				let checkprofile = await conn.query("SELECT * FROM smsv2.`channel` WHERE   chanid=" + data.id + "   ");
				if (checkprofile[0].length == 1) {
					let chan = checkprofile[0][0];
					console.log('chan', chan)
					let status = data.status == true ? 1 : 0;
					let addhd = `UPDATE   smsv2.channel SET chanlcm=${data.chanlcm},chanmode =${data.chanmode},price=${data.price},status=${status},chantype=${data.chantype}`;
					if (data.price >= 0) addhd += ` ,price= ${data.price}`;
					if (chan.hdid != hdid) {
						let [checkchan] = await conn.query(`SELECT * FROM smsv2.channel WHERE and hdid=${hdid} and channame='${data.channame}'  `);
						console.log('checkchan : ', checkchan);
						if (checkchan.length == 1) {
							erroraray.push({ msg: "  Headend Already Exists.", err_code: 747 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) chan from 
													(select hdname from hd where hdid=${chan.hdid} ) a
													,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addhd += `,hdid='${hdid}'`;
							alog += ` Headend Changed ${checkhdid[0][0].chan}.`;
						}

					}
					if (chan.bcid != data.bcid) {
						let [checkchan] = await conn.query(`SELECT * FROM smsv2.channel WHERE hdid=${hdid} and channame='${data.channame}'  `);
						console.log('checkchan : ', checkchan);
						if (checkchan.length == 1) {
							erroraray.push({ msg: " Broadcaster  Exists.", err_code: 763 });
							await conn.rollback();
						} else {
							let checkbcid = ` select concat(' From ',a.fullname,' TO ',b.fullname) chan from 
													(select fullname from users where id=${chan.bcid} ) a
													,(select fullname from users where id=${data.bcid} ) b `;
							checkbcid = await conn.query(checkbcid);
							addhd += ` ,bcid='${data.bcid}'`;
							alog += ` Broadcaster Changed ${checkbcid[0][0].chan}.`;
						}

					}
					if (chan.channame != data.channame) {
						let [checkchan] = await conn.query(`SELECT * FROM smsv2.channel WHERE hdid=${hdid} and channame='${data.channame}'  `);
						console.log('checkchan : ', checkchan);
						if (checkchan.length == 1) {
							erroraray.push({ msg: " Channel Name Already Exists.", err_code: 779 });
							await conn.rollback();
						} else {
							addhd += ` ,channame='${data.channame}' `;
							alog += ` Channel Name Changed From ${chan.channame} To ${data.channame}.`;
						}

					}
					if (chan.langid != data.langid) {
						let [checkchan] = await conn.query(`SELECT * FROM smsv2.channel WHERE  hdid=${hdid} and channame='${data.channame}'  `);
						console.log('checkchan : ', checkchan);
						if (checkchan.length == 1) {
							erroraray.push({ msg: " Language Already Exists .", err_code: 791 });
							await conn.rollback();
						} else {
							let checklang = ` select concat(' From ',a.langname,' TO ',b.langname) chan from 
													(select langname from channel_lang where langid=${chan.langid} ) a
													,(select langname from channel_lang where langid=${data.langid} ) b `;
							checklang = await conn.query(checklang);

							addhd += ` ,langid='${data.langid}' `;
							alog += ` Languge Name Changed ${checklang[0][0].chan}.`;
						}

					}
					if (chan.genreid != data.genreid) {
						let [checkchan] = await conn.query(`SELECT * FROM smsv2.channel WHERE  hdid=${hdid} and channame='${data.channame}'  `);
						console.log('checkchan : ', checkchan);
						if (checkchan.length == 1) {
							erroraray.push({ msg: " Genre Already Exists.", err_code: 808 });
							await conn.rollback();
						} else {
							let checkgner = ` select concat(' From ',a.genrename,' TO ',b.genrename) chan from 
													(select genrename from channel_genre where genreid=${chan.genreid} ) a
													,(select genrename from channel_genre where genreid=${data.genreid} ) b `;
							checkgner = await conn.query(checkgner);

							addhd += ` ,genreid='${data.genreid}' `;
							alog += `  Genre Changed ${checkgner[0][0].chan}.`;
						}

					}

					console.log('---log----', alog);
					addhd += ' WHERE chanid =' + data.id
					console.log('Update channel Query: ', addhd);
					addhd = await conn.query(addhd);

					for (let pid = 0; pid < data.casservices.length; pid++) {

						let csid = data.casservices[pid], cid = data.id;

						console.log('id----------', csid.id != null);
						if (csid.id != null) {
							let checkcsid = ("SELECT * FROM smsv2.channel_service WHERE  id=" + csid.id);
							console.log('-------', checkcsid);
							checkcsid = await conn.query(checkcsid);
							if (checkcsid[0].length != 0) {

								if (checkcsid[0][0].casserviceid != csid.casserviceid) {
									let addcasid = ` UPDATE smsv2.channel_service SET
										casserviceid=${csid.servicesid},mby=${jwtdata.id} where id=${csid.id} `
									addcasid = await conn.query(addcasid);
									if (addcasid[0]['affectedRows'] == 0) {
										console.log('Service id already available');
										erroraray.push({ msg: " service Exits.", err_code: 955 });
										satatus = false;
										await conn.rollback();
									}

								} else {
									console.log("SAME SERVICE ID.");
								}


							} else { console.log("Record Same.."); }

						} else {
							console.log("Condition Failed..");
						}
						if (csid.id == null && (csid.servicesid != '' && csid.servicesid != null)) {

							// check given hdid and hdcasid service id is already or not
							let checkcs = (`SELECT * FROM smsv2.channel_service WHERE casid = ${csid.casid}  and  casserviceid= '${csid.servicesid}' ` )
							console.log('check', checkcs);
							let servedit = await conn.query(checkcs);
							if (servedit[0].length == 0 || servedit[0].length == 1) {

								let editcasid = ` INSERT INTO smsv2.channel_service(hdid,casid,channelid,casserviceid,cby) 
										VALUES (${data.hdid},${csid.casid},${data.id},'${csid.servicesid}',${jwtdata.id})
										ON DUPLICATE KEY UPDATE casserviceid='${csid.servicesid}',mby =${jwtdata.id}					
										`
								editcasid = await conn.query(editcasid);
							} else {

								console.log('Service id already available');
								erroraray.push({ msg: " service Exits.", err_code: 982 });
								satatus = false;
								await conn.rollback();


							}
						}



					}
					if (satatus) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE channel',`longtext`='" + alog + " DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Channel Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					}
				} else {
					erroraray.push({ msg: " Channel already Exits", err_code: 839 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err', err_code: '844' })
				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 851 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}

channel.post('/editchannel', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editchanDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		//  return res.status(422).json({ msg: validation.error.details, err_code: '422' });
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await editchannel(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});







// channel.post('/addLang', function (req, res) {
// 	const validation = joiValidate.langDataSchema.validate(req.body);
// 	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
// 	var sql, data = req.body, insertdata, jwt_data = req.jwt_data;

// 	insertdata = {
// 		hdid: data.hdid,
// 		langname: data.langname,
// 		cby: jwt_data.id
// 	};
// 	pool.getConnection(function (err, conn) {
// 		if (err) {
// 			console.log('Error');
// 		} else {
// 			sql = conn.query('SELECT EXISTS(SELECT * FROM smsv2.`channel_lang` WHERE hdid = ? AND langname=? )AS COUNT', [data.hdid, data.langname], function (err, result) {
// 				if (!err) {
// 					if (result[0].COUNT == 0) {
// 						sql = conn.query('INSERT INTO smsv2.`channel_lang` SET ?', insertdata, function (err) {
// 							if (err) {
// 								console.log(sql.sql)
// 								Errorhandle('language not Created');
// 							} else {
// 								Errorhandle('language  Created Successfully', 1);


// 							}
// 						});
// 					} else {
// 						Errorhandle('Language name Already Exist');
// 					}
// 				} else {
// 					Errorhandle('Pls Contact Admin')
// 				}
// 			});
// 		}
// 		function Errorhandle(msg, err_code = 0) {
// 			conn.release();
// 			res.end(JSON.stringify({ msg: msg, err_code: err_code }));
// 		}
// 	});
// });


// channel.post('/editlang', function (req, res) {
// 	const validation = joiValidate.editlangDataSchema.validate(req.body);
// 	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
// 	var sql, data = req.body, updatesata;
// 	const jwt_data = req.jwt_data;
// 	updatesata = [
// 		data.hdid,
// 		data.langname,
// 		jwt_data.id,
// 		data.langid
// 	];
// 	console.log(data)
// 	pool.getConnection(function (err, conn) {
// 		if (err) {
// 			console.log('Error');
// 		} else {
// 			sql = conn.query('SELECT EXISTS(SELECT hdid,langid,langname FROM smsv2.`channel_lang` WHERE hdid = ?  AND langname = ? AND langid!=?)AS COUNT', [ data.hdid,data.langname,data.langid], function (err, result) {
// 				if (!err) {
// 					if (result[0].COUNT == 0) {
// 						sql = conn.query('UPDATE  smsv2.channel_lang SET  hdid = ?, langname = ?,cby=? WHERE langid=?', updatesata, function (err) {
// 							if (err) {
// 								console.log(sql.sql)
// 								Errorhandle('Language not Update');
// 							} else {
// 								console.log(sql.sql)
// 								Errorhandle('Language Updated Successfully', 1);

// 							}
// 						});
// 					} else {
// 						Errorhandle('Language Already Exist');
// 					}
// 				} else {
// 					console.log(sql.sql)
// 					Errorhandle('Pls Contact Admin')
// 				}
// 			});
// 		}
// 		function Errorhandle(msg, err_code = 0) {
// 			conn.release();
// 			res.end(JSON.stringify({ msg: msg,err_code: err_code}));
// 		}
// 	});
// }); 
















// channel.post('/getchanneledit', function (req, res) {
// 	console.log(' lang');
// 	var data = req.body,
// 		sql, sqlquery = 'SELECT c.chanid,c.channame,c.chanmode,c.chantype,u.fullname, c.genreid,c.langid,c.hdid,g.genrename,l.langname,h.hdname,c.bcid FROM smsv2.channel c INNER JOIN channel_genre g ON  g.genreid = c.genreid INNER JOIN channel_lang l ON  l.langid = c.langid INNER JOIN hd h ON h.hdid = c.hdid INNER JOIN users u ON u.id =  c.bcid ';
// 		if (data.hasOwnProperty('chanid') && data.chanid) {
// 			sqlquery += ` AND c.chanid =${data.chanid}`
// 		 }
// 		 if (data.hasOwnProperty('id') && data.id) {
// 			sqlquery += ` AND u.id =${data.id}`
// 		 }

// 	pool.getConnection(function (err, conn) {
// 		if (!err) {
// 			sql = conn.query(sqlquery,  function (err, result) {
// 				console.log(' lang id', sql.sql);
// 				conn.release();
// 				if (!err) {
// 					res.end(JSON.stringify(result[0]));
// 				}
// 			});
// 		}
// 	});
// });













module.exports = channel;