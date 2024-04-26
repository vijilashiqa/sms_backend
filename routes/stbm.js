"use strict";
const e = require('express');

var express = require('express'),
	compress = require('compression'),
	stbm = express.Router(),
	pool = require('../connection/conn'),
	poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/stbm');
let casconn = require('./casconn');
async function delay(ms) {
	// return await for better async stack trace support in case of errors.
	return await new Promise(resolve => setTimeout(resolve, ms));
}

async function addbulkstb(req) {
	// console.log('Add stbdetail Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data, modeltype = '', boxstatus = false, getcas = '', logstatus = false, modestatus = false;
		// let status = data.status == true ? 1 : 0;

		console.log('Add file', data.bulkstb.length);
		for (var i = 0; i < data.bulkstb.length; i++) {
			let ij = data.bulkstb[i];
			// console.log(ij);
			let boxvc = {
				hdid: data.hdid,
				casid: data.casid,
				modelid: data.modelid,
				stockinwardid: data.stockinwardid,
				stb_type: data.stb_type,
				lcoid: data.lcoid,
				usertype: data.usertype,
				boxno: ij.boxno == null ? '' : ij.boxno,
				vcid: ij.vcid == null ? '' : ij.vcid,
				jwtdata: jwtdata
			}

			console.log(i, 'boxvc', boxvc);
			let [res] = await addstb(boxvc);
			if (ij.boxno) { res['stb_no_or_vc'] = ij.boxno } else { res['stb_no_or_vc'] = ij.vcid }
			console.log('res ---\n\r', res);
			erroraray.push(res);


		}

		resolve(erroraray);
	});
}

stbm.post('/addbulkstb', async (req, res) => {
	req.setTimeout(864000000);
	let result = await addbulkstb(req);
	console.log('Process Completed', result);
	res.end(JSON.stringify(result));

});


async function addstb(req) {
	// console.log('Add stbdetail Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body == null ? req : req.body, jwtdata = req.jwt_data == null ? req.jwtdata : req.jwt_data, modeltype = '', modestatus = false, vc_num, checkstb = '', getcas = '', checkvc = '';
		// let status = data.status == true ? 1 : 0;
		console.log('addstb Data', data);
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				let hdid = '', addmode = 4;
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 78 });
					await conn.rollback();
				}

				let checkbox = `SELECT (SELECT qty FROM smsv2.material_detail WHERE stockinid =${data.stockinwardid} AND boxmodelid =${data.modelid} ) -
				COUNT(boxid) cnt FROM smsv2.box WHERE stockinwardid =${data.stockinwardid} AND modelid =${data.modelid}`;
				console.log('Box count query', checkbox);
				let checkprofile = await conn.query(checkbox), boxsql = '', vcExists = '', addvc = '', addbox = '';
				if (checkprofile[0][0]['cnt'] != 0) {
					checkstb = `SELECT  count(*) cnt FROM smsv2.box WHERE box.hdid=${hdid} and  box.boxno='${data.boxno}' and casid=${data.casid}`;
					checkvc = `SELECT count(*) cnt FROM smsv2.boxvc vc WHERE  vc.hdid=${hdid} and vc.vcno='${data.vcid}' and casid=${data.casid}`;
					getcas = ` select * from hd_cas where hdcasid=` + data.casid;
					if (data.boxno != '' && data.vcid == '') {
						boxsql = await conn.query(checkstb);
						console.log('Check Box :', boxsql[0]);
						if (boxsql[0][0]['cnt'] >= 1) {
							erroraray.push({ msg: 'box already exists', err_code: 104,});
							await conn.rollback();
						} else {
							addmode = 1;		// box
						}
					}
					if (data.boxno == '' && data.vcid != '') {
						vcExists = await conn.query(checkvc);
						if (vcExists[0][0]["cnt"] >= 1) {
							erroraray.push({ msg: 'VC Number already exists', err_code: '112'});
							await conn.rollback();
						} else {
							addmode = 2;		// vc
						}
					}
					if (data.boxno != '' && data.vcid != '') {
						boxsql = await conn.query(checkstb);
						if (boxsql[0][0]['cnt'] >= 1) {
							erroraray.push({ msg: 'box already exists', err_code: 104 });
							await conn.rollback();
						} else {
							vcExists = await conn.query(checkvc);
							if (vcExists[0][0]["cnt"] >= 1) {
								erroraray.push({ msg: 'VC Number already exists', err_code: '112' });
								await conn.rollback();
							} else {
								addmode = 3;
							}
						}

					}
					if (data.boxno != '') {
						addbox = ` INSERT INTO smsv2.box SET boxno='${data.boxno}',hdid=${data.hdid},
						casid=${data.casid},modelid=${data.modelid},stockinwardid=${data.stockinwardid},lcoid=${data.lcoid},
						cby=${jwtdata.id}`;
						// addbox = await conn.query(addbox);
						console.log('addbox', addbox);
					}
					if (data.vcid != '') {
						addvc = `INSERT INTO smsv2.boxvc SET  vcno='${data.vcid}',hdid=${data.hdid}, modelid=${data.modelid},
								casid=${data.casid},lcoid=${data.lcoid},cby=${jwtdata.id}`;

						console.log('addvc', addvc);
					}
					if (addmode == 1) {
						console.log('addbox', addbox);		// add box only
						addbox = await conn.query(addbox);
						if (addbox[0]['affectedRows'] > 0 && addbox[0]['insertId'] > 0) {
							modestatus = true;
						}
					}
					if (addmode == 2 || addmode == 3) {			// add both 
						if (addmode == 3) addvc += `,pairflg=1`;
						addvc = await conn.query(addvc);
						// console.log('addvc',addvc)
						if (addvc[0]['affectedRows'] > 0 && addvc[0]['insertId'] > 0) {
							if (addmode == 3) {
								addbox += ` ,pairflg=1,vcid=` + addvc[0]['insertId'];
								addbox = await conn.query(addbox);
								if (addbox[0]['affectedRows'] > 0 && addbox[0]['insertId'] > 0) modestatus = true;
							} else {
								modestatus = true;
							}
						}
					}


					if (modestatus) {
						console.log("add mode :", addmode);
						getcas = await conn.query(getcas);
						if (getcas[0].length == 1) {
							let casres = '', casresta = '';
							getcas = getcas[0][0];

							console.log("getcas :", getcas);
							if (getcas) {
								if (getcas.casid == 11) {
									if (data.vcid == null || data.vcid == '' || data.boxno == null || data.boxno == '') {
										erroraray.push({ msg: "VC OR BOX Number Required", err_code: 160 });
										await conn.rollback();
									} else {
										casres = await casconn.pairingprocess(getcas.casid, data.vcid, data.boxno, 1, getcas.port, getcas.ip);
									}
								}
								if (getcas.casid == 13) {
									if (data.vcid == null || data.vcid == '' || data.boxno == null || data.boxno == '') {
										erroraray.push({ msg: "VC OR BOX Number Required", err_code: 168 });
										await conn.rollback();
									} else {
										casres
										if (addmode != 1) {
											//terminal activation 
											casresta = await casconn.bulkTerminal({ ter: [{ stb_no: data.vcid, port: getcas.port, ip: getcas.ip }] });
											// console.log('--------------', casresta);
											if (casresta != '') {
												console.log('-djfg----dvb----', casresta[0]);
												if (casresta[0]['err_code'] == 0) {
													if (addmode != 2) {
														console.log(getcas.casid, data.vcid, data.boxno, 1, getcas.port, getcas.ip);
														casres = await casconn.pairingprocess(getcas.casid, data.vcid, data.boxno, 1, getcas.port, getcas.ip);
														console.log('casres ', casres);
														if (casres == 0) {
															erroraray.push({ msg: " Created Succesfully", err_code: 0 });
															// await conn.rollback();
															await conn.commit();
														} else {
															erroraray.push({ msg: "BOX Pairing Failed.", err_code: 188 });
															await conn.rollback();
														}
													} else {
														erroraray.push({ msg: "Added Succesfully.", err_code: 0 });
														await conn.commit();
													}
												} else {
													erroraray.push({ msg: "BOX Terminal Activation Failed.", err_code: 196 });
													await conn.rollback();
												}
											}
										}
									}
								}
								if (getcas.casid == 14) { casres = casres.resultCode; }     // SafeView
								if (getcas.casid == 13 || getcas.casid == 11) { casres = ('00000000' + casres.toString(16)).slice(-8); }  // Gospell and Gospell ADV
								if (getcas.casid == 12) { 			// B CAS
									console.log('B-CAS', getcas.casid, data.vcid, data.boxno, 1, getcas.port, getcas.ip);
									casres = await casconn.pairingprocess(getcas.casid, data.vcid, data.boxno, 1, getcas.port, getcas.ip);
									console.log('B cas res ', casres);
									casres = casres.slice(0, -8);
								}
								console.log(casres);
								if (casres == 'STB in use!' || casres == 0) {
									erroraray.push({ msg: " Created Succesfully", err_code: 0 });
									// await conn.rollback();
									await conn.commit();
								} else {
									erroraray.push({ msg: "BOX Pairing Failed.", err_code: 217 });
									await conn.rollback();
								}
							}
						} else {
							// error hdcas details cant find
							erroraray.push({ msg: 'HD Cas detail Not Found', err_code: '224' })
							await conn.rollback();
						}
					}
				}
				else {
					erroraray.push({ msg: "No Boxes to Upload", err_code: 234 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes Error', err_code: '239' })
				await conn.rollback();
			}
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 245 })
			return;
		}
		console.log('success--2', erroraray);
		return resolve(erroraray);

	});
}



