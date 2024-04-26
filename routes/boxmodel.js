
// *******************MODEL*********************//


"use strict";
var express = require('express'),
	compress = require('compression'),
	boxmodel = express.Router(),
	pool = require('../connection/conn');
const joiValidate = require('../schema/inventory');

async function addboxmodel(req) {
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 24 });
					await conn.rollback();
				}
				console.log('model Data', data);
				let addbox = await conn.query("SELECT COUNT(*) cnt FROM smsv2.boxmodel WHERE modelname ='" + data.modelname + "' AND hdid=" + hdid + "");
				if (addbox[0][0]['cnt'] == 0) {
					let status = data.status == true ? 1 : 0;
					let addbox = `INSERT INTO smsv2.boxmodel SET 
                    modelname='${data.modelname}',
                    hdid=${hdid},
                    hdcasid=${data.hdcasid},
                    vendorid=${data.vendorid},
                    stbtypeid=${data.stbtypeid},
                    chiptype=${data.chiptype},
                    status=${status},
                    cby=${jwtdata.id}`;
					console.log('ADD boxmodel Query: ', addbox);
					addbox = await conn.query(addbox);
					if (addbox[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD MODEL',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Model created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Model Not Created", err_code: 50 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Model  Already Exists.", err_code: 54 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes', err_code: 59 })

				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');

		} else {
			erroraray.push({ msg: "Contact Your Admin.", err_code: 67 })
			return;
		}
		if (conn) conn.release();
		console.log('Connection Closed--2');
		return resolve(erroraray);
	});
}

boxmodel.post('/addboxmodel', async (req, res) => {
	req.setTimeout(864000000);

	const validation = joiValidate.modelDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '389' }]);
	}
	let result = await addboxmodel(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});


