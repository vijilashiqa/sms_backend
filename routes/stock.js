
//*******************************************************************STOCK*************************************************************//

"use strict";
var express = require('express'),
    compress = require('compression'),
    stock = express.Router(),
    pool = require('../connection/conn');
poolPromise = require('../connection/conn').poolp;
const joiValidate = require('../schema/inventory');

async function addstock(req) {
    console.log('Add Stock Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                console.log('stock Data', data);
                let hdid = '';
                if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
                if (jwtdata.role <= 777) hdid = jwtdata.hdid;
                if (hdid == '' || hdid == null) {
                    erroraray.push({ msg: "Please Select Headend.", err_code: 25 });
                    await conn.rollback();
                }
                let checkstock = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE  hdid=${hdid} AND invoiceno=${data.invoiceno} `);
                if (checkstock[0].length == 0) {
                    // let tax = data.enable_tax == true ? 1 : 0;
                    let addpack = `INSERT INTO smsv2.stock_inward SET  
                    hdid=${hdid},
					invoiceno=${data.invoiceno},
                    invoice_date='${data.invoice_date}',
					warranty_type= ${data.warranty_type},
					warranty_period=${data.warranty_period},
					vendorid=${data.vendorid},
                    stocktype=${data.stocktype},
                    vendordetid=${data.vendordetid},
					hsnid=${data.hsnid},
					created_by=${jwtdata.id}`;
                    addpack = await conn.query(addpack);
                    if (addpack[0]['affectedRows'] > 0) {
                        let stockinid = addpack[0].insertId
                        // if (data.srvtype != 3) {
                        for (let pid = 0; pid < data.stockinid.length; pid++) {
                            const p = data.stockinid[pid];
                            console.log('----------', p);

                            console.log('-------', checkstock[0].length);
                            if (checkstock[0].length == 0) {
                                let addprod = `INSERT INTO smsv2.material_detail set  hdid=${hdid}, stockinid=${stockinid}, boxmodelid=${p.boxmodelid},qty=${p.qty},price=${p.price},created_by=${jwtdata.id} `;
                                addprod = await conn.query(addprod);
                                if (addprod[0]['affectedRows'] == 0) {
                                    erroraray.push({ msg: " stockinid ID:" + stockinid + " Stock ID Not Added.", err_code: 55 });
                                    await conn.rollback();
                                    continue;
                                }
                            } else {
                                //prodect id already available
                                console.log('prodect id already available');
                                erroraray.push({ msg: " Product ID:(" + p.productid + ") Exits.", err_code: 62 });
                                await conn.rollback();
                                continue;
                            }
                        }
                        // }
                    } else {
                        erroraray.push({ msg: "Please Check Stock ID", err_code: 1111 });
                        await conn.rollback();
                    }

                    if (addpack[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD STOCK',`longtext`='DONE BY',hdid=" + hdid + ",usertype="+jwtdata.role+", cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Stock ID Created Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Please Check Stock ID", err_code: 81 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " Stock ID Already Exists.", err_code: 85 });
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
            erroraray.push({ msg: 'Please try after sometimes', err_code: 99 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);

    });
}
stock.post('/addstock', async (req, res) => {
    req.setTimeout(864000000);

    const validation = joiValidate.stockDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        // return res.status(422).json({ msg: validation.error.details, err_code: '422' });
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await addstock(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});

stock.post('/listStock', function (req, res) {
    // console.log(req.body)	
    var where = [], jwtdata = req.jwt_data, sqlquery = `SELECT   s.stockinid,s.hdid,s.invoiceno,s.invoice_date,s.stocktype,s.warranty_type,s.warranty_period,
    s.vendorid,s.vendordetid,s.hsnid,h.hdname,v.vendor_name,SUM(m.price) price FROM smsv2.stock_inward s 
    INNER JOIN smsv2.material_detail m ON s.stockinid=m.stockinid
    INNER JOIN smsv2.hd h ON s. hdid=h.hdid 
    INNER JOIN smsv2.vendor v ON s.vendorid=v.vendorid
    GROUP BY s.stockinid`,
        data = req.body,
        sqlqueryc = 'SELECT COUNT(*) COUNT FROM smsv2.stock_inward s  INNER JOIN smsv2.hd h ON s. hdid=h.hdid   INNER JOIN smsv2.vendor v ON s.vendorid=v.vendorid';
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` s.hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) where.push(` s.hdid= ${jwtdata.hdid} `);
console.log('data',sqlquery)
    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ');
        sqlquery += where;
        sqlqueryc += where;
    }
    sqlquery += ' LIMIT ?,? ';
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('Error');
        } else {
            // console.log('data',sqlquery)
            var sql = conn.query(sqlquery, [data.index, data.limit], function (err, result) {
                // console.log(sql.sql)
                if (!err) {
                    var val = [];
                    val.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        console.log(sql.sql)
                        conn.release();
                        if (!err) {
                            val.push(result[0]);
                            res.send(JSON.stringify(val));
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});

stock.post('/listmaterial', function (req, res) {
    console.log(req.body)
    var sqlquery = `SELECT m.materialid,m.stockinid,m.boxmodelid,m.qty,m.price,(m.qty * m.price) amt ,v.modelname
    FROM smsv2.material_detail m LEFT JOIN smsv2.boxmodel v ON m.boxmodelid = v.bmid`,
        data = req.body,
        sqlqueryc = 'SELECT COUNT(*) FROM smsv2.material_detail m LEFT JOIN smsv2.boxmodel v ON m.boxmodelid = v.bmid ';

    if (data.stockinid) {
        sqlquery += ` where m.stockinid=${data.stockinid}`
        sqlqueryc += ` where m.stockinid=${data.stockinid}`
    }


    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('Error');
        } else {
            console.log(data)
            var sql = conn.query(sqlquery, function (err, result) {
                console.log(sql.sql)
                if (!err) {
                    var val = [];
                    val.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        console.log(sql.sql)
                        conn.release();
                        if (!err) {
                            val.push(result[0]);
                            res.send(JSON.stringify(val));
                        }
                    });
                } else {
                    conn.release();
                }
            });
        }
    });
});