stbm.post('/stblist', function (req, res, err) {
	console.log('bbfjh')
	var jwtdata = req.jwt_data, where = [], sql, sqlquery =
		`    	
		SELECT  h.hdname,c.cas_name,bm.modelname,s.invoiceno,bx.boxid,bx.boxno,bv.vcno,sb.userid,u.usertype,u.fullname,bv.pairflg,u.profileid,sb.custid,sb.profileid,bx.cdate
		,IF(bx.custid IS NULL,'STB Not Assigned',sb.fullname) subscriber_name FROM smsv2.box bx
		LEFT JOIN hd h ON bx.hdid=h.hdid
		LEFT JOIN subscriber sb ON bx.custid=sb.custid
		LEFT JOIN hd_cas c ON bx.casid=c.hdcasid
		LEFT  JOIN boxmodel bm ON bx.modelid=bm.bmid
		LEFT JOIN  stock_inward s ON bx.stockinwardid=s.stockinid
		LEFT JOIN boxvc bv ON bx.vcid= bv.vcid
		LEFT JOIN users u ON bx.lcoid=u.id`,
		sqlqueryc = `SELECT COUNT(*) AS count    FROM smsv2.box bx
		LEFT JOIN hd h ON bx.hdid=h.hdid
		LEFT JOIN subscriber sb ON bx.custid=sb.custid
		LEFT JOIN hd_cas c ON bx.casid=c.hdcasid
		LEFT  JOIN boxmodel bm ON bx.modelid=bm.bmid
		LEFT JOIN  stock_inward s ON bx.stockinwardid=s.stockinid
		LEFT JOIN boxvc bv ON bx.vcid= bv.vcid
		LEFT JOIN users u ON bx.lcoid=u.id`

		, finalresult = [],
		data = req.body;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' bx.hdid=' + data.hdid);
	if (jwtdata.role <= 777) where.push(' bx.hdid=' + jwtdata.hdid);
	if (jwtdata.role > 777 && data.role != '' && data.role != null) where.push(' u.usertype=' + data.role);
	if (jwtdata.role <= 777) where.push(' u.usertype=' + jwtdata.role);
	if (jwtdata.role > 777 && data.id != '' && data.id != null) where.push(' bx.lcoid=' + data.id);
	if (jwtdata.role <= 777) where.push(' bx.lcoid=' + jwtdata.id);
	if (data.custid != '' && data.custid != null) where.push(' bx.custid=' + data.custid);
	if (data.bmid != '' && data.bmid != null) where.push(' bx.modelid=' + data.bmid);
	if (data.boxid != '' && data.boxid != null) where.push(' bx.boxid=' + data.boxid);
	if (data.vcid != '' && data.vcid != null) where.push(' bx.vcid=' + data.vcid);
	if (data.pairflg != '' && data.pairflg != null) where.push(' bx.pairflg=' + data.pairflg);
	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ')
		sqlquery += where;
		sqlqueryc += where;
	}
	if (data.index != null) console.log('-----');
	if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
	console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
	// sqlquery += ' LIMIT ?,? '
	console.log('list channel ...', sqlquery);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				if (!err) {
					finalresult.push(result);
					sql = conn.query(sqlqueryc, function (err, result) {
						conn.release();
						console.log(sql.sql)
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

stbm.post('/selectbox', function (req, res) {
	var sql, data = req.body
	sqlquery = 'SELECT bmid,modelname,hdid,hdcasid,chiptype,stbtypeid FROM smsv2.boxmodel WHERE hdid=' + data.hdid;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`);
	if (data.hasOwnProperty('hdcasid') && data.hdcasid) {
		sqlquery += ` AND hdcasid =${data.hdcasid}`;
	}
	if (data.hasOwnProperty('chiptype') && data.chiptype) {
		sqlquery += ` AND chiptype =${data.chiptype}`;
	}
	if (data.hasOwnProperty('stbtypeid') && data.stbtypeid) {
		sqlquery += ` AND stbtypeid =${data.stbtypeid}`;
	}
	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
	}
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log(err);
		} else {
			sql = conn.query(sqlquery, data.stb_id, function (err, result) {
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result));
				}
			});
		}
	});
});
stbm.post('/getbox', function (req, res) {
	var sql, data = req.body, jwtdata = req.jwt_data, where = [],
		sqlquery = `SELECT bx.boxid,bx.boxno,bx.casid,bx.pairflg,bx.custid FROM smsv2.box bx  `;
	console.log('getbox', data);
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` bx.hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` bx.hdid= ${jwtdata.hdid}`);
	// if (data.hasOwnProperty('casid') && data.casid) where.push(`  bx.casid =${data.casid} `);
	if (data.hasOwnProperty('userid') && data.userid) where.push(` bx.lcoid =${data.userid} `);
	if (data.hasOwnProperty('pairstatus') && (data.pairstatus == 0 || data.pairstatus == 1)) where.push(` bx.pairflg!=${data.pairstatus} AND  bx.custid is null `);
	// if (data.hasOwnProperty('pairstatus') && data.pairstatus) where.push(` bx.custid is null `);
	if (data.hasOwnProperty('like') && data.like) where.push(`   bx.boxno LIKE '%${data.like}%' `);
	if (data.hasOwnProperty('custid') && data.custid) where.push(`   bx.custid = ${data.custid} `);

	if (where.length > 0) {
		where = ' WHERE ' + where.join(' AND ');
		sqlquery += where;
	}
	// sqlquery += ` limit 1`;
	console.log('GET BOX Query : ', sqlquery);
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log(err);
		} else {
			sql = conn.query(sqlquery, function (err, result) {
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result));
				} else {
					console.log('err', err);
				}
			});
		}
	});
});