boxmodel.post('/listboxmodel', function (req, res, err) {
	let jwtdata = req.jwt_data;
	console.log('JWT DATA', jwtdata);
	var where = [], commquery = '', data = req.body, sql
		, sqlquery = ' SELECT bm.bmid ,bm.hdid,bm.hdcasid,bm.modelname,bm.vendorid,h.hdname,hd.cas_name,bx.boxtypename,v.vendor_name,bm.stbtypeid,bm.chiptype,bm.cby,bm.lmby,bm.status FROM smsv2.`boxmodel` bm left join smsv2.hd_cas hd on bm.hdcasid=hd.hdcasid LEFT JOIN smsv2.hd  h ON bm.hdid=h.hdid LEFT JOIN smsv2.vendor v ON bm.vendorid=v.vendorid LEFT JOIN smsv2.boxtype bx ON bm.stbtypeid= bx.boxtypeid '
		, sqlqueryc = ' SELECT COUNT(*) count FROM smsv2.`boxmodel` bm left join smsv2.hd_cas hd on bm.hdcasid=hd.hdcasid LEFT JOIN smsv2.hd  h ON bm.hdid=h.hdid LEFT JOIN smsv2.vendor v ON bm.vendorid=v.vendorid LEFT JOIN smsv2.boxtype bx ON bm.stbtypeid= bx.boxtypeid '
		, finalresult = [];

	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' bm.hdid=' + data.hdid);
	if (jwtdata.role <= 777) where.push(' bm.hdid=' + jwtdata.hdid);
	if (jwtdata.role <= 777 && jwtdata.hdcasid != null && jwtdata.hdcasid != '') where.push(` bm.hdcasid IN (${jwtdata.hdcasid}) `);

	if (where.length > 0) commquery += ' WHERE ' + where.join(' AND ');
	sqlquery += commquery;
	sqlqueryc += commquery;

	sqlquery += ' LIMIT ?,? '
	console.log('LIMIT', data.index, data.limit);
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
 
boxmodel.post('/selectboxmodel', function (req, res) {
	var jwtdata = req.jwt_data, where = [], sql, data = req.body
	sqlquery = 'SELECT bmid,modelname,hdid,hdcasid,chiptype,stbtypeid FROM smsv2.boxmodel ';

	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`);
	if (jwtdata.role <= 777 && jwtdata.hdcasid != null && jwtdata.hdcasid != '') where.push(` hdcasid IN (${jwtdata.hdcasid}) `);
	if (data.hasOwnProperty('hdcasid') && data.hdcasid) where.push(` hdcasid =${data.hdcasid}`);
	if (data.hasOwnProperty('chiptype') && data.chiptype) where.push(` chiptype =${data.chiptype}`);
	if (data.hasOwnProperty('stbtypeid') && data.stbtypeid) where.push(` stbtypeid =${data.stbtypeid}`);
	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
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

boxmodel.post('/getboxmodel', function (req, res) {
	console.log('dsffd')
	var jwtdata = req.jwt_data, data = req.body, where = [],
		sqlquery = `SELECT m.hdid,m.hdcasid,m.modelname,t.boxtypename,m.chiptype, t.boxtypeid,m.bmid,m.stbtypeid FROM smsv2.boxmodel m INNER JOIN smsv2.boxtype t ON  m.stbtypeid=t.boxtypeid `;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` m.hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` m.hdid= ${jwtdata.hdid}`);
	if (jwtdata.role <= 777 && jwtdata.hdcasid != null && jwtdata.hdcasid != '') {
		if (jwtdata.hdcasid.length != 0) where.push(` m.hdcasid IN (${jwtdata.hdcasid}) `);
	}
	if (data.hasOwnProperty('hdcasid') && data.hdcasid) where.push(` m.hdcasid= ${data.hdcasid}`);

	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ')
		sqlquery += where
	}
	console.log('data', sqlquery);
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

async function editboxmodel(req) {
	console.log('update Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog = '';
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				let hdid = jwtdata.role > 777 ? data.hdid : jwtdata.hdid;
				console.log('Data', data);
				let checkprofile = await conn.query("SELECT * FROM smsv2.boxmodel WHERE bmid =" + data.bmid + " ");
				if (checkprofile[0].length == 1) {
					let cm = checkprofile[0][0];
					let status = data.status == true ? 1 : 0;
					let addbox = `UPDATE  smsv2.boxmodel SET 
                         status=${status},
                         lmby=${jwtdata.id}`;
					if (cm.hdid != hdid) {
						let [checkmodel] = await conn.query(`SELECT * FROM smsv2.boxmodel WHERE hdid=${hdid} and modelname='${data.modelname}'     `);
						console.log('checkmodel : ', checkmodel);
						if (checkmodel.length == 1) {
							erroraray.push({ msg: "Headend  Already Available .", err_code: 78 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) cm from 
															(select hdname from hd where hdid=${cm.hdid} ) a
															,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addbox += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].cm}.`
						}

					}
					if (cm.modelname != data.modelname) {
						let [checkmodel] = await conn.query(`SELECT * FROM smsv2.boxmodel WHERE  hdid=${hdid} and modelname='${data.modelname}'    `);
						console.log('checkmodel : ', checkmodel);
						if (checkmodel.length == 1) {
							erroraray.push({ msg: "Model Name  Already Available  .", err_code: 226 });
							await conn.rollback();
						} else {
							addbox += ` ,modelname='${data.modelname}'`;
							alog += ` Box Model   Changed from  ${cm.modelname} To ${data.modelname}.`
						}

					}
					if (cm.hdcasid != data.hdcasid) {
						let [checkmodel] = await conn.query(`SELECT * FROM smsv2.boxmodel WHERE  hdid=${hdid} and modelname='${data.modelname}'   `);
						console.log('checkmodel : ', checkmodel);
						if (checkmodel.length == 1) {
							erroraray.push({ msg: "Headend Cas   Already Available.", err_code: 238 });
							await conn.rollback();
						} else {
							let checkhdcasid = ` select concat(' From ',a.cas_name,' TO ',b.cas_name) cm from 
															(select cas_name from hd_cas where hdcasid=${cm.hdcasid} ) a
															,(select cas_name from hd_cas where hdcasid=${data.hdcasid} ) b `;
							checkhdcasid = await conn.query(checkhdcasid);
							addbox += ` ,hdcasid='${data.hdcasid}'`;
							alog += ` Headend CAS Changed ${checkhdcasid[0][0].cm}.`
						}

					}
					if (cm.vendorid != data.vendorid) {
						// let [checkmodel] = await conn.query(`SELECT * FROM smsv2.boxmodel WHERE modelname='${data.modelname}' and hdid=${hdid} and vendorid!=${cm.vendorid}  `);
						// console.log('checkmodel : ', checkmodel);
						// if (checkmodel.length == 1) {
						// 	erroraray.push({ msg: " Vendor Already Available  .", err_code: 254 });
						// 	await conn.rollback();
						// } else {
							// let checkvendorid = ` select concat(' From ',a.vendor_name,' TO ',b.vendor_name) cm from 
							// 								(select vendor_name from vendor where vendorid=${cm.vendorid} ) a
							// 								,(select vendor_name from vendor where vendorid=${data.vendorid} ) b `;
							// checkvendorid = await conn.query(checkvendorid);
							addbox += ` ,vendorid='${data.vendorid}'`;
							// alog += ` vendor Changed ${checkvendorid[0][0].cm}.`
						// }

					}

					if (cm.stbtypeid != data.stbtypeid) {

						let checkstbtypeid = ` select concat(' From ',a.boxtypename,' TO ',b.boxtypename) cm from 
															(select boxtypename from boxtype where boxtypeid=${cm.stbtypeid} ) a
															,(select boxtypename from boxtype where boxtypeid=${data.stbtypeid} ) b `;
						checkstbtypeid = await conn.query(checkstbtypeid);
						addbox += ` ,stbtypeid='${data.stbtypeid}'`;
						alog += ` Boxtype  Changed ${checkstbtypeid[0][0].cm}.`
					}


					if (cm.chiptype != data.chiptype) {
						addbox += ` ,chiptype='${data.chiptype}'`;
						alog += ` Chiptype  Changed from  ${cm.chiptype} To ${data.chiptyype}.`
					}



					addbox += ' WHERE bmid =' + data.bmid;
					console.log('Update boxmodel Query: ', addbox);
					addbox = await conn.query(addbox);
					if (addbox[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE BOXMODEL',`longtext`='" + alog + " DONE BY',hdid=" + jwtdata.hdid + ", usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Model Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 296 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Model already exits ", err_code: 300 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err', err_code: 305 })
				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 311 })
			return;
		}
		if (conn) conn.release();
		console.log('Connection Closed--2');
		return resolve(erroraray);
	});
}
boxmodel.post('/editboxmodel', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editmodelDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '324' }]);
	}
	let result = await editboxmodel(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});