stock.post('/geteditstock', function (req, res) {
    var where = [], jwtdata = req.jwt_data, sql, sqlq, sqlm, value = [], data = req.body
    console.log('data', data)
    sqlq = `  SELECT s.stockinid, s.hdid,s.invoiceno,s.invoice_date,s.stocktype,s.warranty_type,s.warranty_period,s.vendorid,
    s.vendordetid,s.hsnid
FROM smsv2.stock_inward s
LEFT JOIN smsv2.material_detail m ON s.stockinid =m.stockinid WHERE s.stockinid =` + data.stockinid;
    sqlm = `  SELECT * FROM smsv2.material_detail WHERE stockinid =` + data.stockinid
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            sql = conn.query(sqlq, data, function (err, result) {
                if (!err) {
                    value.push(result)
                    // console.log('aa',value)
                    sql = conn.query(sqlm, data, function (err, result) {
                        conn.release()

                        if (!err) {
                            console.log('err')
                            value.push(result)
                            res.json(value)
                        }
                    });

                } else {
                    conn.release()
                }
            });
        }
    });
});



async function editstock(req) {
    console.log('Edit Stock Data:', req.jwt_data);
    return new Promise(async (resolve, reject) => {
        var erroraray = [], data = req.body, jwtdata = req.jwt_data, alog='';
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
                console.log('stock Data', data);
                let checkstock = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE  stockinid = ${data.id} `);
                if (checkstock[0].length == 1) {
                   let  cs=checkstock[0][0];
                    // let tax = data.enable_tax == true ? 1 : 0;
                    let addpack = `UPDATE  smsv2.stock_inward SET  
                    invoice_date='${data.invoice_date}',
					warranty_type= ${data.warranty_type},
					warranty_period=${data.warranty_period},
                    stocktype=${data.stocktype},
					hsnid=${data.hsnid},
					modified_by=${jwtdata.id}`;
                    if (cs.hdid != hdid) {
						let [checkhdid] = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE   invoiceno=${data.invoiceno} and   hdid=${hdid}`);
						console.log('checkhdid : ', checkhdid);
						if (checkhdid.length == 1) {
							erroraray.push({ msg: " Headend Already Available .", err_code: 254 });
							await conn.rollback();
						} else {
							let checkhdid = ` select concat(' From ',a.hdname,' TO ',b.hdname) cs from 
														(select hdname from hd where hdid=${cs.hdid} ) a
														,(select hdname from hd where hdid=${hdid} ) b `;
							checkhdid = await conn.query(checkhdid);
							addpack += ` ,hdid='${hdid}'`;
							alog += ` Headend  Changed ${checkhdid[0][0].cs}.`
						}

					}
                    if(cs.vendorid!=data.vendorid){
                        let [checkvendor] = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE  invoiceno=${data.invoiceno} and   hdid=${hdid}`);
                        console.log('checkvendor : ', checkvendor);
						if (checkvendor.length == 1) {
							erroraray.push({ msg: " Vendor  Already Exists.", err_code: 270 });
							await conn.rollback();
                    }else {
                        let checkvendor = ` select concat(' From ',a.vendor_name,' TO ',b.vendor_name) cs from 
                                                    (select vendor_name from vendor where vendorid=${cs.vendorid} ) a
                                                    ,(select vendor_name from vendor where vendorid=${data.vendorid} ) b `;
                        checkvendor = await conn.query(checkvendor);
                        addpack += ` ,vendorid='${data.vendorid}'`;
                        alog += ` Vendor  Changed ${checkvendor[0][0].cs}.`
                    }
                }
                    if(cs.invoiceno!=data.invoiceno){
                        let [checklocation] = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE   invoiceno=${data.invoiceno} and   hdid=${data.hdid}`);
                        console.log('checklocation : ', checklocation);
						if (checklocation.length == 1) {
							erroraray.push({ msg: " Invoice  Already Exists.", err_code: 285 });
							await conn.rollback();
                    }else {
                       
                        addpack += ` ,invoiceno='${data.invoiceno}'`;
                        alog += ` Invoice  Changed  FROM ${cs.invoiceno} TO ${data.invoiceno}.`
                    }
                }
                if(cs.vendordetid!=data.vendordetid){
                    let [checklocation] = await conn.query(`SELECT * FROM smsv2.stock_inward WHERE  invoiceno=${data.invoiceno} and   hdid=${data.hdid}`);
                    console.log('checklocation : ', checklocation);
                    if (checklocation.length == 1) {
                        erroraray.push({ msg: " Location  Already Available In This Stock.", err_code: 297 });
                        await conn.rollback();
                }else {
                    let checklocation = ` select concat(' From ',a.loc,' TO ',b.loc) cs from 
                                                (select loc from vendor_det where vendordetid=${cs.vendordetid} ) a
                                                ,(select loc from vendor_det where vendordetid=${data.vendordetid} ) b `;
                    checklocation = await conn.query(checklocation);
                    addpack += ` ,vendordetid='${data.vendordetid}'`;
                    alog += ` Location  Changed ${checklocation[0][0].cs}.`
                }
            }
                    addpack += ' WHERE stockinid =' + data.id
                    addpack = await conn.query(addpack);
                    if (addpack[0]['affectedRows'] > 0) {

                        // if (data.srvtype != 3) {
                        for (let pid = 0; pid < data.stockinid.length; pid++) {
                            

                            const p = data.stockinid[pid];
                            console.log('-------stock id data---', p);
                            console.log("stock length", p.materialid);

                            let addprod = '';


                            if (p.materialid != '' && p.materialid != null){
                                console.log('update',p.materialid);
                                addprod = `UPDATE  smsv2.material_detail set stockinid=${data.id}, boxmodelid=${p.boxmodelid},qty=${p.qty},price=${p.price},modified_by=${jwtdata.id}  WHERE stockinid = ${data.id}  AND materialid= ${p.materialid} `;
                                addprod = await conn.query(addprod);
                            }
                            if (p.materialid == '' || p.materialid == null) {
                                console.log('insert',p.materialid);
                                addprod = ` INSERT INTO  smsv2.material_detail set  hdid=${data.hdid},stockinid=${data.id}, boxmodelid=${p.boxmodelid},qty=${p.qty},price=${p.price} `;
                                addprod = await conn.query(addprod);
                            }


                           
                            

                        }

                        // }
                    } else {
                        erroraray.push({ msg: "Please Check Stock ID", err_code: 340 });
                        await conn.rollback();
                    }

                    if (addpack[0]['affectedRows'] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='UPDATE STOCK',`longtext`=' "+alog+" DONE BY',hdid=" + hdid + ",usertype="+jwtdata.role+", cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            erroraray.push({ msg: " Stock ID Updated Succesfully", err_code: 0 });
                            await conn.commit();
                        }
                    } else {
                        erroraray.push({ msg: "Please Check Stock ID", err_code: 352 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: " Invoice ID Already Exists.", err_code: 356 });
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
            erroraray.push({ msg: 'Please try after sometimes', err_code: 370 })
            return;
        }
        console.log('success--2');
        return resolve(erroraray);

    });
}