stbm.post('/getoperatortype', function (req, res) {

	var sql, data = req.body
	console.log('cbjdcj', data)
	let sqlquery = `select id, business_name, dist_or_sub_flg from smsv2.users where usertype=${data.usertype} AND hdid=${data.hdid}`
	//  WHERE hdid=${data.hdid} AND vcid=${data.vcid}`
	//  if (data.hasOwnProperty('hdid') && data.hdid) {
	// 	sqlquery += ` AND hdid =${data.hdid}`;
	//  }
	//  if (data.hasOwnProperty('vcno') && data.vcno) {
	//  	sqlquery += ` AND vcno =${data.vcno}`;
	//  }
	// if (data.hasOwnProperty('stbtypeid') && data.stbtypeid) {
	// 	sqlquery += ` AND stbtypeid =${data.stbtypeid}`;
	// }

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

stbm.post('/getstblist', function (req, res) {
	console.log('listttttttttttt')
	var data = req.body, where = [], jwtdata = req.jwt_data,

		sqlquery = `SELECT s.stockinid,s.invoiceno FROM smsv2.stock_inward s LEFT JOIN material_detail m ON m.boxmodelid=s.stockinid `;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`);
	// if (data.hdid) {
	// 	where.push(`where s.hdid= ${data.hdid}`)
	// }
	// if ( data.boxmodelid) {

	// 	where.push(`m.boxmodelid= ${data.boxmodelid}` )
	// }
	// if (where.length) where = ' WHERE' + where.join(' AND ')
	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
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

stbm.post('/getboxtype', function (req, res) {
	var data = req.body, where = [], jwtdata = req.jwt_data,
		sqlquery = `SELECT boxtypeid,hdid,boxtypename FROM smsv2.boxtype  `;
	// if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid}`);
	// if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`);
	// if (data.hasOwnProperty('boxtypeid') && data.boxtypeid) where = ` AND boxtypeid= ${data.boxtypeid}`;
	if (data.hasOwnProperty('boxtypeid') && data.boxtypeid) where.push(` boxtypeid =${data.boxtypeid} `);
	// if (where.length > 0) {
	// 	where = ' WHERE' + where.join(' AND ');
	// 	sqlquery += where;

	// }
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
stbm.post('/selectstbm', function (req, res) {
	var jwtdata = req.jwt_data, sql, where = [], data = req.body
	sqlquery = 'SELECT bmid,modelname,hdid,hdcasid,chiptype,stbtypeid FROM smsv2.boxmodel WHERE hdid=' + data.hdid;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`);
	if (data.hasOwnProperty('hdcasid') && data.hdcasid) {
		sqlquery += ` AND hdcasid =${data.hdcasid}`;
	}
	if (data.hasOwnProperty('chiptype') && data.chiptype) {
		sqlquery += ` AND chiptype =${data.chiptype}`;
	}
	if (data.hasOwnProperty('stbtypeid') && data.stbtypeid) {
		sqlquery += ` AND stbtypeid =${data.stbtypeid}`;
	}
	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
	}

	pool.getConnection(function (err, conn) {
		if (err) {
			console.log(err);
		} else {
			sql = conn.query(sqlquery, data.stb_id, function (err, result) {
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result));
				}
			});
		}
	});
});

async function addstbpair(req) {
	// console.log('Add stbdetail Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
		//  let pairstatus = data.pairstatus == true ? 1 : 0;
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {

				console.log('Data', data);
				let checkstb = await conn.query(`SELECT * FROM (
					(SELECT bv.vcid,bv.hdid vhdid,bv.pairflg  vcpair_flag,bv.vcno,bv.casid vcasid,c.casid hdcasid,c.ip,c.port,bv.lcoid FROM smsv2.boxvc bv INNER JOIN smsv2.hd_cas c ON c.hdid=bv.hdid AND c.hdcasid=bv.casid WHERE  bv.vcid=${data.vcid})a,
					(SELECT bx.boxid,bx.pairflg boxpair_flag,bx.hdid bhdid,bx.vcid,bx.boxno,bx.casid bcasid,bx.custid,bx.lcoid FROM smsv2.box bx WHERE bx.boxid=${data.boxno})b)`)
				console.log('Box count query', checkstb[0]);

				if (checkstb[0].length > 0) {
					let checkdata = checkstb[0][0];
					if (data.lcoid != null && data.lcoid != '') {
						if (checkdata.lcoid != checkdata.lcoid) {
							erroraray.push({ msg: 'BOX and VC LCO Is Different.', err_code: 563 });
							await conn.rollback();
						}
					}
					if (data.pairstatus == 1) {   //Pair
						if (checkdata.boxpair_flag == 1) {
							erroraray.push({ msg: 'STB   Already Paired ', err_code: 'ERR' });
							await conn.rollback();
						}
						if (checkdata.vcpair_flag == 1) {
							erroraray.push({ msg: 'VC   Already Paired ', err_code: 'ERR' });
							await conn.rollback();
						}
						if (checkdata.vcasid != checkdata.bcasid) {
							erroraray.push({ msg: 'BOX and VC CAS Is Different.', err_code: 563 });
							await conn.rollback();
						}
						if (checkdata.custid != null && checkdata.custid != '') {
							erroraray.push({ msg: 'BOX Already Assigned.', err_code: 567 });
							await conn.rollback();
						}


						let update1 = `UPDATE smsv2.box bx,smsv2.boxvc bv SET bx.vcid=${data.vcid},bx.pairflg=${data.pairstatus},bv.pairflg=${data.pairstatus} WHERE bx.boxid=${data.boxno} AND bv.vcid=${data.vcid} `;
						let addchn = await conn.query(update1);
						if (addchn[0]['affectedRows'] > 0) {
							let sqllog = `INSERT INTO smsv2.BoxVcPairLog SET
							hdid=${data.hdid},
							vcid=${data.vcid},
							boxid=${data.boxno},
							pairstatus=${data.pairstatus},						
							cby=${jwtdata.id}`;
							sqllog = await conn.query(sqllog);
							if (sqllog[0]['affectedRows'] > 0) {

								let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD MODEL',`longtext`='DONE BY',hdid=" + data.hdid + ",cby=" + jwtdata.id;
								sqllog = await conn.query(sqllog);
								if (sqllog[0]['affectedRows'] > 0) {

									let casres = await casconn.pairingprocess(checkdata.hdcasid, checkdata.vcno, checkdata.boxno, data.pairstatus, checkdata.port, checkdata.ip);
									console.log('casres : ', casres);
									if (checkdata.hdcasid == 14) { casres = casres.resultCode; }     // SafeView
									else if (checkdata.hdcasid == 13 || checkdata.hdcasid == 11) { casres = ('00000000' + casres.toString(16)).slice(-8); }  // Gospell and Gospell ADV
									else if (checkdata.hdcasid == 12) { 			// B CAS
										if (casres == 0) { casres = 0 }
										if (casres != 0) {
											casres = casres.slice(0, -8);
											if (casres == 'STB in use!') { casres = 0 } else { casres = casres.slice(0, -8); }
										}
									}
									if (casres == 0) {
										//sucess
										erroraray.push({ msg: " BoxVcPairLog created Succesfully", err_code: 0 });
										await conn.commit();
									} else {
										// Failed
									}
								}
							} else {
								erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
								await conn.rollback();
							}

						} else {
							erroraray.push({ msg: "Please Check Package ID", err_code: 1111 });
							await conn.rollback();
						}

						// Do Update Query for pair
						// In box table update paiflg, vcid,vcno with incoming data
						// In vc table updte pairflg

						// after do insert query in boxvcpair log and activity log




					} else {        // Unpair

						if (checkdata.boxpair_flag == 0) {
							erroraray.push({ msg: 'STB  Already UnPaired ', err_code: 'ERR' })
							await conn.rollback()
						}
						if (checkdata.vcpair_flag == 0) {
							erroraray.push({ msg: 'VC  Already UnPaired ', err_code: 'ERR' })
							await conn.rollback()
						}
						let update1 = ` UPDATE smsv2.box bx SET bx.pairflg=${data.pairstatus},bx.vcid=NULL WHERE bx.boxid=${data.boxno} AND bx.hdid=${data.hdid}  `
						let update2 = `UPDATE smsv2.boxvc  bv SET bv.pairflg=${data.pairstatus} WHERE bv.vcid=${data.vcid} AND hdid=${data.hdid}`
						update1 = await conn.query(update1);
						if (update1[0]['affectedRows'] > 0) {
							update2 = await conn.query(update2);
							if (update2[0]['affectedRows'] > 0) {
								let sqllog = `INSERT INTO smsv2.BoxVcPairLog SET
								hdid=${data.hdid},
								vcid=${data.vcid},
								boxid=${data.boxno},
								pairstatus=${data.pairstatus},						
								cby=${jwtdata.id}`;
								sqllog = await conn.query(sqllog);
								if (sqllog[0]['affectedRows'] > 0) {

									let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD MODEL',`longtext`='DONE BY',hdid=" + data.hdid + ",cby=" + jwtdata.id;
									sqllog = await conn.query(sqllog);
									if (sqllog[0]['affectedRows'] > 0) {
										erroraray.push({ msg: " BoxVcPairLog created Succesfully", err_code: 0 });
										await conn.commit();
									}
								}


							} else {
								erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
								await conn.rollback();
							}

						} else {
							erroraray.push({ msg: "Please Check Package ID", err_code: 1111 });
							await conn.rollback();
						}


						// Do update query for unpair
						// In box table do update for paiflg and empty two fields vcid and vcno
						// In vc table update pairflg status to unpair


						// after do insert query in boxvcpair log and activity log



					}

				} else {
					erroraray.push({ msg: 'Check VC or BOX Number.', err_code: 672 })
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
stbm.post('/addstbpair', async (req, res) => {
	req.setTimeout(864000000);
	// const validation = joiValidate.stbmDataSchema.validate(req.body);
	// if (validation.error) {
	// 	console.log(validation.error.details);
	// 	return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	// }
	let result = await addstbpair(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});


stbm.post('/addstb', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.stbmDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await addstb(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});




stbm.post('/getboxvc', function (req, res) {
	var sql, data = req.body, jwtdata = req.jwt_data, where = [],
		sqlquery = `SELECT bv.vcid,bv.vcno,bv.casid,bv.pairflg FROM smsv2.boxvc bv  `;
	console.log('data', data);
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` bv.hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` bv.hdid= ${jwtdata.hdid}`);
	if (data.hasOwnProperty('casid') && data.casid) {
		where.push(`bv.casid =${data.casid}`);
	}
	if (data.hasOwnProperty('userid') && data.userid) {
		where.push(` bv.lcoid =${data.userid} `);
	}
	if (data.hasOwnProperty('pairstatus') && data.pairstatus) {
		where.push(`  bv.pairflg!=${data.pairstatus}`);
	}
	if (data.hasOwnProperty('like') && data.like) {
		where.push(`  bv.vcno LIKE '%${data.like}%'`);
	}
	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
	}
	// sqlquery += ` limit 1`;
	console.log('GET BOXVC Query : ', sqlquery);
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log(err);
		} else {
			sql = conn.query(sqlquery, function (err, result) {
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result));
				} else {
					console.log('err', err);
				}
			});
		}
	});
});
stbm.post('/getboxvcpair', function (req, res) {

	var sql, data = req.body, jwtdata = req.jwt_data, where = [],
		sqlquery = ` SELECT bx.boxid,bx.boxno,bx.casid,bx.pairflg,vc.vcno,bx.vcid FROM smsv2.box bx INNER JOIN smsv2.boxvc vc ON bx.vcid=vc.vcid 
		WHERE bx.pairflg=1 and bx.custid IS NULL `;

	console.log('data', data);
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` AND bx.hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` bx.hdid= ${jwtdata.hdid}`);
	if (data.hasOwnProperty('casid') && data.casid) {
		where.push(` bx.casid =${data.casid}`);
	}

	if (data.hasOwnProperty('vc_like') && data.vc_like) {
		where.push(` vc.vcno like '%${data.vc_like}%'`);
	}
	if (data.hasOwnProperty('box_like') && data.box_like) {
		where.push(` bx.boxno like '%${data.box_like}%'`);
	}
	if (where.length > 0) {
		where = where.join(' AND ');
		sqlquery += where;
	}
	console.log('GET BOXVCPAIR Query : ', sqlquery);
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log(err);
		} else {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log('sql :', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result));
				}
			});
		}
	});
});
stbm.post('/getboxpair', function (req, res) {

	var sql, data = req.body, jwtdata = req.jwt_data, where = [],
		sqlquery = `SELECT bx.vcid,bx.boxid,bx.boxno,bx.vcno,bx.hdid,bx.pairflg,bx.casid FROM smsv2.box bx  `;
	console.log('data', data)
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` bx.hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(` bx.hdid= ${jwtdata.hdid}`);

	if (data.hasOwnProperty('casid') && data.casid) {
		sqlquery += ` AND bx.casid =${data.casid}`;
	}
	if (data.hasOwnProperty('boxno') && data.boxno) {
		sqlquery += ` AND bx.boxno like  %${data.boxno}%`;
	}

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
stbm.post('/ searchgetboxpair', function (req, res) {

	var sql, data = req.body,
		sqlquery = `SELECT bx.vcid,bx.boxid,bx.boxno,bv.vcno,bx.hdid,bx.pairflg,bx.casid FROM smsv2.box bx  `;
	console.log('data', data)


	if (data.hasOwnProperty('casid') && data.casid) {
		sqlquery += ` AND bx.casid =${data.casid}`;
	}
	if (data.hasOwnProperty('boxno') && data.boxno) {
		sqlquery += ` AND bx.boxno like  %${data.boxno}%`;
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

/******** stb tranfer
				  1. custid shold be null in box tabel
				  2. if the box is given to operator then fuserid and tuserid
				  check the box and vc are pair------- 
				  @ if pair(1):-                    //change type 2 for paired 
				  update to both tabel box and vc
				  @ if pair(0):-                       //change type 1 & 3 unpaired
				  1. move only box then update to box
				  2. move only vc then update to vc  ***************************/
async function addbulkstbtransfer(req) {
	return new Promise(async (resolve, reject) => {
		var data = req.body, erroraray = [], status = true, jwtdata = req.jwt_data;
		let conn = await poolPromise.getConnection();
		if (conn) {
			console.log('Add file', data.bulkdata.length);
			for (var i = 0; i < data.bulkdata.length; i++) {
				await conn.beginTransaction();
				let data = data.bulkdata[i];
				console.log('client data', bulkup);
				console.log('data', data)
				try {
					let hdid = '';
					if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
					if (jwtdata.role <= 777) hdid = jwtdata.hdid;
					if (hdid == '' || hdid == null) {
						erroraray.push({ msg: "Please Select Headend.", err_code: 78 });
						await conn.rollback();
					}
					console.log('STB Transfer Req Data', data);
					if (data.changetype == 1) {
						let checkpair = `Select count(*) cnt from smsv2.box where boxid=${bulkup.boxid}  and hdid=${data.hdid} and lcoid=${data.fuserid} and custid is null
						and pairflg=0`;
						box = await conn.query(checkpair);
						console.log('Check Box :', box[0]);
						if (box[0][0]['cnt'] != 0) {
							let updatebox = `UPDATE smsv2.box SET lcoid=${data.tuserid} WHERE boxid = ${bulkup.boxid}`
							updatebox = await conn.query(updatebox);

						} else {
							erroraray.push({ msg: 'box already assigned to Operator', err_code: 104, });
							await conn.rollback();
						}
					}
					if (data.changetype == 3) {

						let checkvcpair = `Select count(*) cnt from smsv2.boxvc where vcid=${bulkup.vcid}  and hdid=${data.hdid} and lcoid=${data.fuserid} and custid is null
						and pairflg=0`;
						vc = await conn.query(checkvcpair);
						if (vc[0][0]["cnt"] != 0) {
							let updatevc = ` UPDTE smsv2.boxvc SET lcoid=${data.tuserid} WHERE vcid=${bulkup.vcid}`
							updatevc = await conn.query(updatevc);

						} else {
							erroraray.push({ msg: 'VC  already assigned to Operator', err_code: '112' });
							await conn.rollback();
						}
					}

					if (data.changetype == 2) {
						let checkcustid = (`Select count(*) cnt from smsv2.box where boxid=${bulkup.boxid}   and hdid=${data.hdid} and lcoid=${data.fuserid} and custid is null
					and pairflg=1`);
						console.log('custid', checkcustid);
						checkcustid = await conn.query(checkcustid);
						if (checkcustid[0][0]["cnt"] != 0) {
							let updateboxandvc = `UPDATE smsv2.box AS b
							INNER JOIN smsv2.boxvc AS v ON b.vcid = v.vcid
							SET
								b.lcoid = ${data.tuserid},
								v.lcoid = ${data.tuserid}

							WHERE
								b.boxid = ${bulkup.boxid}
								`;
							updateboxandvc = await conn.query(updateboxandvc);

						} else {
							erroraray.push({ msg: ' Box and Vc  already assigned to Operator', err_code: '112' });
							await conn.rollback();

						}
					}
					let addstbtrs = `INSERT INTO smsv2.box_vc_transfer_log SET
				           hdid=${data.hdid},
				          fuserid=${data.fuserid},
				          tuserid=${data.tuserid},
				          boxorvc=${data.changetype},
				          createdby=${jwtdata.id}`;
					if (bulkup.boxid != '' && bulkup.boxid != null) addstbtrs += ` ,boxorvcid=${bulkup.boxid}`;
					if (bulkup.vcid != '' && bulkup.vcid != null) addstbtrs += ` boxorvcid=${bulkup.vcid}`;
					console.log('ADD STB TRS', addstbtrs);
					if (addstbtrs[0]['affectedRows'] > 0) {
						addstbtrs = await conn.query(addstbtrs);
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD STB TRANSFER',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " STB Assigned Succesfully To Operator", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 317 });
						await conn.rollback();
					}


				}

				catch (e) {
					console.log('Error ', e);
					erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
					await conn.rollback();

				}

				// conn.release();
			}
		} else {
			erroraray.push({ msg: 'Please Try After Sometimes', err_code: '348' });
			conn.release();
			return;
		}
		console.log('Success-1', erroraray);
		console.log('Connection Closed');
		conn.release();
		return resolve(erroraray);

	});
}
stbm.post('/addbulkstbtransfer', async (req, res) => {
	req.setTimeout(864000000);
	let result = await addbulkstbtransfer(req);
	console.log('Process Completed', result);
	res.end(JSON.stringify(result));

});
async function addstbtransfer(req, res) {
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body == null ? req : req.body, jwtdata = req.jwt_data == null ? req.jwtdata : req.jwt_data;
		console.log('STB Transfer Data', data);
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
				console.log('STB Transfer Req Data', data);
				if (data.changetype == 1) {
					let checkpair = `Select count(*) cnt from smsv2.box where boxid=${data.boxid}  and hdid=${data.hdid} and lcoid=${data.fuserid} and custid is null
					and pairflg=0`;
					box = await conn.query(checkpair);
					console.log('Check Box :', box[0]);
					if (box[0][0]['cnt'] != 0) {
						let updatebox = `UPDATE smsv2.box SET lcoid=${data.tuserid} WHERE boxid = ${data.boxid}`
						updatebox = await conn.query(updatebox);

					} else {
						erroraray.push({ msg: 'box already assigned to Operator', err_code: '104' });
						await conn.rollback();		// box
					}
				}
				if (data.changetype == 3) {

					let checkvcpair = `Select count(*) cnt from smsv2.boxvc where vcid=${data.vcid}  and hdid=${data.hdid} and lcoid=${data.fuserid} and custid is null
					and pairflg=0`;
					vc = await conn.query(checkvcpair);
					if (vc[0][0]["cnt"] != 0) {
						let updatevc = ` UPDTE smsv2.boxvc SET lcoid=${data.tuserid} WHERE vcid=${data.vcid}`
						updatevc = await conn.query(updatevc);

					} else {
						erroraray.push({ msg: 'VC  already assigned to Operator', err_code: '112' });
						await conn.rollback();
						// vc
					}
				}

				if (data.changetype == 2) {
					let checkcustid = (`Select count(*) cnt from smsv2.box where boxid=${data.boxid} and hdid=${data.hdid} and lcoid=${data.fuserid} and custid is null
				and pairflg=1`);
					console.log('custid', checkcustid);
					checkcustid = await conn.query(checkcustid);
					if (checkcustid[0][0]["cnt"] != 0) {
						let updateboxandvc = `UPDATE smsv2.box AS b
						INNER JOIN smsv2.boxvc AS v ON b.vcid = v.vcid
						SET
							b.lcoid = ${data.tuserid},
							v.lcoid = ${data.tuserid}

						WHERE
							b.boxid = ${data.boxid}
							`;
						updateboxandvc = await conn.query(updateboxandvc);

					} else {
						erroraray.push({ msg: ' Box and Vc  already assigned to Operator', err_code: '112' });
						await conn.rollback();

					}
				}
				let addstbtrs = ` INSERT INTO smsv2.box_vc_transfer_log SET
				hdid=${data.hdid},
				fuserid=${data.fuserid},
				tuserid=${data.tuserid},
				boxorvc=${data.changetype},
				createdby=${jwtdata.id}`;
				if (data.boxid != '' && data.boxid != null) addstbtrs += ` ,boxorvcid=${data.boxid}`;
				if (data.vcid != '' && data.vcid != null) addstbtrs += ` boxorvcid=${data.vcid}`;
				console.log('ADD STB TRS', addstbtrs);
				if (addstbtrs[0]['affectedRows'] > 0) {
					addstbtrs = await conn.query(addstbtrs);
					let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD STB TRANSFER',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
					sqllog = await conn.query(sqllog);
					if (sqllog[0]['affectedRows'] > 0) {
						erroraray.push({ msg: " STB Assigned Succesfully To Operator", err_code: 0 });
						await conn.commit();
					}
				} else {
					erroraray.push({ msg: "Contact Your Admin.", err_code: 317 });
					await conn.rollback();
				}

			}

			catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })

				await conn.rollback();

			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		}
		else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 335 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});

}