module.exports = boxmodel;


// // *******************MODEL*********************//


// "use strict";
// var express = require('express'),
// 	compress = require('compression'),
// 	boxmodel = express.Router(),
// 	pool = require('../connection/conn');
// const joiValidate = require('../schema/inventory');


// boxmodel.post('/selectboxmodel', function (req, res) {

// 	var sql, data = req.body
// 	sqlquery = 'SELECT bmid,modelname,hdid,hdcasid,chiptype,stbtypeid FROM smsv2.boxmodel WHERE hdid=' + data.hdid;
// 	if (data.hasOwnProperty('hdcasid') && data.hdcasid) {
// 		sqlquery += ` AND hdcasid =${data.hdcasid}`;
// 	}
// 	if (data.hasOwnProperty('chiptype') && data.chiptype) {
// 		sqlquery += ` AND chiptype =${data.chiptype}`;
// 	}
// 	if (data.hasOwnProperty('stbtypeid') && data.stbtypeid) {
// 		sqlquery += ` AND stbtypeid =${data.stbtypeid}`;
// 	}

// 	pool.getConnection(function (err, conn) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			sql = conn.query(sqlquery, data.stb_id, function (err, result) {
// 				conn.release();
// 				if (!err) {
// 					res.end(JSON.stringify(result));
// 				}
// 			});
// 		}
// 	});
// });

// boxmodel.post('/getboxmodel', function (req, res) {
// 	console.log('dsffd')
// 	var data = req.body, where = [],
// 		sqlquery = `SELECT m.hdid,m.hdcasid,m.modelname,t.boxtypename,m.chiptype, t.boxtypeid,m.bmid,m.stbtypeid FROM smsv2.boxmodel m INNER JOIN smsv2.boxtype t ON  m.stbtypeid=t.boxtypeid`;
// 	if (data.hdid) {
// 		where.push(` m.hdid= ${data.hdid}`)
// 	}
// 	if (data.hdcasid) {

