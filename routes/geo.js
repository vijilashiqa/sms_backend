"use strict";
var express = require('express'),
	compress = require('compression'),
	geo = express.Router(),
	pool = require('../connection/conn');
poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/geo');


geo.use(compress());

geo.post('/listcountry', function (req, res, err) {
	var sql, sqlquery = 'SELECT country_pk,country_name FROM `geo`.country LIMIT ?,? ',
		sqlqueryc = 'SELECT COUNT(`country_pk`) AS `count` FROM geo.`country`', finalresult = [],
		data = req.body;
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

geo.post('/getpincodeedit', function (req, res) {
	var data = req.body,
		sql, sqlquery = `SELECT id,pincode  FROM geo.pincode where  id=${data.id}`;
		console.log('data',data);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get pincode', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});

geo.post('/listpincode', function (req, res, err) {
	var sql, sqlquery = ' SELECT id,pincode FROM `geo`.pincode ',
		sqlqueryc = ' SELECT COUNT(`id`) AS `count` FROM geo.`pincode`', finalresult = [],
		data = req.body;

	if (data.hasOwnProperty('like') && data.like) {
		sqlquery += ' WHERE pincode LIKE "%' + data.like + '%" '
		sqlqueryc += ' WHERE pincode LIKE "%' + data.like + '%" '
	}
	if (data.limit && data.index) {
		sqlquery += ' LIMIT ?,?'
	}
	console.log('Pinccode Data: ', data);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, [data.index, data.limit], function (err, result) {
				console.log('List Pincode query----', sqlquery);
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


geo.post('/getcountryedit', function (req, res) {
	var data = req.body,
		sql, sqlquery = `SELECT country_pk ,country_name FROM geo.country where  country_pk=${data.country_pk}`;
		console.log('data',data);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get country', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});

geo.post('/getcountry', function (req, res, err) {
	pool.getConnection(function (err, conn) {
		let data = req.body, sqlquery = 'SELECT country_pk ,country_name name FROM `geo`.country'
		if (data.hasOwnProperty('like') && data.like) {
			sqlquery += 'WHERE country_name LIKE "%' + data.like + '%" '
		}
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

geo.post('/getpincode', function (req, res, err) {
	pool.getConnection(function (err, conn) {
		if (!err) {
			var sql = conn.query('SELECT id,pincode FROM `geo`.pincode', function (err, result) {
				conn.release();
				if (!err) {
					res.send(JSON.stringify(result));
				}
			});
		}
	});
});

geo.post('/addPincode', function (req, res) {
	const validation = joiValidate.pinDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, insertdata;
	const jwt_data = req.jwt_data;
	insertdata = {
		pincode: data.pincode,
		created_by: jwt_data.id
	};
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`pincode` WHERE pincode = ?)AS COUNT', data.pincode, function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('INSERT INTO geo.`pincode` SET ?', insertdata, function (err) {
							if (err) {
								Errorhandle('Pincode not Created');
							} else {
								Errorhandle('Pincode Created Successfully', 1);

							}
						});
					} else {
						Errorhandle('Pincode Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});



geo.post('/editPincode', function (req, res) {
	const validation = joiValidate.editpinDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, updatesata;
	const jwt_data = req.jwt_data;
	updatesata = [
		data.pincode,
		jwt_data.id,
		data.id
	];
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`pincode` WHERE pincode = ? AND id!=?)AS COUNT', [data.pincode, data.id], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('UPDATE geo.`pincode` SET pincode=?,modified_by=? WHERE id=?', updatesata, function (err) {
							if (err) {
								Errorhandle('Pincode not Update');
							} else {
								Errorhandle('Pincode Updated Successfully', 1);

								// conn.release();
								// res.end(JSON.stringify({msg:'Pincode Update Successfully',status:1}));
							}
						});
					} else {
						Errorhandle('Pincode Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});
// channel.post('/editPincode', function (req,res) {
// 	req.setTimeout(864000000);
// 	const validation = joiValidate.pinDataSchema.validate(req.body);
// 	if (validation.error) return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
// 	let result =  addgenre(req);
// 	console.log("Process Completed", result);
// 	res.end(JSON.stringify(result));
// });


geo.post('/addCountry', function (req, res) {
	const validation = joiValidate.countryDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, insertdata;
	insertdata = {
		country_name: data.countryname,
		created_by: data.cuser
	};
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`country` WHERE country_name = ?)AS COUNT', data.countryname, function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('INSERT INTO geo.`country` SET ?', insertdata, function (err) {
							if (err) {
								Errorhandle('Country not Created');
							} else {
								Errorhandle('Country Created Successfully', 1);
							}
						});
					} else {
						Errorhandle('Country Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});


geo.post('/editcountry', function (req, res) {
	const validation = joiValidate.editcountryDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, updatesata, jwt_data = req.jwt_data;
	console.log('data', data)
	updatesata = [
		data.countryname,
		data.country_pk
	];
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`country` WHERE country_name = ? AND country_pk!=?)AS COUNT', [data.countryname, data.country_pk], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('UPDATE geo.`country` SET country_name=? WHERE country_pk=?', updatesata, function (err) {
							console.log('country update', sql.sql);
							if (err) {
								Errorhandle('Country not Update');
							} else {
								Errorhandle('Country Updated Successfully', 1);

							}
						});
					} else {
						Errorhandle('Country Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});


geo.post('/liststate', function (req, res, err) {
	var sql, sqlquery = 'SELECT state.state_pk,state.state_name,state.country_fk,country.`country_name` ' +
		'FROM geo.`state` AS state,geo.`country` AS country ' +
		'WHERE country.`country_pk` = state.`country_fk` LIMIT ?,? ',
		sqlqueryc = 'SELECT COUNT(`state_pk`) AS `count` FROM geo.`state`', finalresult = [],
		data = req.body;
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

geo.post('/getstateedit', function (req, res) {
	var data = req.body,
		sql, sqlquery = `SELECT state_pk,state_name,country_fk  FROM geo.state where  state_pk=${data.state_pk}`;
		console.log('data',data);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get state', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});

geo.post('/addState', function (req, res) {
	console.log('data',req.jwt_data);
	const validation = joiValidate.stateDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, insertdata;
	const jwt_data = req.jwt_data;
	insertdata = {
		state_name: data.state_name,
		country_fk: data.country_fk,
		created_by: jwt_data.id
	};
	console.log('data',insertdata)
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`state` WHERE state_name = ? AND country_fk = ?)AS COUNT', [data.state_name, data.country_fk], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('INSERT INTO geo.`state` SET ?', insertdata, function (err) {
							if (err) {
								console.log('state in f', sql.sql)
								Errorhandle('State not Created');
							} else {
								Errorhandle('State Created Successfully', 1);
							}
						});
					} else {
						Errorhandle('State Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});

geo.post('/editState', function (req, res) {
	console.log('data',req.jwt_data)
	const validation = joiValidate.editsateDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, updatedate;
	const jwt_data = req.jwt_data;
	console.log('data', data)
	updatedate = [
		data.state_name,
		data.country_fk,
		jwt_data.id,
		data.state_pk
	];
	console.log('data',updatedate);
	// console.log('updatedata',updatedate);
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`state` WHERE state_name = ? AND country_fk = ? AND state_pk!=?)AS COUNT', [data.state_name, data.country_fk, data.state_pk], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('UPDATE  geo.state SET state_name = ?,country_fk = ?,modified_by=? WHERE state_pk=?', updatedate, function (err) {
							console.log('editsat***', sql.sql)
							if (err) {
								Errorhandle('State not Update');
								
							} else {
								Errorhandle('State Updated Successfully', 1);
							}
						});
						
					} else {
						Errorhandle('State Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});



geo.post('/listdistrict', function (req, res, err) {
	var sql, sqlquery = 'SELECT district.`district_pk`,district.`district_name`,district.state_fk,state.state_name,country.`country_name`, ' +
		' state.`country_fk` FROM geo.`state` AS state,geo.`country` AS country,geo.`district` AS district ' +
		' WHERE country.`country_pk` = state.`country_fk` AND district.`state_fk` = state.`state_pk` LIMIT ?,? ',
		sqlqueryc = 'SELECT COUNT(`district_pk`) AS `count` FROM geo.`district`', finalresult = [],
		data = req.body;
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


geo.post('/getstate', function (req, res, err) {
	console.log('GETSTATE');
	var data = req.body, sqlquery = 'SELECT state_pk id ,state_name name  FROM geo.`state` WHERE country_fk =' + data.country_fk;
	if (data.hasOwnProperty('like') && data.like) {
		sqlquery += 'AND state_name LIKE "%' + data.like + '%" '
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

geo.post('/addDistrict', function (req, res) {
	const validation = joiValidate.distDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, insertdata;
	const jwt_data = req.jwt_data;
	insertdata = {
		state_fk: data.state_fk,
		district_name: data.district_name,
		created_by: jwt_data.id
	};
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`district` WHERE state_fk = ? AND district_name = ?)AS COUNT', [data.state_fk, data.district_name], function (err, result) {
				console.log('Add district--------', sql.sql);
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('INSERT INTO geo.`district` SET ?', insertdata, function (err) {
							if (err) {
								console.log('dis====', sql.sql);
								Errorhandle('District not Created');
							} else {
								Errorhandle('District Created Successfully', 1);
								// conn.release();
								// res.end(JSON.stringify({msg:'District Created Successfully',status:1}));
							}
						});
					} else {
						Errorhandle('District Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});

geo.post('/editDistrict', function (req, res) {
	const validation = joiValidate.editdistDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, updatedate;
	const jwt_data = req.jwt_data;
	updatedate = [
		data.state_fk,
		data.district_name,
		jwt_data.id,
		data.district_pk
	];
	console.log(updatedate);
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`district` WHERE state_fk = ? AND district_name = ? AND district_pk!=?)AS COUNT', [data.state_fk, data.district_name, data.district_pk], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('UPDATE geo.`district` SET state_fk = ?,district_name = ?,modified_by = ? WHERE district_pk = ?', updatedate, function (err) {
							console.log('editdistric***', sql.sql)
							if (err) {

								Errorhandle('District not Update');
							} else {
								Errorhandle('District Updated Successfully', 1);
							}
						});
					} else {
						Errorhandle('District Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});

geo.post('/listCity', function (req, res, err) {
	var sql, sqlquery = 'SELECT id,city_name,city.`district_fk`,district.`district_name`,district.state_fk,state.state_name, ' +
		' country.`country_name`,state.`country_fk` FROM geo.`state` AS state,geo.`country` AS country, ' +
		' geo.`district` AS district,geo.`city` AS city WHERE country.`country_pk` = state.`country_fk` ' +
		' AND district.`state_fk` = state.`state_pk` AND city.`district_fk`=district.`district_pk` LIMIT ?,? ',
		sqlqueryc = 'SELECT COUNT(`id`) AS `count` FROM geo.`city`', finalresult = [],
		data = req.body;
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

geo.post('/getdistrictedit', function (req, res) {
	var data = req.body,
		sql, sqlquery = 'SELECT district.district_pk,district.district_name,district.state_fk,state.state_name,country.country_name, ' +
		' state.country_fk FROM geo.state AS state,geo.country AS country,geo.district AS district ' +
		' WHERE country.country_pk = state.country_fk AND district.state_fk = state.state_pk AND  district.district_pk='+data.district_pk;
		console.log('data',data);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get dist', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});


geo.post('/getdistrict', function (req, res, err) {
	console.log('dist');
	var data = req.body, where = [],
		sqlquery = 'SELECT district_pk,district_name   FROM geo.`district`';
	if (data.hasOwnProperty('state_fk') && data.state_fk) {
		where.push(' state_fk =' + data.state_fk)
	}
	if (data.hasOwnProperty('like') && data.like) {
		where.push('district_name LIKE "%' + data.like + '%" ')
	}
	if (where.length) where = 'WHERE' + where.join(' AND ')
	console.log(data)
	pool.getConnection(function (err, conn) {
		if (!err) {

			var sql = conn.query(sqlquery + where, function (err, result) {
				console.log(sql.sql);
				conn.release();
				if (!err) {
					res.send(JSON.stringify(result));
				}
			});
		}
	});
});

geo.post('/addCity', function (req, res) {
	const validation = joiValidate.cityDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, insertdata;
	const jwt_data = req.jwt_data;
	insertdata = {
		district_fk: data.district_fk,
		city_name: data.city_name,
		created_by: jwt_data.id
	};
	console.log('addcity', data)
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`city` WHERE district_fk = ? AND city_name = ?)AS COUNT', [data.district_fk, data.city_name], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('INSERT INTO geo.`city` SET ?', insertdata, function (err) {
							console.log('addcity', sql.sql)
							if (err) {
								Errorhandle('City not Created');
							} else {
								Errorhandle('City Created Successfully', 1);

							}
						});
					} else {
						Errorhandle('City Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});

geo.post('/editCity', function (req, res) {
	const validation = joiValidate.editcityDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, updatedate;
	const jwt_data = req.jwt_data;
	updatedate = [
		data.district_fk,
		data.city_name,
		jwt_data.id,
		data.id
	];
	console.log(data);
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`city` WHERE city_name = ? AND district_fk = ? AND id!=?)AS COUNT', [data.city_name, data.district_fk, data.district_fk, data.id], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('UPDATE geo.`city` SET district_fk=?,city_name=?,modified_by=? WHERE id=?', updatedate, function (err) {
							console.log('add city admin', sql.sql)
							if (err) {
								// console.log('add city admin',sql.sql)
								Errorhandle('City not Update');
							} else {
								Errorhandle('City Updated Successfully', 1);
								// conn.release();
								// res.end(JSON.stringify({msg:'City Update Successfully',status:1}));
							}
						});
					} else {
						Errorhandle('City Already Exist');
					}
				} else {

					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});

geo.post('/listArea', function (req, res, err) {
	var sql, sqlquery = 'SELECT `area`.`id`,`area`.`pincode_fk`,pin.pincode,`area`.`area_name`,`area`.`city_fk`,city.city_name, ' +
		'city.`district_fk`,district.`district_name`,district.state_fk,state.state_name ' +
		',country.`country_name`,state.`country_fk` FROM geo.`state` AS state,geo.`country` AS country ' +
		',geo.`district` AS district,geo.`city` AS city,geo.`pincode` AS pin ,geo.`area` AS `area` ' +
		'WHERE country.`country_pk` = state.`country_fk` ' +
		'AND district.`state_fk` = state.`state_pk` AND city.`district_fk`=district.`district_pk` AND ' +
		'`area`.`city_fk` = city.`id` AND `area`.`pincode_fk`=pin.id LIMIT ?,? ',
		sqlqueryc = 'SELECT COUNT(`id`) AS `count` FROM geo.`area`', finalresult = [],
		data = req.body;
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


geo.post('/addArea', function (req, res) {
	const validation = joiValidate.areaDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, insertdata;
	const jwt_data = req.jwt_data;
	insertdata = {
		pincode_fk: data.pincode_fk,
		area_name: data.area_name,
		city_fk: data.city_fk,
		created_by: jwt_data.id
	};
	console.log(data);
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`area` WHERE pincode_fk = ? AND area_name = ? AND city_fk=?)AS COUNT', [data.pincode_fk, data.area_name, data.city_fk], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('INSERT INTO geo.`area` SET ?', insertdata, function (err) {
							if (err) {
								console.log('area', sql.sql);
								Errorhandle('Area not Created');
							} else {
								Errorhandle('Area Created Successfully', 1);
								// conn.release();
								// res.end(JSON.stringify({msg:'Area Created Successfully',status:1}));
							}
						});
					} else {
						Errorhandle('Area Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});

geo.post('/editArea', function (req, res) {
	const validation = joiValidate.editareaDataSchema.validate(req.body);
	if (validation.error) return res.json({ msg: validation.error.details[0].message, err_code: '422' });
	var sql, data = req.body, updatedate;
	const jwt_data = req.jwt_data;
	updatedate = [
		data.pincode_fk,
		data.area_name,
		data.city_fk,
		jwt_data.id,
		data.id
	];
	pool.getConnection(function (err, conn) {
		if (err) {
			console.log('Error');
		} else {
			sql = conn.query('SELECT EXISTS(SELECT * FROM geo.`area` WHERE pincode_fk = ? AND area_name = ? AND city_fk=? AND id!=?)AS COUNT', [data.pincode_fk, data.area_name, data.city_fk, data.id], function (err, result) {
				if (!err) {
					if (result[0].COUNT == 0) {
						sql = conn.query('UPDATE geo.`area` SET pincode_fk=?,area_name=?,city_fk=?,modified_by=? WHERE id=?', updatedate, function (err) {
							if (err) {
								// console.log(sql.sql)
								Errorhandle('Area not Update');
							} else {
								Errorhandle('Area Updated Successfully', 1);
								console.log(sql.sql)
								// conn.release();
								// res.end(JSON.stringify({msg:'Area Update Successfully',status:1}));
							}
						});
					} else {
						Errorhandle('Area Already Exist');
					}
				} else {
					Errorhandle('Pls Contact Admin')
				}
			});
		}
		function Errorhandle(msg, status = 0) {
			conn.release();
			res.end(JSON.stringify({ msg: msg, status: status }));
		}
	});
});
geo.post('/getareaedit', function (req, res) {
	var data = req.body,
		sql, sqlquery = 'SELECT `area`.`id`,`area`.`pincode_fk`,pin.pincode,`area`.`area_name`,`area`.`city_fk`,city.city_name, ' +
		'city.`district_fk`,district.`district_name`,district.state_fk,state.state_name ' +
		',country.`country_name`,state.`country_fk` FROM geo.`state` AS state,geo.`country` AS country ' +
		',geo.`district` AS district,geo.`city` AS city,geo.`pincode` AS pin ,geo.`area` AS `area` ' +
		'WHERE country.`country_pk` = state.`country_fk` ' +
		'AND district.`state_fk` = state.`state_pk` AND city.`district_fk`=district.`district_pk` AND ' +
		'`area`.`city_fk` = city.`id` AND `area`.`pincode_fk`=pin.id  AND area.id='+data.id;
		console.log('data',data);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get dist', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});
geo.post('/getcityedit', function (req, res) {
	var data = req.body,
		sql, sqlquery = 'SELECT id,city_name,city.`district_fk`,district.`district_name`,district.state_fk,state.state_name, ' +
		' country.`country_name`,state.`country_fk` FROM geo.`state` AS state,geo.`country` AS country, ' +
		' geo.`district` AS district,geo.`city` AS city WHERE country.`country_pk` = state.`country_fk` ' +
		' AND district.`state_fk` = state.`state_pk` AND city.`district_fk`=district.district_pk and city.id='+data.id;
		console.log('data',data);
	pool.getConnection(function (err, conn) {
		if (!err) {
			sql = conn.query(sqlquery, function (err, result) {
				// console.log(id,"++++++++++");
				console.log('get dist', sql.sql);
				conn.release();
				if (!err) {
					res.end(JSON.stringify(result[0]));
					console.log(result[0], "--------");
				}
			});
		}
	});
});

geo.post('/getcity', function (req, res, err) {
	console.log('city......');
	var data = req.body;

	pool.getConnection(function (err, conn) {
		if (!err) {
			var sql = conn.query('SELECT id,city_name  FROM geo.`city` WHERE district_fk = ? ', data.district_id, function (err, result) {
				conn.release();
				if (!err) {
					console.log('result', result)
					res.send(JSON.stringify(result));
				}
			});
		}
	});
});

geo.post('/getarea', function (req, res, err) {
	var data = req.body;
	console.log(data)
	pool.getConnection(function (err, conn) {
		if (!err) {
			var sql = conn.query('SELECT id,area_name  FROM geo.`area` WHERE city_fk = ? ', [data.city_id], function (err, result) {
				conn.release();

				if (!err) {
					console.log('getarea.........', sql.sql);
					res.send(JSON.stringify(result));
				}
			});
		}
	});
});

module.exports = geo;