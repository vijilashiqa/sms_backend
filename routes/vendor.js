"use strict";
var express = require('express'),
	compress = require('compression'),
	vendors = express.Router(),
	pool = require('../connection/conn');
const joiValidate = require('../schema/inventory');

async function addvendor(req) {
	console.log('Add vendor Data:', req.jwt_data);
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
				console.log('channel Data', data);
				let checkchannel = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`vendor` WHERE  hdid=" + hdid + " AND vendor_name='" + data.vendor_name + "'");
				if (checkchannel[0][0]['cnt'] == 0) {
					let status = data.status == true ? 1 : 0;
					let addven = `INSERT INTO smsv2.vendor SET vendor_name='${data.vendor_name}',hdid=${data.hdid}, status=${status},created_by=${jwtdata.id} `;
					console.log('ADD VENDOR Query: ', addven);
					addven = await conn.query(addven);
					if (addven[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD VENDOR',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Vendor created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 38 });
						await conn.rollback();
					}
				} else {

					erroraray.push({ msg: " Vendor Name Already Exists.", err_code: 43 });
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
			erroraray.push({ msg: 'Please try after sometimes', err_code: 56 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}

vendors.post('/addvendor', async (req, res) => {
	req.setTimeout(864000000);

	const validation = joiValidate.vendorDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		// return res.status(422).json({ msg: validation.error.details, err_code: '422' });
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await addvendor(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});

vendors.post('/listvendor', function (req, res, err) {
	var where = [], jwtdata = req.jwt_data, sql, sqlquery = 'SELECT v.hdid,v.vendorid,v.vendor_name ,h.hdname,v.status FROM `smsv2`.vendor v LEFT JOIN smsv2.hd h ON v.hdid=h.hdid  ',
		sqlqueryc = 'SELECT COUNT(*) AS count FROM `smsv2`.vendor v left join smsv2.hd h on v.hdid=h.hdid', finalresult = [],
		data = req.body;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' v.hdid=' + data.hdid);
	if (jwtdata.role <= 777) where.push(' v.hdid=' + jwtdata.hdid);
	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where;
	}
	if (data.limit && data.index) {
		sqlquery += ' LIMIT ?,?'
	}
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
						}
					});
				} else {
					conn.release();
				}
			});
		}
	});
});
// vendors.post('/getvendor', function (req, res) {
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log(err);
//         } else {
//             var sql = conn.query('SELECT  vendorid,vendor_name FROM smsv2.`vendor`', function (err, result) {
//                 conn.release();
//                 if (!err) {
//                     res.end(JSON.stringify(result));
//                 }
//             });
//         }
//     });
// });
// vendors.post('/getvendoredit', function (req, res) {
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log(err);
//         } else {
//             var sql,data = req.body,
// 			 sqlquery = conn.query(`SELECT  hdid,vendor_name FROM smsv2.vendor where  vendorid=${data.vendorid}`, function (err, result) {
//                 conn.release();
//                 if (!err) {
//                     res.end(JSON.stringify(result));
//                 }
// 				else {
// 					sql = conn.query(sqlquery,  function (err, result) {
// 						conn.release();
// 						if (!err) {
// 							res.end(JSON.stringify(result));
// 						}
// 					});
// 				}
//             });
//         }
//     });
// });