// 		where.push(` m.hdcasid= ${data.hdcasid}`)
// 	}
// 	if (where.length) where = ' WHERE' + where.join(' AND ')
// 	sqlquery += where
// 	console.log('data', sqlquery)
// 	pool.getConnection(function (err, conn) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			var sql = conn.query(sqlquery, function (err, result) {

// 				conn.release();
// 				if (!err) {
// 					res.end(JSON.stringify(result));
// 				}
// 			});
// 		}
// 	});
// });

// async function addboxmodel(req) {
// 	console.log('Add model Data:', req.jwt_data);
// 	return new Promise(async (resolve, reject) => {
// 		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
// 		let conn = await poolPromise.getConnection();
// 		if (conn) {
// 			await conn.beginTransaction();
// 			try {
// 				let hdid = jwtdata.role > 777 ? data.hdid : jwtdata.hdid;
// 				console.log('model Data', data);
// 				let addbox = await conn.query("SELECT COUNT(*) cnt FROM smsv2.boxmodel WHERE modelname ='" + data.modelname + "' AND hdid=" + hdid + "");
// 				if (addbox[0][0]['cnt'] == 0) {
// 					let status = data.status == true ? 1 : 0;
// 					let addbox = `INSERT INTO smsv2.boxmodel SET
//                     modelname='${data.modelname}',
//                     hdid=${data.hdid},
//                     hdcasid=${data.hdcasid},
//                     vendorid=${data.vendorid},
//                     stbtypeid=${data.stbtypeid},
//                     chiptype=${data.chiptype},
//                     status=${status},
//                     cby=${jwtdata.id}`;
// 					console.log('ADD boxmodel Query: ', addbox);
// 					addbox = await conn.query(addbox);
// 					if (addbox[0]['affectedRows'] > 0) {
// 						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD MODEL',`longtext`='DONE BY',cby=" + jwtdata.id;
// 						sqllog = await conn.query(sqllog);
// 						if (sqllog[0]['affectedRows'] > 0) {
// 							erroraray.push({ msg: " Model created Succesfully", err_code: 0 });
// 							await conn.commit();
// 						}
// 					} else {
// 						erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
// 						await conn.rollback();
// 					}
// 				} else {
// 					erroraray.push({ msg: " Model  Already Exists.", err_code: 1111 });
// 					await conn.rollback();
// 				}
// 			} catch (e) {
// 				console.log('Error ', e);
// 				erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })

// 				await conn.rollback();
// 			}
// 			console.log('Success--1');
// 			console.log('connection Closed.');
// 			conn.release();
// 		} else {
// 			erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
// 			return;
// 		}
// 		console.log('success--2');
// 		return resolve(erroraray);
// 	});
// }

// boxmodel.post('/addboxmodel', async (req, res) => {
// 	req.setTimeout(864000000);

// 	const validation = joiValidate.modelDataSchema.validate(req.body);
// 	if (validation.error) {
// 		console.log(validation.error.details);
// 		// return res.status(422).json({ msg: validation.error.details, err_code: '422' });
// 		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
// 	}
// 	let result = await addboxmodel(req);
// 	console.log("Process Completed", result);
// 	res.end(JSON.stringify(result));
// });
// boxmodel.post('/listboxmodel', function (req, res, err) {
// 	let jwtdata = req.jwt_data;
// 	console.log('JWT DATA',jwtdata);
// 	var where = [], commquery = '', data = req.body, sql, sqlquery = 'SELECT bm.bmid ,bm.hdid,bm.hdcasid,bm.modelname,bm.vendorid,h.hdname,hd.cas_name,bx.boxtypename,v.vendor_name,bm.stbtypeid,bm.chiptype,bm.cby,bm.lmby,bm.status FROM smsv2.`boxmodel` bm left join smsv2.hd_cas hd on bm.hdcasid=hd.hdcasid LEFT JOIN smsv2.hd  h ON bm.hdid=h.hdid LEFT JOIN smsv2.vendor v ON bm.vendorid=v.vendorid LEFT JOIN smsv2.boxtype bx ON bm.stbtypeid= bx.boxtypeid ',

