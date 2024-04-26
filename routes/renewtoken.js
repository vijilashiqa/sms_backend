var express = require('express');
renewtoken = express(), bodyParser = require('body-parser'), pool = require('../connection/conn'), poolPromise = require('../connection/conn').poolPromise;

renewtoken.use(bodyParser.json());       // to support JSON-encoded bodies
renewtoken.use(bodyParser.urlencoded({ extended: true }));  // to support URL-encoded bodies
var jwt = require('jsonwebtoken');
var privateKey = require('../config/key');
const tokenExpireTime = 2 * 60 * 60 * 1000




async function renewAccessToken(req) {
    return new Promise(async (resolve, reject) => {
        // console.log(req.headers)
        var sqlquery, erroraray = [], data, userid = 0,custid = 0,managerid = 0,dist_or_sub_flg = 0;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                if (req.headers.authorization) {
                    const refresh_token = req.headers.authorization;
                    console.log(refresh_token)
                    let decoded = await jwt.verify(refresh_token, privateKey, {
                        algorithm: ['HS512']
                    });
                    sqlquery = " SELECT sub.custid,sub.usertype,sub.menurole,sub.fullname,sub.profileid,sub.groupid,sub.hdid,sub.userid,0 AS managerid,0 AS hdcasid,sub.enablestatus,sub.mobile,0 AS dist_or_sub_flg " +
                        " FROM smsv2.subscriber sub WHERE sub.custid= " + decoded.id + " AND sub.profileid='" + decoded.username + "' " +
                        " UNION ALL " +
                        " SELECT 0 AS custid,u.usertype,u.menurole,u.fullname,u.profileid,u.groupid,u.hdid,u.id AS userid,u.managerid,u.hdcasid,u.enablestatus,u.mobile,u.dist_or_sub_flg " +
                        " FROM smsv2.users u WHERE u.id= " + decoded.id + " AND u.profileid='" + decoded.username + "'";
                    console.log('Login Detail Query ************************', sqlquery)
                    let result = await conn.query(sqlquery)
                    if (result[0].length == 1) {
                        if (result[0][0].enableuser == 1) {
                            let userDetail = result[0][0];
                            console.log("Result", userDetail);
                            let hdid = userDetail.hdid,
                            groupid = userDetail.groupid,					// Common Details
                            usertype = userDetail.usertype,
                            menurole = userDetail.menurole,
                                fname = userDetail.fullname;
                            if (userDetail.role_id == 111) {						// Subscriber
                                userid = userDetail.userid,
                                custid = userDetail.custid;
                            } else {											// Admin and Reseller
                                userid = userDetail.userid,
                                managerid = userDetail.managerid,
                                dist_or_sub_flg = userDetail.dist_or_sub_flg;
                            }

                            console.log('HD ID:', hdid, 'Group ID : ', groupid, 'Reseller ID : ', userid,
                                'User Type :', usertype, 'Subscriber ID : ', custid, 'Manager ID : ', managerid, 'UserorSubsId :', userOrSubs_id);
                            let user_details = {
                                hdid:hdid,groupid:groupid,usertype:usertype,menurole:menurole,fname:fname,userid:userid,custid:custid,managerid:managerid,dist_or_sub_flg:dist_or_sub_flg
                            }
                            let session_id = decoded.session_id, token;

                            try {
                                token = await jwt.sign({
                                    hdid:hdid,groupid:groupid,usertype:usertype,menurole:menurole,fname:fname,userid:userid,custid:custid,managerid:managerid,dist_or_sub_flg:dist_or_sub_flg
                                }, privateKey, { algorithm: 'HS512', expiresIn: tokenExpireTime });

                            } catch (e) {
                                erroraray.push({ msg: "pls try after sometime", status: 0 });
                                return;
                            }
                            let sql = ' UPDATE bms.session set token ="' + token + '" ';
                            console.log('token update query', sql)
                            let results = await conn.query(sql);
                            // await conn.commit();
                            if (results[0]['affectedRows'] == 0) {
                                console.log('errorrrr', err)
                                erroraray.push({ msg: "try after sometime", status: 0 });
                                await conn.rollback();
                                console.log("try after sometime");
                            } else {
                                let sqllog = "INSERT into bms.activity_log SET table_id= 'NEW ACCESS TOKEN' ,`longtext`= 'REQUESTED BY',isp_id= " + result[0][0].isp_id + ",group_id=" + result[0][0].groupid + ",cby= " + result[0][0].uid;
                                console.log('ADD LOGS :', sqllog);
                                let resultlog = await conn.query(sqllog);
                                if (resultlog[0]['affectedRows'] != 0) {
                                    let updatetoken;
                                    if (userDetail.role_id == 111) {
                                        updatetoken = " update smsv2.subscriber set `token`='" + token + "' where custid=" + userDetail.uid
                                    } else {
                                        updatetoken = " smsv2.users set `token`='" + token + "' where id=" + userDetail.uid
                                    }
                                    console.log('updatetoken', updatetoken);
                                    updatetoken = await conn.query(updatetoken);
                                    if (updatetoken[0]['affectedRows'] != 0) {
                                        await conn.commit();
                                        erroraray.push({ msg: " Your Session Has Been Restored", status: 1, token: token }, user_details);
                                        console.log("Session Restored successfully ");
                                    } else {
                                        erroraray.push({ msg: " Please Try After 15 Min. ", status: 2 });
                                        await conn.rollback();
                                    }
                                }
                            }
                        } else {
                            erroraray.push({ msg: "Your Account Has Been Disabled", status: 2 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Please Try After 5 Min", status: 0 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: "Please Try After 5 Min", status: 0 });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error Inside RenewTOken ', e)
                erroraray.push({ msg: "Please Login Once Again", status: 401, restore: false });
            }
            console.log('Success--1');
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ status: 0, msg: 'Internal Error please try later ', status: 'CE' });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}

renewtoken.get('/renewAccessToken', async (req, res) => {
    req.setTimeout(864000000);
    let result = await renewAccessToken(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});




module.exports = renewtoken;
