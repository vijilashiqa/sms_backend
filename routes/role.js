// "use strict";
// var express = require('express'),
//     compress = require('compression'),
//     role = express.Router(),
//     // pool = require('../connection/conn');
//     poolPromise = require('../connection/conn').poolp;




// role.post('/listrole', function (req, res, err) {
//     var sql, sqlquery = `SELECT r.id,r.rolename,h.hdname FROM smsv2.hd_role r inner join smsv2.hd h on h.hdid=r.hdid  `,
         
//     sqlqueryc = `SELECT count(*) count
//         FROM smsv2.hd_role r inner join smsv2.hd h on h.hdid=r.hdid `, finalresult = [],
        
//         data = req.body;
//         if (data.hasOwnProperty('id') && data.id) {
//             sqlquery += ` AND id =${data.id}`
//          }
//     console.log('getlist...', sqlquery);

    
//     pool.getConnection(function (err, conn) {
//         if (!err) {
//             sql = conn.query(sqlquery, function (err, result) {
//                 if (!err) {
//                     finalresult.push(result);
//                     sql = conn.query(sqlqueryc, function (err, result) {
//                         conn.release();
//                         if (!err) {
//                             finalresult.push(result[0]);

//                             res.end(JSON.stringify(finalresult));
//                         }
//                     });
//                 } else {
//                     conn.release();
//                 }
//             });
//         }
//     });
// });



// async function addrole(req) {
//     console.log('Add role Data:', req.jwt_data);
//     return new Promise(async (resolve, reject) => {
//         var erroraray = [], data = req.body, jwtdata = req.jwt_data,
//         insertdata = {
//                        menurole: JSON.stringify(data.menurole)};
            
                    
//         let conn = await poolPromise.getConnection();
//         if (conn) {
//             await conn.beginTransaction();
//             try {
//                 console.log('Data', data);
//                 let checkprofile = await conn.query("SELECT COUNT(*) cnt FROM smsv2.hd_role WHERE rolename='" + data.rolename + "'");
//                 if (checkprofile[0][0]['cnt'] == 0) {
//                     let addhd = `INSERT INTO smsv2.hd_role SET  rolename='${data.rolename}',menurole='${insertdata.menurole}'`;

//                     // if (data.descr != '' && data.descr != null) addhd += ",`desc`='" + data.descr + "' ";

//                     console.log('ADD Broadcast Query: ', addhd);
//                     addhd = await conn.query(addhd);
//                     if (addhd[0]['affectedRows'] > 0) {
//                         let sqllog = "INSERT INTO smsv2.activitylog SET table_id='ADD ROLE',`longtext`='DONE BY',cby=" + jwtdata.id;
// 						sqllog = await conn.query(sqllog);
// 						if (sqllog[0]['affectedRows'] > 0) {
// 							erroraray.push({ msg:  " Role created Succesfully", err_code: 0 });
// 							await conn.commit();
// 						}
                        

//                     } else {
//                         erroraray.push({ msg: "Contact Your Admin.", err_code: 1111 });
//                         await conn.rollback();
//                     }
//                 } else {
//                     erroraray.push({ msg: "  ID Already Exists.", err_code: 1111 });
//                     await conn.rollback();
//                 }
//             } catch (e) {
//                 console.log('Error ', e);
//                 erroraray.push({ msg: 'Please try after sometimes', err_code: 'ERR' })
//                 await conn.rollback();
//             }
//             console.log('Success--1');
//             console.log('connection Closed.');
//             conn.release();
//         } else {
//             erroraray.push({ msg: 'Please try after sometimes', err_code: 500 })
//             return;
//         }
//         console.log('success--2');
//         return resolve(erroraray);
//     });
// }
// role.post('/addrole', async (req, res) => {
//     req.setTimeout(864000000);
//     let result = await addrole(req);
//     console.log("Process Completed", result);
//     res.end(JSON.stringify(result));
// });

