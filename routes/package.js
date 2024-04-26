
var express = require('express'),
	compress = require('compression'),
	package = express.Router(),
	pool = require('../connection/conn'),
	poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/package');


async function addpackage(req) {
	console.log('Add package Data:', req.jwt_data);
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
				console.log('package Data', data);
				let checkpackage = await conn.query(`SELECT * FROM smsv2.package p WHERE p.hdid=${hdid} AND p.packname='${data.packname}' `);
				if (checkpackage[0].length == 0) {
					let tax = data.enable_tax == true ? 1 : 0;
					let addpack = `INSERT INTO smsv2.package  SET  hdid=${hdid},packname ='${data.packname}',cby= ${jwtdata.id},
					srvtype=${data.srvtype} ,enable_tax=${tax},packtype=${data.packtype}`;
					addpack += data.tax_type != '' ? `,tax_type=${data.tax_type}` : ``;
					if (data.packtype != 3) addpack += `,channelid='${data.channel.toString().replace(/\[/g, '').replace(/\]/g, '')}'`;
					if (data.packtype == 3) addpack += `,bundlepack='${data.package.toString().replace(/\[/g, '').replace(/\]/g, '')}'`;
					if (data.bcid != '' && data.bcid != null) addpack += `,bcid=${data.bcid}`;
					if (data.bcamt != '' && data.bcamt != null) addpack += `,bcamt=${data.bcamt}`;
					if (data.broadcaster_share != '' && data.broadcaster_share != null) addpack += `,bcshare=${data.broadcaster_share}`;
					addpack = await conn.query(addpack);
					if (addpack[0]['affectedRows'] > 0) {
						if (data.srvtype != 3) {
							data.serviceid = data.serviceid.filter((val) => val.productid != '' || val.productid != 0)
							console.log('Cas --', data.serviceid);
							for (let pid = 0; pid < data.serviceid.length; pid++) {
								const p = data.serviceid[pid]
								console.log(p, 'dwyugwqufbjhf')
								console.log('----------', p);

								let checkpackageprod = await conn.query(`SELECT casid,prodid,hdid FROM smsv2.pack_cas WHERE hdid=${hdid} and casid=${p.id} and prodid=${p.productid}`);
								console.log('-------', checkpackageprod[0].length == 0);
								if (checkpackageprod[0].length == 0) {
									let addprod = `INSERT INTO smsv2.pack_cas set hdid=${hdid},casid=${p.id},packid=${addpack[0].insertId},prodid=${p.productid} `;
									// addprod += p.productid !=''?`,prodid=${p.productid}`:``;

									addprod = await conn.query(addprod);
									console.log('prod----',addprod);

									if (p.productid == 0) {
										erroraray.push({ msg: " Product ID:" + p.productid + " Product ID Not Added.", err_code: 56 });
										await conn.rollback();
										continue;
									}
								} else {
									//prodect id already available
									console.log('prodect id already available');
									erroraray.push({ msg: " Product ID:(" + p.productid + ") Exits.", err_code: 63 });
									await conn.rollback();
									continue;
								}
							}
						}
					} else {
						erroraray.push({ msg: "Please Check Package", err_code: 70 });
						await conn.rollback();
					}

					if (addpack[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD PACKAGE',`longtext`='DONE BY',hdid=" + hdid + ",usertype=" + jwtdata.role + ", cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							erroraray.push({ msg: " Package Created Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Please Check Package", err_code: 82 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " package Name Already Exists.", err_code: 86 });
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
			erroraray.push({ msg: 'Please try after sometimes', err_code: 100 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);

	});
}
package.post('/addpackage', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.packageDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await addpackage(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});

// package.post('/searchpackshare', function (req, res) {
// package.post('/searchpackshare', function (req, res, err) {
// 	console.log('req.body')
// 	var data = req.body,
// 		sql, sqlquery = ` SELECT  u.profileid ,pps.* FROM smsv2.users u 
// 		LEFT JOIN  smsv2.PackPriceShare pps ON u.id=pps.resellerid AND pps.hdid=u.hdid AND pps.packid=${data.packid} WHERE u.hdid=${data.hdid} `, finalresult = []
// 		;
// 	console.log('list channel ...', data);
// 	pool.getConnection(function (err, conn) {
// 		if (!err) {
// 			sql = conn.query(sqlquery, function (err, result) {
// 				if (!err) {
// 					finalresult.push(result);
// 					sql = conn.query(` SELECT COUNT(*) AS c FROM smsv2.users u 
// 						LEFT JOIN  smsv2.PackPriceShare pps ON u.id=pps.resellerid AND pps.hdid=u.hdid AND pps.packid=${data.packid} WHERE u.hdid=${data.hdid}`, function (err, result) {
// 						conn.release();
// 						if (!err) {
// 							finalresult.push(result[0]);

// 							res.end(JSON.stringify(finalresult));
// 						}
// 					});
// 				} else {
// 					conn.release();
// 				}
// 			});
// 		}
// 	});
// });
package.post('/searchpackshareone', function (req, res, err) {
	console.log('req.body')
	var data = req.body,jwtdata=req.jwt_data,where=[];
	
		let sql, sqlquery = ` SELECT  u.profileid ,u.id,u.enablestatus,IFNULL(pps.mso_share,0)mso_share,
		 IFNULL(pps.dist_share,0)dist_share,IFNULL(pps.sub_dist_share,0)sub_dist_share,IFNULL(pps.reseller_share,0)reseller_share,
		 u.dist_or_sub_flg,u.distid,u.subdistid,u.usertype,IFNULL(pps.r_price,0) r_price FROM smsv2.users u 
		LEFT JOIN  smsv2.PackPriceShare pps ON u.id=pps.resellerid and pps.packid=${data.packid}
		 WHERE  u.usertype IN (444,555,666) `,
		 sqlqueryc=` SELECT COUNT(*) AS c FROM smsv2.users u 
		 LEFT JOIN  smsv2.PackPriceShare pps ON u.id=pps.resellerid AND pps.hdid=u.hdid WHERE  u.usertype=666 OR u.usertype=444 OR u.usertype=555 `, finalresult = []
		;
		if(jwtdata.role > 777 && data.hdid != '' && data.hdid !=null)where +=(` AND u.hdid=${data.hdid} `);
		if(jwtdata.role <= 777)where +=(` AND u.hdid=${jwtdata.hdid} `);
		if(data.userid != '' && data.userid != null) where +=(` AND pps.resellerid= ${data.userid} `);

		// if (where.length > 0) {
		// 	where =  " "+where
		// 	sqlquery += where;
		// 	sqlqueryc += where;
		// }
		sqlquery += where;
		sqlqueryc += where;

	console.log('list channel ...', data);
	console.log('sqlquery',sqlquery);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				if (!err) {
					finalresult.push(result);
					sql = conn.query(sqlqueryc, function (err, result) {
						conn.release();
						if (!err) {
							finalresult.push(result[0]);
							console.log('result', result[0]);

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


package.post('/searchpack', function (req, res) {
	var sql, data = req.body, where=[],jwtdata=req.jwt_data,
		sqlquery = `SELECT p.packid,p.packname,p.bundlepack,p.bcshare,p.bcamt,
		IF(p.tax_type=0,((p.bcamt/((100+h.igst)/100))),(p.bcamt))amt,
		IF(p.tax_type=1,p.bcamt-((p.bcamt/((100+h.igst)/100))),((p.bcamt*((100+h.igst)/100))-p.bcamt))taxamt,
		h.igst FROM smsv2.package p
		LEFT JOIN smsv2.hd h ON p.hdid=h.hdid 	
		`;
		if(jwtdata.role > 777 && data.hdid != '' && data.hdid !=null)where.push(`  p.hdid=${data.hdid}`);
		if(jwtdata.role <= 777)where.push(`  p.hdid=${jwtdata.hdid}`);
	if (data.hasOwnProperty('packtype') && data.packtype )where.push( `p.packtype=${data.packtype}`); 	
	if (data.hasOwnProperty('packid') && data.packid)where.push(` p.packid =${data.packid}`);
	
	if (where.length > 0) {
		where = ' WHERE ' + where.join(' AND ');
		sqlquery += where;
		// sqlqueryc += where;
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


package.post('/packlist', function (req, res, err) {
	var jwtdata = req.jwt_data, where = [], sql, sqlquery =
		`SELECT h.hdname,p.hdid,p.packid ,p.packname,p.packtype ,p.bcid,u.fullname,p.channelid,p.srvtype,p.enable_tax,p.tax_type,pc.prodict_id,pl.logmsg,p.cdate,
GROUP_CONCAT(c.channame) channame  
FROM smsv2.package p 
LEFT JOIN  users u ON p.bcid=u.id
INNER JOIN hd h ON p.hdid=h.hdid
left join pack_log pl on pl.packid=p.packid
LEFT JOIN channel c ON FIND_IN_SET(c.chanid,p.channelid)
LEFT JOIN 
(SELECT pc.packid,pc.hdid,GROUP_CONCAT(cas.cas_name,' CAS ID: ',pc.prodid,' ') prodict_id
FROM smsv2.hd_cas cas,smsv2.pack_cas pc WHERE pc.casid=cas.casid AND pc.hdid=cas.hdcasid GROUP BY cas.hdid,pc.packid
) pc 
ON pc.packid=p.packid AND pc.hdid=p.hdid  `, finalresult = [],
		sqlqueryc = ` SELECT count(*) as cnt FROM smsv2.package p `,
		data = req.body;

	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` p.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(`  p.hdid= ${jwtdata.hdid} `);
	if (data.packtype != '' && data.packtype != null) where.push (`  p.packtype= ${data.packtype} `);
	if (data.packid != '' && data.packid != null) where.push(` p.packid= ${data.packid}`);
	if (data.bcid !='' && data.bcid !=null) where.push(` p.bcid= ${data.bcid}`);


	if (where.length > 0) {
		where = ' WHERE ' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where;
	}
	sqlquery += ' GROUP BY p.packid ';


	if (data.index != null) console.log('-----');
	if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
	console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
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
							console.log('result', result[0]);
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



package.post('/getpackedit', function (req, res) {

	var data = req.body,
		sql, sqlquery = `SELECT p.packid ,p.packname,p.packtype , p.status,p.srvtype,p.enable_tax,p.tax_type , p.channelid,p.hdid,p.bcid,p.bcamt,p.bcshare,p.bundlepack,pc.prodid,pc.casid FROM smsv2.package p 
LEFT JOIN smsv2.pack_cas pc ON p.packid=pc.packid
WHERE  p.packid =`+ data.packid;
	console.log(data, 'vytyhfytyfytftff')
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, data.id, function (err, result) {
				// console.log(id,"++++++++++");

				console.log('get pack', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});
package.post('/getpacklist', function (req, res, err) {
	var jwtdata = req.jwt_data, where = [],
		sql, sqlquery = `  SELECT p.packid,p.packname,p.packtype,p.hdid,GROUP_CONCAT(c.channame) channame 
	FROM smsv2.package p LEFT JOIN smsv2.channel c ON c.hdid=p.hdid AND FIND_IN_SET(c.chanid,p.channelid) 
	   ` , finalresult = [],
		data = req.body;
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` p.hdid= ${data.hdid} `);
	if (jwtdata.role <= 777) where.push(`  p.hdid= ${jwtdata.hdid} `);
	if (where.length > 0) {
		where = ' WHERE ' + where.join(' AND ');
		sqlquery += where;
		sql += where;
	}
	sqlquery += 'GROUP BY p.packid,p.packname'

	console.log('list channel ...', sqlquery);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				if (!err) {
					finalresult.push(result);
					sql = conn.query(` SELECT count(*) c FROM smsv2.package p LEFT JOIN smsv2.channel c ON c.hdid=p.hdid 
					AND FIND_IN_SET(c.chanid,p.channelid) GROUP BY p.packid,p.packname`, function (err, result) {
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
async function packageedit(req) {
	console.log('Edit package Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {
		var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog = "", packlog = "";
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
				console.log('channelsrv Data', data);
				let checkchannel = await conn.query(`SELECT * FROM smsv2.package WHERE  packid = ${data.packid} `);
				if (checkchannel[0].length == 1) {
					let cp = checkchannel[0][0];
					let status = data.status == true ? 1 : 0,
						enable_tax = data.enable_tax == true ? 1 : 0, updateData;
					let updateValue = {
						packname: data.packname,
						packtype: data.packtype,
						status: status,
						srvtype: data.srvtype,
						enable_tax: enable_tax,
						hdid: data.hdid,
						bcamt: data.bcamt,
						lmby: jwtdata.id,
						tax_type: data.tax_type
					}

					if (cp.bcamt != data.bcamt) {
						updateValue['bcamt'] = data.bcamt;
						alog += ` Bcamount changed From ${cp.bcamt} to ${data.bcamt}.`;
					}
					if (cp.packname != data.packname) {
						updateValue['packname'] = data.packname;
						alog += ` Packname changed From ${cp.packname} to ${data.packname}.`;
					}
					if (cp.tax_type != data.tax_type) {
						updateValue['tax_type'] = data.tax_type
						alog += ` Tax Type changed From ${cp.tax_type} to ${data.tax_type}.`;
					}
					if (cp.srvtype != data.srvtype) {
						updateValue['srvtype'] = data.srvtype;
						alog += ` Service Type changed From ${cp.srvtype} to ${data.srvtype}.`;
					}
					if (data.packtype != 3) {
						let channelid = data.channel.toString().replace(/\[/g, '').replace(/\]/g, '');

						updateData = {
							...updateValue, bcid: data.bcid,
							bcshare: data.broadcaster_share,
							channelid: channelid,
							bundlepack: ''

						}
					} else {
						let bundlepack = data.package.toString().replace(/\[/g, '').replace(/\]/g, '');
						updateData = { ...updateValue, bundlepack: bundlepack, bcid: data.bcid = '', bcshare: data.bcshare = '', channelid: '' }
					}
					if (cp.packtype != data.packtype) {
						if (cp.packtype == 0) { alog += ' Base Pack to'; } if (cp.packtype == 1) { alog += ' packtype to ' }
						if (cp.packtype == 2) { alog += ' AddOn Pack to' } if (cp.packtype == 3) { alog += ' Bundle Pack to' }
						if (data.packtype == 0) { alog += ' Base Pack'; } if (data.packtype == 1) { alog += ' packtype' }
						if (data.packtype == 2) { alog += ' AddOn Pack' } if (data.packtype == 3) { alog += ' Bundle Pack' }
						// console.log('Package Type Changed From' + packtype + '' + packtypeto + '. ');
						alog += 'Package Type Changed From' + alog + '. ';

					}
					if (data.packtype != 3) {
						let oldchannel = JSON.parse('[' + cp.channelid + ']')
							, newchannel = data.channel;
						console.log('oldchannel', oldchannel);
						console.log('new channel', newchannel);
						let removeChannel = oldchannel.filter(item => !newchannel.includes(item));
						let newChannels = newchannel.filter(item => !oldchannel.includes(item));
						// let  newchannels = newchannel.filter(function(item) {
						// 	return !oldchannel.includes(item) ? true : oldchannel.splice(oldchannel.indexOf(item),1) && false;
						//   });

						if (newChannels != '') {

							let newchansqlquery = ` SELECT GROUP_CONCAT(channel.channame) channame FROM smsv2.channel WHERE channel.chanid IN (` + newChannels.toString() + `); `;
							console.log('\n', newchansqlquery, '\n');
							let newchandetails = await conn.query(newchansqlquery);
							console.log('(' + newchandetails[0][0]['channame'] + ') These Channels are added in this Package. ');
							packlog += '(' + newchandetails[0][0]['channame'] + ') These New Channels are added in this Package. ';

						}
						if (removeChannel != '') {
							let oldchansqlquery = ` SELECT GROUP_CONCAT(channel.channame) channame FROM smsv2.channel WHERE channel.chanid IN (` + removeChannel.toString() + `); `;
							console.log('\n', oldchansqlquery, '\n');
							let oldchandetails = await conn.query(oldchansqlquery);
							console.log('(' + oldchandetails[0][0]['channame'] + ') These Channels are Removed from this Package. ');
							packlog += '(' + oldchandetails[0][0]['channame'] + ') These Channels are Removed from this Package. ';
						}
					}
					if (data.packtype == 3) {
						let oldbuddle = JSON.parse('[' + updateData.bundlepack + ']'),
							package = data.package;
						console.log('oldbuddle', oldbuddle);
						console.log('new channel', package);
						let removedbuddle = oldbuddle.filter(item => !package.includes(item));
						let newbuddle = package.filter(item => !oldbuddle.includes(item));
						console.log('removedbuddle', removedbuddle);
						console.log('newbuddle', newbuddle);

						if (newbuddle != '') {
							let newbudlesql = ` SELECT GROUP_CONCAT('(pack: ',packname,', pack_type: ',IF(packtype=0,'Base',IF(packtype=1,'ALaCart',IF(packtype=2,'Add_On','Input_wrong'))),')') FROM smsv2.package WHERE packid IN  (` + newbuddle.toString() + `); `;
							console.log('\n ', newbudlesql, '\n');
							let newbuddlepack = await conn.query(newbudlesql);
							console.log('newbuddle***', newbuddlepack);
							console.log('(' + newbuddlepack[0][0]['packname'] + ') These Package are added in this Package. ');
							packlog += '(' + newbuddlepack[0][0]['packname'] + ') These New Package are added in this Package. ';

						}
						if (removedbuddle != '') {
							let removedbuddlesql = ` SELECT GROUP_CONCAT('(pack: ',packname,', pack_type: ',IF(packtype=0,'Base',IF(packtype=1,'ALaCart',IF(packtype=2,'Add_On','Input_wrong'))),')') FROM smsv2.package WHERE packid IN (` + removedbuddle.toString() + `); `;
							console.log('\n', removedbuddlesql, '\n');
							let oldbuddlepack = await conn.query(removedbuddlesql);
							console.log('(' + cp.oldbuddlepack[0][0]['packname'] + ') These Packname are removed in this Package. ');
							packlog += '(' + oldbuddlepack[0][0]['packname'] + ') These New Packname are removed in this Package. ';

						}
					}

					let update1 = `UPDATE  smsv2.package  SET ?,mdate=NOW() WHERE packid =?`
					console.log('ADD package Query: ', update1);
					let addchn = await conn.query(update1, [updateData, data.packid]);

					// let packdetail = addchn[0][0];
					// console.log('packdetail', packdetail);

					if (addchn[0]['affectedRows'] > 0) {
						// data.serviceid = data.serviceid.filter((val) =>   val.productid !='' || val.productid != 0 )
						// 	console.log('Cas --',data.serviceid);
						for (let pid = 0; pid < data.serviceid.length; pid++) {

							const p = data.serviceid[pid];
							console.log(p, 'dwyugwqufbjhf')
							console.log('----------', p);

							let checkpackage = await conn.query(`SELECT casid,prodid,hdid FROM smsv2.pack_cas WHERE hdid=${hdid} and casid=${p.id} AND prodid=${p.productid} and packid!=${data.packid} `);
							console.log('-------', checkpackage[0].length);
							if (checkpackage[0].length == 0) {
								let prod = checkpackage[0].length;

								let addprod = `INSERT INTO smsv2.pack_cas set prodid=${p.productid},casid=${p.id},hdid=${hdid},packid=${data.packid} `;

								addprod = await conn.query(addprod);
								if (prod.productid != p.productid) {
									addprod += ` , prodid=${p.productid}`
									alog += ` Product id Added ${p.productid} `
								}

								if (addprod[0]['affectedRows'] == 0) {
									erroraray.push({ msg: " Product ID:" + p.productid + " Product ID Not Added.", err_code: 457 });
									await conn.rollback();
									continue;
								}
							} else {
								//prodect id already available
								console.log('prodect id already available');
								erroraray.push({ msg: " Product ID:(" + p.productid + ") Exits.", err_code: 464 });
								await conn.rollback();
								continue;
							}
						}

					} else {
						erroraray.push({ msg: "Please Check Package ID", err_code: 473 });
						await conn.rollback();
					}
					console.log('log : ', alog);
					if (addchn[0]['affectedRows'] > 0) {
						let sqllog = "INSERT INTO smsv2.pack_log SET `logmsg`='" + alog + packlog + "',hdid=" + data.hdid + ",packid=" + data.packid + ",cby=" + jwtdata.id;
						sqllog = await conn.query(sqllog);
						if (sqllog[0]['affectedRows'] > 0) {
							let sqllogg = "INSERT INTO smsv2.activitylog SET table_id='UPDATE PACKAGE',`longtext`=' " + alog + packlog + " DONE BY',data='" + JSON.stringify(data) + "',hdid=" + hdid + ",usertype=" + jwtdata.role + ",cby=" + jwtdata.id;
							sqllogg = await conn.query(sqllogg);

							erroraray.push({ msg: " Package Updated Succesfully", err_code: 0 });
							await conn.commit();
						}
					} else {
						erroraray.push({ msg: "Please Check Package ID", err_code: 488 });
						await conn.rollback();
					}
				} else {
					erroraray.push({ msg: " package ID  Already Exists.", err_code: 492 });
					await conn.rollback();
				}
			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes Error', err_code: 'ERR' })

				await conn.rollback();
			}
			conn.release();
			console.log('connection Closed.');

		} else {
			erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
			return;
		}
		console.log('success--2');
		return resolve(erroraray);
	});
}
package.post('/packageedit', async (req, res) => {
	req.setTimeout(864000000);
	const validation = joiValidate.editpackageDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
	}
	let result = await packageedit(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));

});




package.post('/getproductid', function (req, res, err) {
	var jwtdata = req.jwt_data, where = [], sql, sqlquery =
		`SELECT  prodid,packid,casid FROM smsv2. pack_cas `, finalresult = [],
		sqlqueryc = ` SELECT count(*) as cnt FROM smsv2.pack_cas`,
		data = req.body;
	if ( data.packid != '' && data.packid != null) where.push(` packid= ${data.packid} `);
	if (where.length > 0) {
		where = ' WHERE ' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where

	}
	if (data.index != null) console.log('-----');
	if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
	// console.log('getlist...', sqlquery);
	console.log('list prodddd ...', sqlquery);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				if (!err) {
					finalresult.push(result);
					sql = conn.query(sqlqueryc, function (err, result) {
						conn.release();
						if (!err) {
							finalresult.push(result[0]);
							console.log('result', result[0]);
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

function findAO(arrob,arr){
    let bundlepack=(arr[arrob]['bundlepack']).split(",");
    bundlepack= bundlepack.map(Number)
    // console.log('bundlepack : ',bundlepack);
    arr.find((k, j) => {
        if (bundlepack.indexOf( Number(k.packid) ) >= 0 ) {
            if(arr[j]['packtype']!=0 && arr[j]['packtype']!=3)
            arr[j]['pack_status']=1
        }
    });
    return arr;

}
package.post('/getrenewalpack', function (req, res, err) {
    var  jwtdata = req.jwt_data, where = [], sql,data = req.body, sqlquery = `
     SELECT p.packid,p.packname,p.packtype,cust.packid cust_packid,IF(p.packid=cust.packid,1,0) pack_status,ps.r_price,ps.unit_type,ps.day 
	 ,cust.bundlepack
     FROM smsv2.package p INNER JOIN smsv2.PackPriceShare ps ON p.packid = ps.packid 
           LEFT JOIN (
               SELECT s.custid, s.hdid, b.bpackid packid, p.packtype,b.boxid,b.expiry_date,p.bundlepack
              FROM smsv2.subscriber s
               INNER JOIN box b ON b.custid = s.custid AND b.hdid = s.hdid
               INNER JOIN smsv2.package p ON p.packid = b.bpackid AND p.hdid = b.hdid
               WHERE b.expiry_date > NOW()
             UNION ALL
               SELECT s.custid,pad.hdid, pad.packid, pad.packtype,pad.boxid, pad.expiry_date,'' bundlepack
              FROM smsv2.subscriber s
               INNER JOIN smsv2.packAD pad ON s.custid = pad.custid
               WHERE pad.expiry_date > NOW()
           ) AS cust ON p.packid = cust.packid 
           AND cust.custid=${data.custid}
          AND cust.boxid=${data.boxid} 

`, finalresult = [];
        console.log('data',data);
        if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  p.hdid= ${data.hdid}`);
	if (jwtdata.role <= 777) where.push(`  p.hdid= ${jwtdata.hdid}`);
    if ( data.resellerid != '' && data.resellerid != null) where.push(' ps.resellerid=' + data.resellerid);
  

    if (where.length > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
        // sqlqueryc +=where;
	}
    // if(data.index!=null) console.log('-----');
	// if(data.index!=null && data.limit!=null) sqlquery +=' LIMIT '+data.index+','+data.limit;
// console.log('getlist...', sqlquery,'\n\r sqlqueryc :',sqlqueryc);
    console.log('data',sqlquery)
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log(err);
		} else {
			var sql = conn.query(sqlquery, function (err, result) {
				if (!err) {
					conn.release();
					//  console.log(JSON.parse(JSON.stringify(result)));
					let dd=[]
					JSON.parse(JSON.stringify(result)).find((o, i) => {
						if (o.packtype === 3 && o.pack_status==1) {
							console.log(i);
							let res= findAO(i,JSON.parse(JSON.stringify(result)))
							console.log('res',dd['res']=JSON.stringify(res));
					
					
						}else{
							// dd['res']=JSON.stringify(result)
							console.log('res',dd['res']=JSON.stringify(result));
							
						}
					});
					res.end((dd['res']));

					//  console.log('getrenewalpack \n\r',result);
					
				}
			});
		}
	});
});

// package.post('/getbundlepack', function (req, res, err) {
//     var  jwtdata = req.jwt_data, where = [], sql,data = req.body, sqlquery = `
// 	SELECT p.packid,p.packname,p.packtype,p.status FROM smsv2.package p INNER JOIN package bp ON FIND_IN_SET(p.packid,bp.bundlepack) and p.status=1 WHERE bp.packid=${data.packid}
//       `, finalresult = []
//         ;
//         console.log('data',data);
//         if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`  p.hdid= ${data.hdid}`);
// 	if (jwtdata.role <= 777) where.push(`  p.hdid= ${jwtdata.hdid}`);
//     if (where.length > 0) {
// 		where = ' WHERE' + where.join(' AND ');
// 		sqlquery += where;
	
//         // sqlqueryc +=where;
// 	}
//     // if(data.index!=null) console.log('-----');
// 	// if(data.index!=null && data.limit!=null) sqlquery +=' LIMIT '+data.index+','+data.limit;
// // console.log('getlist...', sqlquery,'\n\r sqlqueryc :',sqlqueryc);
//     console.log('data',sqlquery)
// 	pool.getConnection(function (err, conn) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			var sql = conn.query(sqlquery, function (err, result) {
// 				conn.release();
// 				if (!err) {
					
					
// 					// console.log('getbundlepack \n\r',result[0][0]);
// 					res.end(JSON.stringify(result));
// 				}
// 			});
// 		}
// 	});
// });
module.exports = package;