stock.post('/editstock', async (req, res) => {
    req.setTimeout(864000000);
    console.log('edit stock');
    const validation = joiValidate.editstockDataSchema.validate(req.body);
    if (validation.error) {
        console.log(validation.error.details);
        return res.json([{ msg: validation.error.details[0].message, err_code: '422' }]);
    }
    let result = await editstock(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});



stock.post('/getstockvendor', function (req, res, err) {
    var data = req.body, sqlquery = 'SELECT vendorid ,vendor_name FROM smsv2.`vendor`';

    if (data.hdid) {
        sqlquery += ' WHERE hdid =' + data.hdid
    }

    pool.getConnection(function (err, conn) {
        if (!err) {
            var sql = conn.query(sqlquery, function (err, result) {
                console.log('sql', sql.sql);
                conn.release();
                if (!err) {
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});

stock.post('/getstockmodel', function (req, res, err) {
    var where = [], jwtdata = req.jwt_data, data = req.body, sqlquery = 'SELECT modelname,bmid,hdid,hdcasid,stbtypeid,chiptype,vendorid FROM smsv2.`boxmodel` ';

    // if (data.hdid) {
    //     sqlquery += ' WHERE hdid =' + data.hdid
    // }

    // if (data.hdcasid) {
    //     sqlquery += ' WHERE hdcasid =' + data.hdcasid
    // }
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid}`);
    if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`);
    if (jwtdata.role <= 777 && jwtdata.hdcasid != null && jwtdata.hdcasid != '') {
        if (jwtdata.hdcasid.length != 0) where.push(` hdcasid IN (${jwtdata.hdcasid}) `);
    }
    if (data.hasOwnProperty('hdcasid') && data.hdcasid) where.push(` hdcasid= ${data.hdcasid}`);
    if (data.hasOwnProperty('vendorid') && data.vendorid) where.push(` vendorid= ${data.vendorid}`);

    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ')
        sqlquery += where
    }

    pool.getConnection(function (err, conn) {
        if (!err) {
            var sql = conn.query(sqlquery, function (err, result) {
                console.log('sql', sql.sql);
                conn.release();
                if (!err) {
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});



stock.post('/getstocklocation', function (req, res, err) {
    var data = req.body, sqlquery = 'SELECT loc,vendordetid FROM smsv2.vendor_det ';

    if (data.vendorid) {
        sqlquery += ' WHERE vendorid =' + data.vendorid
    }

    pool.getConnection(function (err, conn) {
        if (!err) {
            var sql = conn.query(sqlquery, function (err, result) {
                console.log('sql', sql.sql);
                conn.release();
                if (!err) {
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});

stock.post('/getinvoice', function (req, res, err) {
    console.log(req.body)
    var data = req.body,jwtdata=req.jwt_data,where=[],
        sqlquery = ` SELECT stockinid,invoiceno,hdid FROM smsv2.stock_inward `;
        if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(` hdid= ${data.hdid}`);
        if (jwtdata.role <= 777) where.push(` hdid= ${jwtdata.hdid}`); 
        if (where.length > 0) {
            where = ' WHERE' + where.join(' AND ')
            sqlquery += where
        }
        console.log('sql',sqlquery);
    pool.getConnection(function (err, conn) {
        if (!err) {
            var sql = conn.query(sqlquery, function (err, result) {
                console.log('sql', sql.sql)
                conn.release();
                if (!err) {
                    res.send(JSON.stringify(result));

                }
            });
        }
    });



});

module.exports = stock;