// 		sqlqueryc = 'SELECT COUNT(*)count FROM smsv2.`boxmodel` bm left join smsv2.hd_cas hd on bm.hdcasid=hd.hdcasid LEFT JOIN smsv2.hd  h ON bm.hdid=h.hdid LEFT JOIN smsv2.vendor v ON bm.vendorid=v.vendorid LEFT JOIN smsv2.boxtype bx ON bm.stbtypeid= bx.boxtypeid  ', finalresult = [];

// 	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' bm.hdid=' + data.hdid);
// 	if (jwtdata.role <= 777) where.push(' bm.hdid=' + jwtdata.hdid);


// 	if (where.length > 0) commquery += ' WHERE ' + where.join(' AND ');
// 	sqlquery += commquery;
// 	sqlqueryc += commquery;

// 	sqlquery += ' LIMIT ?,? '
// 	console.log('LIMIT',data.index, data.limit);
// 	pool.getConnection(function (err, conn) {
// 		if (!err) {
// 			sql = conn.query(sqlquery, [data.index, data.limit], function (err, result) {
// 				if (!err) {
// 					finalresult.push(result);
// 					sql = conn.query(sqlqueryc, function (err, result) {
// 						conn.release();
// 						if (!err) {
// 							finalresult.push(result[0]);
// 							res.end(JSON.stringify(finalresult));
// 						} else {
// 							console.log('err');
// 						}
// 					});
// 				} else {
// 					conn.release();
// 				}
// 			});
// 		}
// 	});
// });
// async function editboxmodel(req) {
// 	console.log('update Data:', req.jwt_data);
// 	return new Promise(async (resolve, reject) => {
// 		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
// 		let conn = await poolPromise.getConnection();
// 		if (conn) {
// 			await conn.beginTransaction();
// 			try {
// 				let hdid = jwtdata.role > 777 ? data.hdid : jwtdata.hdid;
// 				console.log('Data', data);
// 				let checkprofile = await conn.query("SELECT COUNT(*)cnt FROM smsv2.boxmodel WHERE bmid =" + data.bmid + " AND modelname != '" + data.modelname + "' ");
// 				if (checkprofile[0][0]['cnt'] == 0) {
// 					let status = data.status == true ? 1 : 0;
// 					let addbox = `UPDATE  smsv2.boxmodel SET
//                         bmid=${data.bmid},
//                          hdid=${hdid},
//                          hdcasid=${data.hdcasid},
// 						 modelname='${data.modelname}',
//                          vendorid=${data.vendorid},
//                          stbtypeid=${data.stbtypeid},
//                          chiptype=${data.chiptype},
//                          status=${status},
//                          lmby=${jwtdata.id}`;
// 					addbox += ' WHERE bmid =' + data.bmid
// 					console.log('Update boxmodel Query: ', addbox);
// 					addbox = await conn.query(addbox);
// 					if (addbox[0]['affectedRows'] > 0) {
// 						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE boxmodel',`longtext`='DONE BY',cby=" + jwtdata.id;
// 						sqllog = await conn.query(sqllog);
// 						if (sqllog[0]['affectedRows'] > 0) {
// 							erroraray.push({ msg: " model Updated Succesfully", err_code: 0 });
// 							await conn.commit();
// 						}
// 					} else {
// 						erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
// 						await conn.rollback();
// 					}
// 				} else {

// 					erroraray.push({ msg: " model already Exits ", err_code: 1111 });
// 					await conn.rollback();
// 				}

// 			} catch (e) {
// 				console.log('Error ', e);
// 				erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
// 				await conn.rollback();
// 			}
// 			console.log('Success--1');
// 			console.log('connection Closed.');
// 			conn.release();
// 		} else {
// 			erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
// 			return;
// 		}
// 		console.log('success--2');
// 		return resolve(erroraray);
// 	});
// }
// boxmodel.post('/editboxmodel', async (req, res) => {
// 	req.setTimeout(864000000);
// 	const validation = joiValidate.editmodelDataSchema.validate(req.body);
// 	if (validation.error) {
// 		console.log(validation.error.details);
// 		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
// 	}
// 	let result = await editboxmodel(req);
// 	console.log("Process Completed", result);
// 	res.end(JSON.stringify(result));

// });
// module.exports = boxmodel;