//     role.post("/getrole", (req, res) =>  {
//         let sqlg,data = req.body;
//         console.log("Data--", data);
//         pool.getConnection((err, con) => {
//             let sqlpr = `select id,rolename,menurole from smsv2.hd_role where id =${data.id}`;
//             console.log("Query---", sqlpr);
//             if (data.id) {
//                  sqlg = con.query(sqlpr, data.id, (err, result) => {
//                     con.release();
//                     if (err) {
//                         console.log(err);
//                     } else {
//                         console.log(result)
//                         res.send(JSON.stringify(result));
//                     }
//                 });
//             }
//         });
//     });
  
    // role.post('/getprofile', function (req, res, err) {
    //     pool.getConnection(function (err, conn) {
    //         if (!err) {
    //             var sql = conn.query(`SELECT id,rolename FROM smsv2.hd_role `, function (err, result) {
    //                 conn.release();
    //                 if (!err) {
    //                     res.send(JSON.stringify(result));
    //                 }
    //             });
    //         }
    //     });
    // });
 
 
//     async function editrole(req, res) {
//     return new Promise(async (resolve, reject) => {
//         let data = req.body,jwtdata = req.jwt_data, conn, errorvalue = [],  insertdata = {
//             menurole: JSON.stringify(data.menurole),
//          };

//         try {
//             let hdid=jwtdata.role>777?data.hdid:jwtdata.hdid;
//             conn = await poolPromise.getConnection();
//             await conn.beginTransaction();
//             console.log("update", data);
//             let sqlq = `select exists(select * from smsv2.hd_role where id ='${data.id}' AND hdid=${hdid}) count`;
//             console.log("project query", sqlq);
//             let resp = await conn.query(sqlq);
//             console.log("result", resp);
//             if (resp[0][0].count == 0) {
//                 errorvalue.push({ msg: "No Data Found", err_code: 1 });
//                 await conn.rollback();
//             } else {
//                 let sqlupdate = `update smsv2.role set rolename='${data.rolename}',menurole='${insertdata.menurole}'`;
//                 sqlupdate += ` where id= ${data.id}`;
//                 console.log("update query", sqlupdate);
//                 let result = await conn.query(sqlupdate, data);
//                 console.log("result", result);
//                 if (result[0]["affectedRows"] > 0) {
//                     errorvalue.push({ msg: "Role updated Successfully", err_code: 0 });
//                     await conn.commit();
//                 } else {
//                     errorvalue.push({ msg: "Please Try After Sometimes", err_code: 1 });
//                     await conn.rollback();
//                 }
//             }
//         } catch (e) {
//             console.log("Catch Block Error", e);
//             errorvalue.push({ msg: "Please try after sometimes", error_msg: "CONN" });
//             await conn.rollback();
//         }
//         conn.release();
//         return resolve(errorvalue)
//     });
// }

// role.post("/editrole", async (req, res) => {
//     console.log(req.body);
//     req.setTimeout(864000000);
//     let result = await editrole(req);
//     res.end(JSON.stringify(result));
// }
// );




// module.exports = role;

"use strict";
var express = require('express'),
    compress = require('compression'),
    role = express.Router(),
    // pool = require('../connection/conn');
    poolPromise = require('../connection/conn').poolp;


  


