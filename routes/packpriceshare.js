var express = require('express'),
	compress = require('compression'),
	packpriceshare = express.Router(),
	pool = require('../connection/conn'),
	poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/packpriceshare');

async function addpackpriceshare(req) {
	// console.log('Edit User Data:', req.jwt_data);
	return new Promise(async (resolve, reject) => {

		var erroraray = [], data = req.body, jwtdata = req.jwt_data, hdid = '', logstatus = false;
		let conn = await poolPromise.getConnection();
		if (conn) {
			if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
			if (jwtdata.role <= 777) hdid = jwtdata.hdid;
			if (hdid == '' || hdid == null) {
				erroraray.push({ msg: "Please Select Headend.", err_code: 150 });
				await conn.rollback();
			}
			// console.log('req', data);
			let checkshare = `select bcshare,bcamt,packtype from smsv2.package where packid=${data.packid}`
			await conn.beginTransaction();
			try {
				checkshare = await conn.query(checkshare);
				if (data.mode == 0) {		//	Individual Add
					console.log('Add file', data.share_details.length);

					for (var i = 0; i < data.share_details.length; i++) {
						let share = data.share_details[i];
						if (checkshare[0][0].bcamt < share.r_price&& checkshare[0][0]["packtype"]!=3) {
							erroraray.push({ msg: 'Reseller Share not valid', err_code: 104 });
							await conn.rollback();
							continue;
						}

						console.log('data', share);
						// console.log(Number(checkshare[0][0].bcshare),Number(share.mso_share),Number(share.dist_share),Number(share.sub_dist_share),Number(share.reseller_share));
						let msos, dists, sdists, rshare;
						if ((share.mso_share) != '' && (share.mso_share) != null) { msos = share.mso_share } else { msos = 0 }
						if ((share.dist_share) != '' && (share.dist_share) != null) { dists = share.dist_share } else { dists = 0 }
						if ((share.sub_dist_share) != '' && (share.sub_dist_share) != null) { dists = share.dist_share } else { sdists = 0 }
						if ((share.reseller_share) != '' && (share.reseller_share) != null) { rshare = share.reseller_share } else { rshare = 0 }
						console.log(Number(checkshare[0][0].bcshare), msos, dists, sdists, rshare);
						let tot_share = Number(+ Number(msos) + Number(dists) + Number(sdists) + Number(rshare))
						console.log('tot_share :', Number(checkshare[0][0].bcshare) + tot_share);
						if ((Number(checkshare[0][0].bcshare) + tot_share) != 100) {
							erroraray.push({ msg: 'Share not valid', err_code: 104 });
							await conn.rollback();
							continue;
						}
						
						else {

							let checkoop = `select * from smsv2.PackPriceShare where hdid=${data.hdid} AND resellerid=${share.userid} AND packid=${data.packid} `;
							checkoop = await conn.query(checkoop);
							if (checkoop[0].length == 0) {
								addshare = ` INSERT INTO smsv2.PackPriceShare set 
							            hdid=${data.hdid},
							            packid=${data.packid},
							            resellerid=${share.userid},
								        r_price=${share.r_price},
								        cby=${jwtdata.id}
								          ` ;
								if (share.reseller_share != '' && share.reseller_share != null) addshare += `,reseller_share =${share.reseller_share}`;
								if (share.mso_share != '' && share.mso_share != null) addshare += `,mso_share =${share.mso_share}`;
								if (share.dist_share != '' && share.dist_share != null) addshare += `,dist_share =${share.dist_share}`;
								if (share.sub_dist_share != '' && share.sub_dist_share != null) addshare += `,sub_dist_share =${share.sub_dist_share}`;
								console.log('ADD operator Query: ', addshare);
								let checkpack = await conn.query(`SELECT packid FROM smsv2.PackPriceShare WHERE hdid=${data.hdid} AND resellerid=${share.userid} and  packid = ${data.packid} `);
								if (checkpack[0].length != 0) {
									erroraray.push({ msg: "Packid Aldready Exists.", err_code: 191 });
									await conn.rollback();
									continue;
								} else {
									console.log('ADD operator Query: ', addshare);
									addshare = await conn.query(addshare);
									if (addshare[0]['affectedRows'] > 0) {
										erroraray.push({ msg: "Pack Price Sucessfully Assigned.", err_code: 0 });
										await conn.commit();

									}
									else {
										erroraray.push({ msg: "Pack Price Not Assigned.", err_code: 199 });
										await conn.rollback();
									}

								}

							}
						}
						if (i == ((data.share_details.length) - 1)) logstatus = true

						if (logstatus = true) {
							let ppslog = "INSERT INTO smsv2.PackPriceShareLog SET   hdid=" + data.hdid + ",packid=" + data.packid +
								",resellerid=" + share.userid + ",r_price=" + share.r_price + ", cby=" + jwtdata.id;
							if (share.reseller_share != '' && share.reseller_share != null) ppslog += `,reseller_share =${share.reseller_share}`;
							if (share.mso_share != '' && share.mso_share != null) ppslog += `,mso_share =${share.mso_share}`;
							if (share.dist_share != '' && share.dist_share != null) ppslog += `,dist_share =${share.dist_share}`;
							if (share.sub_dist_share != '' && share.sub_dist_share != null) ppslog += `,sub_dist_share =${share.sub_dist_share}`;
							ppslog = await conn.query(ppslog);
							if (ppslog[0]['affectedRows'] > 0) {
								erroraray.push({ msg: " PackPriceShareLog Added  Succesfully:", err_code: 0 });
								await conn.commit();
							}
						} else {
							erroraray.push({ msg: "Try Later.", err_code: 199 });
							await conn.rollback();
							// continue;
						}
					}





				}
				if (data.mode == 1) {
					// bulk edit
					for (var i = 0; i < data.share_details.length; i++) {
						let share = data.share_details[i];

						// console.log('Add file', data.share_details.length);
						// console.log('data', share);
						// console.log(Number(checkshare[0][0].bcshare),Number(share.mso_share),Number(share.dist_share),Number(share.sub_dist_share),Number(share.reseller_share));
						let msos, dists, sdists, rshare;
						if ((share.mso_share) != '' && (share.mso_share) != null) { msos = share.mso_share } else { msos = 0 }
						if ((share.dist_share) != '' && (share.dist_share) != null) { dists = share.dist_share } else { dists = 0 }
						if ((share.sub_dist_share) != '' && (share.sub_dist_share) != null) { sdists = share.sub_dist_share } else { sdists = 0 }
						if ((share.reseller_share) != '' && (share.reseller_share) != null) { rshare = share.reseller_share } else { rshare = 0 }
						console.log(Number(checkshare[0][0].bcshare), msos, dists, sdists, rshare);
						let tot_share = Number(+ Number(msos) + Number(dists) + Number(sdists) + Number(rshare))
						console.log('tot_share :', Number(checkshare[0][0].bcshare) + tot_share);
						if ((Number(checkshare[0][0].bcshare) + tot_share) != 100) {
							erroraray.push({ msg: 'Share not valid', err_code: 104 });
							await conn.rollback();
							continue;
						}
						if (checkshare[0][0].bcamt < share.r_price) {
							erroraray.push({ msg: 'Reseller Price not valid', err_code: 104 });
							await conn.rollback();
							continue;
						}
						else {
							// console.log("Mode - 1 - share : ", share);
							let check = `select * from smsv2.PackPriceShare where hdid=${data.hdid} AND resellerid=${share.userid} and packid=${data.packid} `,
								addshare = ` INSERT INTO smsv2.PackPriceShare(hdid,packid,resellerid,r_price,mso_share,reseller_share,cby,cdate) values (${data.hdid},${data.packid},${share.userid},${share.r_price},${share.mso_share},${share.reseller_share} ,${jwtdata.id},now() ) 
								 ON DUPLICATE KEY UPDATE r_price =${share.r_price},mso_share= ${share.mso_share},reseller_share= ${share.reseller_share},mby =${jwtdata.id},mdate=now()
								  `
							if (share.dist_share != '' && share.dist_share != null) addshare += `,dist_share =${share.dist_share}`;
							if (share.sub_dist_share != '' && share.sub_dist_share != null) addshare += `,sub_dist_share =${share.sub_dist_share}`;
							console.log('check Query', check);

							check = await conn.query(check);
							console.log('check', check[0].length);
							if (check[0].length == 0 || check[0].length == 1) {


								addshare = await conn.query(addshare);
								if (addshare[0]['affectedRows'] > 0) {
									erroraray.push({ msg: "Pack Price Assigned Sucessfully  .", err_code: 0 });
									await conn.commit();

								} else {
									erroraray.push({ msg: checkpack[0].length + "Pack Price Already Assigned .", err_code: 199 });
									await conn.rollback();
								}


							}

						}
						if (i == ((data.share_details.length) - 1)) logstatus = true
					}


				}
				// bulk assign
				if (data.mode == 2) {

					let share = data.share_details[0];
					console.log("share.r_price :",share);
					let addshare = ` INSERT INTO smsv2.PackPriceShare(hdid,packid,resellerid,mso_share,reseller_share,r_price,cby,cdate)  ` +
						` SELECT hdid,${data.packid},id,${share.mso_share} ,${share.reseller_share} ,${share.r_price} ,${jwtdata.id},NOW() FROM smsv2.users `;
					if (share.dist_share != '' && share.dist_share != null) addshare += `,dist_share =${share.dist_share}`;
					if (share.sub_dist_share != '' && share.sub_dist_share != null) addshare += `,sub_dist_share =${share.sub_dist_share}`;
					addshare += ' WHERE hdid =' + data.hdid +' AND usertype in (666,555,444) '    
					console.log('ADD operator Query: ', addshare);
					let checkpack = await conn.query(`SELECT packid FROM smsv2.PackPriceShare WHERE hdid=${data.hdid} and packid = ${data.packid} `);
					if (checkpack[0].length != 0) {
						erroraray.push({ msg: checkpack[0].length + "Packid Already Exists.", err_code: 193 });
						await conn.rollback();
					} else {
						if (checkshare[0][0].bcamt < share.r_price&& checkshare[0][0]["packtype"]!=3) {
							erroraray.push({ msg: 'Reseller Price not valid', err_code: 104 });
							await conn.rollback();							
						}else{
							addshare = await conn.query(addshare);
							if (addshare[0]['affectedRows'] > 0) {
								erroraray.push({ msg: "Pack Price Assigned Sucessfully  .", err_code: 0 });
								await conn.commit();
								logstatus = true;
							} else {
								erroraray.push({ msg: checkpack[0].length + "Pack Price Already Assigned .", err_code: 199 });
								await conn.rollback();
							}
						}
					
					}
					// logstatus = true;

				}
				console.log("logstatus :", logstatus);
				if (logstatus) {




					let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD PackPriceShare',`longtext`='DONE BY',cby=" + jwtdata.id;
					sqllog = await conn.query(sqllog);
					if (sqllog[0]['affectedRows'] > 0) {
						await conn.commit();
					}
				} else {
					erroraray.push({ msg: "Try Later.", err_code: 199 });
					await conn.rollback();
					// continue;
				}

			} catch (e) {
				console.log('Error ', e);
				erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })

				await conn.rollback();
			}
		} else {
			return erroraray.push({ msg: 'Please try after sometimes', err_code: 500 });
		}

		console.log('Success--1');
		console.log('connection Closed.');
		conn.release();
		console.log('success--2');
		return resolve(erroraray);
	});
}


