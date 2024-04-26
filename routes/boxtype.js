//                                           //*******************STB TYPE***************//


"use strict";
var express = require('express'),
	compress = require('compression'),
	boxtype = express.Router(),
	pool = require('../connection/conn');
poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/inventory');

async function addboxtype(req) {
	console.log('Add boxmodel Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				console.log('boxmodel Data', data);
				let hdid = '';
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 49 });
					await conn.rollback();
				}
				let addbox = await conn.query("SELECT COUNT(*) cnt FROM smsv2.boxtype WHERE  hdid=" + hdid + " AND boxtypename='" + data.boxtypename + "'");
				if (addbox[0][0]['cnt'] == 0) {
					let status = data.status == true ? 1 : 0;
					let addbox = `INSERT INTO smsv2.boxtype SET hdid=${hdid}, boxtypename='${data.boxtypename}',status=${status},cby=${jwtdata.id}`;
					console.log('ADD boxmodel Query: ', addbox);
					addbox = await conn.query(addbox);
					if (addbox[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD BOXMODEL',`longtext`='DONE BY',hdid="+data.hdid+",usertype="+jwtdata.role+",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " STB TYPE Created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Contact Your Admin.", err_code: 42 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " STB TYPE  Already Exists.", err_code: 46 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err', err_code: '51' });
				await conn.rollback();
			}
			console.log('Success--1');
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: '56' });
			return resolve(erroraray);
		}
		if (conn) conn.release();
		console.log('connection Closed.');
		return resolve(erroraray);
	});
}

boxtype.post('/addboxtype', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.boxmodelDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await addboxtype(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});

boxtype.post('/listboxtype', function (req, res, err) {
	var where = [], jwtdata = req.jwt_data, sql, sqlquery = 'SELECT bxt.boxtypeid,bxt.hdid,bxt.boxtypename,bxt.status, h.hdname,bxt.cby,bxt.lmby FROM smsv2.boxtype bxt ' +
		' INNER JOIN smsv2.hd h ON bxt.hdid = h.hdid ',
		sqlqueryc = 'SELECT COUNT(*) count FROM smsv2.boxtype bxt INNER JOIN smsv2.hd h ON bxt.hdid = h.hdid'
		, finalresult = [], data = req.body;

	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` bxt.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` bxt.hdid= ${jwtdata.hdid} `);

	if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where;
	}
	sqlquery += ' LIMIT ?,? ';
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

boxtype.post('/getstbtype', function (req, res) {
	var data = req.body,jwtdata=req.jwt_data,where=[],
		sql, sqlquery = `SELECT boxtypeid,hdid,boxtypename,status FROM smsv2.boxtype  WHERE boxtypeid =${data.boxtypeid}`;
		if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`AND  hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(`AND hdid= ${jwtdata.hdid} `);

	if (where.length > 0) {
		where =  where.join(' AND ');
		sqlquery += where;
		
	}
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get stbtype', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});

boxtype.post('/selectboxtype', function (req, res) {
	var jwtdata = req.jwt_data, where = [], sql, sql1 = '', data = req.body,
		sqlquery = ' SELECT boxtypeid,hdid,boxtypename FROM smsv2.boxtype ';

	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid} `);

	if (data.hasOwnProperty('boxtypeid') && data.boxtypeid) where.push(` boxtypeid =${data.boxtypeid} `);

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
async function editboxtype(req) {
	console.log('update Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data,alog='';
		let conn = await poolPromise.getConnection();
		if (conn) {
			await conn.beginTransaction();
			try {
				console.log('Data', data);
				let hdid = '';
				if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
				if (jwtdata.role <= 777) hdid = jwtdata.hdid;
				if (hdid == '' || hdid == null) {
					erroraray.push({ msg: "Please Select Headend.", err_code: 171 });
					await conn.rollback();
				}
				let checkprofile = await conn.query("SELECT * FROM smsv2.`boxtype` WHERE  boxtypeid=" + data.boxtypeid);
				if (checkprofile[0].length == 1) {
					let cb=checkprofile[0][0];
					 let status = data.status == true ? 1 : 0;
					let addbox = `UPDATE  smsv2.boxtype SET status=${status},lmby=${jwtdata.id}`;
					if (cb.hdid != hdid) {
						let [checkboxtypename] = await conn.query(`SELECT * FROM smsv2.boxtype WHERE boxtypename='${data.boxtypename}' and hdid=${hdid}`);
						console.log('checkboxtypename : ', checkboxtypename);
						if (checkboxtypename.length == 1) {
							erroraray.push({ msg: " Headend  Already Available .", err_code: 183 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) cb from 
														(select hdname from hd where hdid=${cb.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addbox += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].cb}.`
						}

					}
					if (cb.boxtypename != data.boxtypename) {
						let [checkboxtypename] = await conn.query(`SELECT * FROM smsv2.boxtype WHERE boxtypename='${data.boxtypename}' and hdid=${hdid}`);
						console.log('checkboxtypename : ', checkboxtypename);
						if (checkboxtypename.length == 1) {
							erroraray.push({ msg: "Boxtype  Already Available .", err_code: 199 });
							await conn.rollback();
						} else {
							addbox += ` ,boxtypename='${data.boxtypename}'`;
							alog += ` Boxtypename Changed From ${cb.boxtypename} To ${data.boxtypename}.`;
						}

					} 
					 addbox+= ' WHERE boxtypeid=' +data.boxtypeid;
					console.log('Update boxmodel Query: ', addbox);
					addbox = await conn.query(addbox);
					if (addbox[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE BOXTYPE',`longtext`='"+ alog+" DONE BY',hdid="+hdid+",usertype="+jwtdata.role+",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " STB TYPE Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "STB TYPE Your Admin.", err_code: 218 });
						await conn.rollback();
					}
				} else {
					console.log('no data', checkprofile)
					erroraray.push({ msg: " No Data Fund.", err_code: 223 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes err', err_code: '228' });
				await conn.rollback();
			}
		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 232 });
			return resolve(erroraray);
		}
		if (conn) conn.release();
		console.log('connection Closed.');
		return resolve(erroraray);
	});
}
boxtype.post('/editboxtype', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editboxmodelDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await editboxtype(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});