role.post('/listrole', function (req, res, err) {
    var jwtdata = req.jwt_data, commonquery = '', where = [], sql, sqlquery = `SELECT r.id,r.rolename,h.hdname FROM smsv2.hd_role r inner join smsv2.hd h on h.hdid=r.hdid `,

        sqlqueryc = `SELECT count(*) count FROM smsv2.hd_role r inner join smsv2.hd h on h.hdid=r.hdid `, finalresult = [], data = req.body;

    if (data.hasOwnProperty('hdid') != null && data.hasOwnProperty('hdid') != '' && jwtdata.role > 777) where.push(` h.hdid =${data.hdid} `);
    if (data.hdid && jwtdata.role <= 777) where.push(` h.hdid =${jwtdata.hdid} `);

    if (data.id!=null && data.id!='') where.push(` r.id =${data.id} `);

    if (where.length) where = ' WHERE' + where.join(' AND ');
    sqlquery += where;
    sqlqueryc += where;

    console.log('listrole...', sqlquery);

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



role.post("/getrole", (req, res) => {
    let jwtdata = req.jwt_data, sqlg, data = req.body;
    console.log("Data--", data);
    pool.getConnection((err, con) => {
        let sqlpr = `select id,rolename,menurole from smsv2.hd_role h where h.id =${data.id}`;
        if (jwtdata.role <= 777) sqlpr += ` AND h.hdid =${jwtdata.hdid} `;
        console.log("Query---", sqlpr);
        if (data.id) {
            sqlg = con.query(sqlpr, data.id, (err, result) => {
                con.release();
                if (err) {
                    console.log(err);
                } else {
                    console.log(result)
                    res.send(JSON.stringify(result));
                }
            });
        }
        else{
            errorvalue.push({ msg: "Please Try After Sometimes", err_code: 103 });
            
        }
    });
});

async function editrole(req, res) {
    return new Promise(async (resolve, reject) => {
        let data = req.body, jwtdata = req.jwt_data, conn, errorvalue = [], insertdata = { menurole: JSON.stringify(data.menurole), };
        try {
            let hdid = '';
            if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') hdid = data.hdid;
            if (jwtdata.role <= 777) hdid = jwtdata.hdid;
            conn = await poolPromise.getConnection();
            if (conn) {
                await conn.beginTransaction();
                console.log("update", data);
                let sqlq = `select exists(select * from smsv2.hd_role where id ='${data.id}' `;
                if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') sqlq += ` AND hdid=${hdid} `;
                sqlq += ` ) count `;
                console.log("project query", sqlq);
                let resp = await conn.query(sqlq);
                console.log("result", resp);
                if (resp[0][0].count == 0) {
                    errorvalue.push({ msg: "No Data Found", err_code: 1 });
                    await conn.rollback();
                } else {
                    let sqlupdate = `update smsv2.hd_role set rolename='${data.rolename}',menurole='${insertdata.menurole}' where id ='${data.id}' `;
                    if (jwtdata.role > 777 && data.hdid != null && data.hdid != '') sqlupdate += ` AND hdid=${hdid} `;
                    console.log("update query", sqlupdate);
                    let result = await conn.query(sqlupdate, data);
                    console.log("result", result);
                    if (result[0]["affectedRows"] > 0) {
                        let sqllog = "INSERT INTO smsv2.activitylog SET table_id='EDIT ROLE',`longtext`='DONE BY',cby=" + jwtdata.id;
                        sqllog = await conn.query(sqllog);
                        if (sqllog[0]['affectedRows'] > 0) {
                            errorvalue.push({ msg: "EDIT ROLE Succesfully Updated.", err_code: 0 });
                            await conn.commit();
                        } else {
                            errorvalue.push({ msg: "Audit Log Cant Add.", err_code: 99 });
                            await conn.rollback();
                        }
                    } else {
                        errorvalue.push({ msg: "Please Try After Sometimes", err_code: 103 });
                        await conn.rollback();
                    }
                }
            } else {
                errorvalue.push({ msg: "Please Try Later.", error_msg: "CONE" });
                await conn.rollback();
            }
        } catch (e) {
            console.log("Catch Block Error", e);
            errorvalue.push({ msg: "Please try after sometimes", error_msg: "TRYE" });
            await conn.rollback();
        }
        if (conn) conn.release();
        return resolve(errorvalue)
    });
}

role.post("/editrole", async (req, res) => {
    console.log(req.body);
    req.setTimeout(864000000);
    let result = await editrole(req);
    res.end(JSON.stringify(result));
}
);




module.exports = role;