vendors.post('/getvendoredit', function (req, res) {
	var data = req.body,jwtdata=req.jwt_data,where=[],
		sql, sqlquery = `SELECT  hdid,vendor_name,status FROM smsv2.vendor where  vendorid=${data.vendorid}`;
		if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`AND  hdid= ${data.hdid}`);
        if (jwtdata.role <= 777) where.push(` AND hdid= ${jwtdata.hdid}`);
        if (where.length > 0) {
            where = where.join(' AND ');
            sqlquery += where;
        }
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get vendor', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});

vendors.post('/getvendor', function (req, res) {
	var sql, sql1 = '', data = req.body,jwtdata=req.jwt_data,where=[],
		sqlquery = 'SELECT  vendorid,vendor_name FROM smsv2.vendor ';
		if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  hdid= ${data.hdid}`);
        if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`);
        if (where.length > 0) {
            where = ' WHERE ' + where.join(' AND ');
            sqlquery += where;
        }
	// if (data.hasOwnProperty('boxtypeid') && data.boxtypeid) {
	//     sqlquery+=` AND boxtypeid =${data.boxtypeid}`;
	// }
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



async function vendoredit(req) {
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
					erroraray.push({ msg: "Please Select Headend.", err_code: 150 });
					await conn.rollback();
				}
				console.log('Data', data);
				let checkprofile = await conn.query("SELECT * FROM smsv2.`vendor` WHERE    vendorid=" + data.vendorid + " ");
				if (checkprofile[0].length == 1) {
					let cl = checkprofile[0][0];
					let status = data.status == true ? 1 : 0;

					let addhd = `UPDATE  smsv2.vendor SET status=${status}					 
						`;

					if (cl.hdid != hdid) {
						let [checkhdid] = await conn.query(`SELECT * FROM smsv2.vendor WHERE  vendor_name='${data.vendor_name}' and hdid=${hdid}`);
						console.log('checkhdid : ', checkhdid);
						if (checkhdid.length == 1) {
							erroraray.push({ msg: " Headend Already Available .", err_code: 205 });
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
					if (cl.vendor_name != data.vendor_name) {
						let [checkven] = await conn.query(`SELECT * FROM smsv2.vendor WHERE  vendor_name='${data.vendor_name}' and   hdid=${hdid}`);
						console.log('checkven : ', checkven);
						if (checkven.length == 1) {
							erroraray.push({ msg: "Vendor Name Already Exists.", err_code: 78 });
							await conn.rollback();
						} else {

							addhd += ` , vendor_name='${data.vendor_name}'`
							alog += ` Vendor Name Chanegd From ${cl.vendor_name} To ${data.vendor_name}`
						}

					}
					addhd += ' WHERE vendorid =' + data.vendorid
					console.log('Update channel Query: ', addhd);
					addhd = await conn.query(addhd);
					if (addhd[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE VENDOR',`longtext`=' " + alog + " DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Vendor Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 240 });
						await conn.rollback();
					}
				} else {
					console.log('no data', checkprofile)
					erroraray.push({ msg: " Vendor Name already Exits", err_code: 245 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes', err_code: '250' })
				await conn.rollback();
			}
			console.log('Success--1');
			console.log('connection Closed.');
			conn.release();
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 257 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}
vendors.post('/vendoredit', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editvendorDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await vendoredit(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});



// async function vendoredit(req) {
// 	console.log('update Data:', req.jwt_data);
// 	return new Promise(async (resolve, reject) => {
// 		var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog = "";
// 		let conn = await poolPromise.getConnection();
// 		if (conn) {
// 			await conn.beginTransaction();
// 			try {
// 				let hdid = '',chdid='';
// 				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
// 				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
// 				if (hdid == '' || hdid == null) {
// 					erroraray.push({ msg: "Please Select Headend.", err_code: 78 });
// 					await conn.rollback();
// 				}
// 				console.log('Data', data)
// 				let checkprofile = await conn.query(`SELECT * FROM smsv2.vendor WHERE vendorid=${data.vendorid} `);
// 				let status = data.status == true ? 1 : 0;
// 				if (checkprofile[0].length == 1) {
// 					let ve = checkprofile[0][0];
// 					chdid=ve.hdid
// 					if (ve.hdid !== data.hdid) {

// 						let [checkvendor] = await conn.query(`SELECT * FROM smsv2.vendor WHERE vendor_name='${data.vendor_name}' and hdid=${data.hdid} `);
// 						console.log('checkvendor : ', checkvendor);
// 						if (checkvendor.length == 1) {
// 							erroraray.push({ msg: "Vendor Name Already Available In This Headend.", err_code: 78 });
// 							await conn.rollback();
// 						}
// 						chdid=data.hdid
// 					}

// 					let addven = `UPDATE  smsv2.vendor SET hdid=${data.hdid},status=${status},modified_by=${jwtdata.id} `;

// 					// if (ve.hdid != hdid) {
// 					// 	addven += ` ,hdid='${hdid}'`;
// 					// 	alog += ` Vendor Changed FROM ${ve.hdid} TO ${hdid}.`;
// 					// // }
// 					// if (ve.hdid != data.hdid) {
// 					// 	let checkven = ` select concat(' From ',a.hdname,' TO ',b.hdname) ven from 
// 					// 								(select hdid from vendor where hdid=${ve.hdid} ) a
// 					// 								,(select hdid from vendor where hdid=${data.hdid} ) b `;
// 					// 	checkven = await conn.query(checkven);

// 					// 	addven += ` ,hdid=${data.hdid} `;
// 					// 	alog += ` hdname name Changed ${checkven[0][0].ven}.`
// 					// }

// 					if (ve.vendor_name != data.vendor_name) {
// 						let [checkvendorname] = await conn.query(`SELECT * FROM smsv2.vendor WHERE vendor_name='${data.vendor_name}' and hdid=${chdid} `);
// 						console.log('checkvendorname : ', checkvendorname);
// 						if (checkvendorname.length == 1) {
// 							erroraray.push({ msg: "Vendor Name Already Available In This Headend.", err_code: 78 });
// 							await conn.rollback();
// 						}
// 						addven += ` ,vendor_name='${data.vendor_name}'`;
// 						alog += ` Vendor Changed FROM ${ve.vendor_name} TO ${data.vendor_name}.`;
// 					}
// 					addven += ` WHERE vendorid = ${data.vendorid}`;
// 					console.log('Update vendor Query: ', addven);
// 					addven = await conn.query(addven);
// 					if (addven[0]['affectedRows'] > 0) {
// 						let sqllog = "INSERT smsv2.activitylog SET table_id='UPDATE vendor',`longtext`=' " + alog + " DONE BY',hdid=" + data.hdid + ",usertype=" + jwtdata.role + "";
// 						sqllog = await conn.query(sqllog);
// 						if (sqllog[0]['affectedRows'] > 0) {
// 							erroraray.push({ msg: " Vendor Updated Succesfully", err_code: 0 });
// 							await conn.commit();
// 						}
// 					} else {
// 						erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
// 						await conn.rollback();
// 					}
// 				} else {
// 					// console.log('no data',addven)
// 					erroraray.push({ msg: "  vendor Record Not Found.", err_code: 1111 });
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
// async function vendoredit(req) {
// 	console.log('update Data:', req.jwt_data);
// 	return new Promise(async (resolve, reject) => {
// 		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
// 		let conn = await poolPromise.getConnection();
// 		if (conn) {
// 			await conn.beginTransaction();
// 			try {
// 				console.log('Data',data);

// 				let checkprofile = await conn.query(`SELECT * FROM smsv2.vendor WHERE vendor_name='${data.vendor_name}' AND vendorid!=${data.vendorid}`);
// 				let status = data.status == true ? 1 : 0;
// 					if (checkprofile[0].length == 1) {
// 					 let addven = `UPDATE  smsv2.vendor SET 
// 						 hdid=${data.hdid},
// 						 vendor_name='${data.vendor_name}',
// 						 status=${status}`;

// 						addven += ` WHERE vendorid = ${data.vendorid}`; 
// 						console.log('Update vendor Query: ', addven);
// 						addven = await conn.query(addven);
// 						if (addven[0]['affectedRows'] > 0) {
// 							let sqllog = "INSERT smsv2.activitylog SET table_id='EDIT vendor',`longtext`='DONE BY',cby="+ jwtdata.id;
// 							sqllog = await conn.query(sqllog);
// 							if (sqllog[0]['affectedRows'] > 0) {
// 								erroraray.push({ msg: " Vendor Updated Succesfully", err_code: 0 });
// 								await conn.commit();
// 							}
// 						} else {
// 							erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
// 							await conn.rollback();
// 						}
// 					} else {
// 						// console.log('no data',addven)
// 						erroraray.push({ msg: "  vendor already exits Fund.", err_code: 1111 });
// 						await conn.rollback();
// 					}
// 			} catch (e) {
// 				console.log('Error ', e);
// 				 erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
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


module.exports = vendors;