module.exports = boxtype;
// "use strict";
// var express = require('express'),
// 	compress = require('compression'),
// 	boxtype= express.Router(),
// 	pool = require('../connection/conn');
// poolPromise = require('../connection/conn').poolp;
// const joiValidate = require('../schema/inventory');




// boxtype.post('/selectboxtype', function (req, res) {
//     var sql,sql1='',data = req.body,
//      sqlquery = 'SELECT boxtypeid,hdid,boxtypename FROM smsv2.boxtype WHERE hdid='+data.hdid;

//         if (data.hasOwnProperty('boxtypeid') && data.boxtypeid) {
//             sqlquery+=` AND boxtypeid =${data.boxtypeid}`;
//         }
//     pool.getConnection(function (err, conn) {
//         if (err) {
//             console.log(err);
//         } else {
//             sql = conn.query(sqlquery, data.stb_id, function (err, result) {
//                 conn.release();
//                 if (!err) {
//                     res.end(JSON.stringify(result));
//                 }
//             });
//         }
//     });
// });
// async function addboxtype(req) {
// 	console.log('Add boxmodel Data:', req.jwt_data);
// 	return new Promise(async (resolve, reject) => {
// 		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
// 		let conn = await poolPromise.getConnection();
// 		if (conn) {
// 			await conn.beginTransaction();
// 			try {
// 				console.log('boxmodel Data', data);
// 				let addbox = await conn.query("SELECT COUNT(*) cnt FROM smsv2.boxtype WHERE  hdid="+data.hdid+" AND boxtypename='" + data.boxtypename + "'");
// 				if (addbox[0][0]['cnt'] == 0) {
// 					let status = data.status == true ? 1 : 0;
// 					let addbox = `INSERT INTO smsv2.boxtype SET hdid=${data.hdid}, boxtypename='${data.boxtypename}',status=${status},cby=${jwtdata.id}`;
// 					console.log('ADD boxmodel Query: ', addbox);
// 					addbox = await conn.query(addbox);
// 					if (addbox[0]['affectedRows'] > 0) {
// 						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD BOXMODEL',`longtext`='DONE BY',cby=" + jwtdata.id;
// 						sqllog = await conn.query(sqllog);
// 						if (sqllog[0]['affectedRows'] > 0) {
// 							erroraray.push({ msg: " STB TYPE created Succesfully", err_code: 0 });
// 							await conn.commit();
// 						}
// 					} else {
// 						erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
// 						await conn.rollback();
// 					}
// 				} else {
// 					erroraray.push({ msg: " STB TYPE  Already Exists.", err_code: 1111 });
// 					await conn.rollback();
// 				}
// 			} catch (e) {
//  				console.log('Error ', e);
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