packpriceshare.post('/addpackpriceshare', async (req, res) => {
	req.setTimeout(864000000);

	const validation = joiValidate.packageshareDataSchema.validate(req.body);
	if (validation.error) {
		console.log(validation.error.details);
		return res.json([{ msg: validation.error.details[0].message, err_code: '389' }]);
	}
	let result = await addpackpriceshare(req);
	console.log("Process Completed", result);
	res.end(JSON.stringify(result));
});



packpriceshare.post('/listpackshareprice', function (req, res, err) {
	var where = [], jwtdata = req.jwt_data, data = req.body,
		sql, sqlquery = `SELECT pps.hdid,p.packid,pps.resellerid,u.profileid,p.bcamt,p.bcshare,pps.reseller_share,pps.mso_share,pps.dist_share,pps.sub_dist_share,pps.r_price
	 FROM smsv2.PackPriceShare pps
	 INNER JOIN  smsv2.package p ON pps.packid=p.packid
	 INNER JOIN smsv2.users u ON pps.resellerid=u.id   `,
		sqlqueryc = `SELECT count(*) count
		FROM smsv2.PackPriceShare pps
		INNER JOIN  smsv2.package p ON pps.packid=p.packid
		INNER JOIN smsv2.users u ON pps.resellerid=u.id    `,
		finalresult = [];
	console.log('listpackshareprice------\n\r', data);
	if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(`pps.hdid=${data.hdid}`);
	if (jwtdata.role <= 777) where.push(`pps.hdid=${jwtdata.hdid}`);
	if (where.lenght > 0) {
		where = ' WHERE' + where.join(' AND ');
		sqlquery += where;
		sqlqueryc += where;
	}
	if (data.index != null) console.log('-----');
	if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
	console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);


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



module.exports = packpriceshare;