stbm.post('/addstbtransfer', async (req, res) => {
	req.setTimeout(864000000);
	let result = await addstbtransfer(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});

async function addsurrender(req) {
	console.log('Edit User Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				console.log('User Data', data);
				
				if (data.type == 2) {
					let checkpack = await conn.query(`Select * from smsv2.packAD where hdid=${data.hdid} and custid=${data.custid} and boxid=${data.stb_no} and pflg=1`);
					if (checkpack[0].length != 0) {
						erroraray.push({ msg: " Please deactivate the pacakge.", err_code: 212 });
						await conn.rollback();
					}
					else {
						let addsubscriber = await conn.query(`SELECT * FROM smsv2.CustBoxAssignLog WHERE  hdid=${data.hdid} AND custid=${data.custid} and boxid=${data.stb_no} and  assignflg=1`);
						if (addsubscriber[0].length != 0) {  
							let addsubscriber = `Insert into smsv2.CustBoxAssignLog SET  
						assignflg=2,
						hdid=${data.hdid},
						userid=${data.lcoid},
						custid=${data.custid},
						boxid=${data.stb_no},
						cby=${jwtdata.id}`;
							if (data.dob != '' && data.dob != null) addsubscriber += ` ,surrender_date='${data.dob}'`;
							console.log('ADD operator Query: ', addsubscriber);
							addsubscriber = await conn.query(addsubscriber);
							if (addsubscriber[0]['affectedRows'] > 0) {
								let addr = `UPDATE smsv2.box set custid=null  WHERE boxid=${data.stb_no} `;
								let addloc = ` UPDATE smsv2.subscriber AS s  set  s.surenderboxid=${data.stb_no} `;
								if (data.dob != '' && data.dob != null) addloc += ` , s.surrenderdate='${data.dob}'`;
								addloc += ' WHERE s.custid =' + data.custid
								addloc = await conn.query(addloc);
								addr = await conn.query(addr);
							}
						}
					}

				}

				if (data.type == 1) {					
						let checkpack = await conn.query(`SELECT *FROM smsv2.packAD p where p.hdid=${data.hdid} and p.custid=${data.custid} and p.pflg=1`);
					if (checkpack[0].length != 0) {
						erroraray.push({ msg: " Please deactivate the pacakge.", err_code: 212 });
						await conn.rollback();
					}
					else {
						let addsubscriber = await conn.query(`SELECT * FROM smsv2.CustBoxAssignLog WHERE  hdid=${data.hdid} AND custid=${data.custid} and assignflg=1`);
						if (addsubscriber[0].length != 0) {
							let addsubscriber = `Insert into smsv2.CustBoxAssignLog SET  
						assignflg=2,
						hdid=${data.hdid},
						userid=${data.lcoid},
						custid=${data.custid},
						boxid=${data.stb_no},
						cby=${jwtdata.id}`;
							if (data.dob != '' && data.dob != null) addsubscriber += ` ,surrender_date='${data.dob}'`;
							console.log('ADD operator Query: ', addsubscriber);
							addsubscriber = await conn.query(addsubscriber);
							if (addsubscriber[0]['affectedRows'] > 0) {
								let addrr = ` update smsv2.box set custid=null where custid=${data.custid}`;
								let addlocc = `UPDATE smsv2.subscriber s
										INNER JOIN smsv2.box b ON s.custid = b.custid
										SET s.surenderboxid = b.boxid
										WHERE s.custid=${data.custid} `;
								addlocc = await conn.query(addlocc);
								addrr = await conn.query(addrr);
							}
						}
					}				

				}
                  
				let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE BOX SURRENDER',`longtext`='DONE BY',hdid=" + data.hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
				sqllog = await conn.query(sqllog);
				if (sqllog[0]['affectedRows'] > 0) {
					erroraray.push({ msg: " BOX Surrender Uploaded Succesfully", err_code: 0 });
					await conn.commit();
				}


				else {
					erroraray.push({ msg: " User  Already Exists.", err_code: 212 });

					await conn.rollback();
				}
			}


			catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })

				await conn.rollback();
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
stbm.post('/addsurrender', async (req, res) => {
	req.setTimeout(864000000);
	let result = await addsurrender(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});

async function stbupgrade(req) {
	console.log('Edit channelsrv Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data,alog=" ";
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				
				console.log('STB Data', data);
				let exambox = await conn.query("SELECT * FROM smsv2.box WHERE custid =" + data.custid + "");
				if (exambox[0].length == 1) {
					let old_stb=exambox[0][0];
					// let status = data.status == true ? 1 : 0;
					if (data.boxid ) {    // checking pair status for new stb
						let checkpair=`select boxid,pairflg from smsv2.box where pairflg=0 and boxid=${data.boxid}`
						 checkpair=await conn.query(checkpair);
						 if(checkpair[0].length ==1){
							erroraray.push({ msg: "box is unpair.", err_code: 227 });
							await conn.rollback();
						 }
					}
					if (data.boxid ) {    // checking  new stb already assigned to cust or not
						let checkpair=`select boxid,pairflg from smsv2.box where custid is not null and boxid=${data.boxid}`
						 checkpair=await conn.query(checkpair);
						 if(checkpair[0].length ==1){
							erroraray.push({ msg: "box is already assigned .", err_code: 227 });
							await conn.rollback();
						 }
					}
					if (old_stb.lcoid != data.lcoid) { //checking the operator is same
						erroraray.push({ msg: "The box is not available to this operator .", err_code: 227 });
							await conn.rollback();
					}
					if (data.custid) {         // checking the old stb box package is  activate or deactivate
						let checkpack=(`SELECT *FROM smsv2.packAD p where p.hdid=${data.hdid} and p.custid=${data.custid} and p.pflg=1`);
						checkpack=await conn.query(checkpack);
						if(checkpack[0].length ==1){
						   erroraray.push({ msg: "Please Deactivate the Packages.", err_code: 227 });
						   await conn.rollback();
						}
					}

					``
					let update = ` UPDATE smsv2.box SET boxno=${data.stb_no} WHERE custid=${data.custid}`
					console.log('ADD stb Query: ', update);
					 update = await conn.query(update);
					if (update[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE BOX UPGRADE',`longtext`=' "+ alog+" DONE BY',hdid="+data.hdid+",usertype="+jwtdata.role+",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " BOX Upgraded Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Please Check Service Box", err_code: 223 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " Box is  Already Exists.", err_code: 227 });
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

stbm.post('/stbupgrade', async (req, res) => {
	req.setTimeout(864000000);
	// const validation = joiValidate.editchansrvDataSchema.validate(req.body);
    // if (validation.error) {
    //     console.log(validation.error.details);
    //     return res.json([{ msg: validation.error.details[0].message, err_code: '253' }]);
    // }
	let result = await stbupgrade(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});

// async function stbedit(req) {
// 	console.log('Edit boxsrv Data:', req.jwt_data);
// 	return new Promise(async (resolve, reject) => {
// 		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
// 		let conn = await poolPromise.getConnection();
// 		if (conn) {
// 			await conn.beginTransaction();
// 			try {
// 				console.log('channelsrv Data', data);
// 				let checkchannel = await conn.query("SELECT COUNT(*) cnt FROM smsv2.box WHERE boxid !=" + data.boxid + " AND vcid='" + data.vcid + "'");
// 				if (checkchannel[0][0]['cnt'] == 0) {
// 					// let status = data.status == true ? 1 : 0;
// 					let updateData = {
// 						boxid: data.boxid,
// 						hdid: data.hdid,
// 						casid: data.casid,
// 						boxno: data.boxno,
// 						stbprimary: data.stbprimary,
// 						ster: data.ster,
// 						vcid: data.vcid,
// 						activeflg: data.bulkstatus,
// 						lmby: jwtdata.id
// 					}

// 					let update = ` UPDATE smsv2.box SET mdate=NOW(), ? WHERE id= ?`
// 					console.log('ADD CHANNEL Query: ', update);
// 					let addchn = await conn.query(update, [updateData, data.id]);
// 					if (addchn[0]['affectedRows'] > 0) {
// 						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='EDIT box',`longtext`='DONE BY',lmby=" + jwtdata.id;
// 						sqllog = await conn.query(sqllog);
// 						if (sqllog[0]['affectedRows'] > 0) {
// 							erroraray.push({ msg: " Service ID Updated Succesfully", err_code: 0 });
// 							await conn.commit();
// 						}
// 					} else {
// 						erroraray.push({ msg: "Please Check STB ID", err_code: 1111 });
// 						await conn.rollback();
// 					}
// 				} else {
// 					erroraray.push({ msg: " STB ID  Already Exists.", err_code: 1111 });
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
// stbm.post('/stbedit', async (req, res) => {
// 	req.setTimeout(864000000);
// 	const validation = joiValidate.editchansrvDataSchema.validate(req.body);
// 	// if (validation.error) {
// 	//     console.log(validation.error.details);
// 	//     return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
// 	// }
// 	let result = await stbedit(req);
// 	console.log("Process Completed", result);
// 	res.end(JSON.stringify(result));

// });






module.exports = stbm;