// boxtype.post('/addboxtype', async (req, res) => {
//     req.setTimeout(864000000);

//     const validation = joiValidate.boxmodelDataSchema.validate(req.body);
//     if (validation.error) {
//         console.log(validation.error.details);
//         // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
//         return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
//     }
//     let result = await addboxtype(req);
//     console.log("Process Completed", result);
//     res.end(JSON.stringify(result));
// });

// boxtype.post('/listboxtype', function (req, res, err) {
//     var sql, sqlquery = 'SELECT  bxt.boxtypeid,bxt.hdid,bxt.boxtypename, h.hdname,bxt.cby,bxt.lmby,bxt.status FROM smsv2.boxtype bxt ' +
//         ' INNER JOIN   smsv2.hd  h ON bxt.hdid = h.hdid  LIMIT ?,? ',

//         sqlqueryc = 'SELECT COUNT(*)  count FROM smsv2.boxtype bxt INNER JOIN   smsv2.hd  h ON bxt.hdid = h.hdid', finalresult = [],
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
//  async function editboxtype(req) {
//     	console.log('update Data:', req.jwt_data);
//     	return new Promise(async (resolve, reject) => {
//     		var erroraray = [], data = req.body, jwtdata = req.jwt_data;
//     		let conn = await poolPromise.getConnection();
//     		if (conn) {
//     			await conn.beginTransaction();
//     			try {
//     				console.log('Data',data);
//     					 let checkprofile = await conn.query("SELECT COUNT(*) cnt FROM smsv2.`boxtype` WHERE  hdid =" + data.hdid+" AND boxtypename = '" + data.boxtypename + "'AND boxtypeid !="+data.boxtypeid+" ");
//     					if (checkprofile[0][0]['cnt'] == 0) {
//     						// let status = data.status == true ? 1 : 0;
//     						 let addbox = `UPDATE  smsv2.boxtype SET 
//                              hdid=${data.hdid},
//                              boxtypename='${data.boxtypename}'
//     						 `;
//     						addbox += ' WHERE boxtypeid =' + data.boxtypeid
//     						console.log('Update boxmodel Query: ', addbox);
//     						addbox = await conn.query(addbox);
//     						if (addbox[0]['affectedRows'] > 0) {
//     							let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE boxtype',`longtext`='DONE BY',cby="+ jwtdata.id;
//     							sqllog = await conn.query(sqllog);
//     							if (sqllog[0]['affectedRows'] > 0) {
//     								erroraray.push({ msg: " STB TYPE Updated Succesfully", err_code: 0 });
//     								await conn.commit();
//     							}
//     						} else {
//     							erroraray.push({ msg: "STB TYPE Your Admin.", err_code: 1111 });
//     							await conn.rollback();
//     						}
//     					} else {
//     						console.log('no data',checkprofile)
//     						erroraray.push({ msg: " No Data Fund.", err_code: 1111 });          
//     						await conn.rollback();
//     					}
//     			} catch (e) {
//     				console.log('Error ', e);
//     				 erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
//     				await conn.rollback();
//     			}
//     			console.log('Success--1');
//     			console.log('connection Closed.');
//     			conn.release();
//     		} else {
//     			erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
//     			return;
//     		}
//     		console.log('success--2');
//     		return resolve(erroraray);
//     	});
//     }
//     boxtype.post('/editboxtype', async (req, res) => {
//         req.setTimeout(864000000);
//         const validation = joiValidate.editboxmodelDataSchema.validate(req.body);
//         if (validation.error) {
//             console.log(validation.error.details);
//             return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
//         }
//         let result = await editboxtype(req);
//         console.log("Process Completed", result);
//         res.end(JSON.stringify(result));
    
//     });


// module.exports = boxtype;
