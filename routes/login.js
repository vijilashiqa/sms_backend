const express = require('express');
const login = express();
const bodyParser = require('body-parser');
login.use(bodyParser.json());       // to support JSON-encoded bodies
login.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

const jwt = require('jsonwebtoken');
const tokenExpireTime = 2 * 60 * 60 * 1000;
const refreshTokenExpireTime = 24 * 60 * 60 * 1000;
const privateKey  = require('../config/key');
const poolPromise = require('../connection/conn').poolp;

async function account(data) {
    console.log("Login Data", data)
    return new Promise(async (resolve, reject) => {
        var sqlquery, name, password, erroraray = [], refresh_token;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                sqlquery = ` SELECT m.id,m.hdid,m.locid,m.profileid,m.fullname,m.mobile,m.menurole,m.usertype,m.distid,m.subdistid,m.lcoid,m.groupid,m.managerid,m.hdcasid,m.business_name FROM smsv2.users m
                WHERE m.profileid ='${data.Username}' AND m.password=md5('${data.Password}')
                UNION ALL
                SELECT u.custid id,u.hdid,u.locid,u.profileid,u.fullname,u.mobile,u.menurole,u.usertype,u.groupid,0 distid,0 subdistid,0 lcoid, 0 managerid ,0 hdcasid ,0 business_name FROM smsv2.subscriber u
                WHERE u.profileid ='${data.Username}' AND u.password =md5('${data.Password}') `
                let usercount = " SELECT EXISTS( " + sqlquery + " )AS COUNT ";
                console.log('User Exists Query ', usercount);
                let [[userava]] = await conn.query(usercount);
                if (userava['COUNT'] == 1) {
                    let result = await conn.query(sqlquery);
                    console.log('Length ', result[0].length);
                    if (result[0].length == 1) {
                        let userDet = result[0][0];
                        console.log('Userdetails', userDet)
                        let session_id = generateRondomSting(), token, updatetoken;
                        try {
                            // let custid =userDet.role==111?userDet.id:0;
                            token = await jwt.sign({
                                id: userDet.id, profile_id: userDet.profileid,hdid:userDet.hdid, role: userDet.usertype, menurole: userDet.menurole,hdcasid:userDet.hdcasid,
                                business_name:userDet.business_name,distid:userDet.distid,subdistid:userDet.subdistid,lcoid:userDet.lcoid,groupid:userDet.groupid,managerid:userDet.managerid, session_id: session_id,
                            },
                                privateKey, { algorithm: 'HS512', expiresIn: tokenExpireTime });
                                refresh_token = await jwt.sign({ id: userDet.id, profile_id: userDet.profileid, session_id: session_id },
                                privateKey, { algorithm: 'HS512', expiresIn: refreshTokenExpireTime });
                        } catch (e) {
                            erroraray.push({ msg: "Please Try After Sometimes", status: 0, error_msg: '48' });
                            return;
                        }
                        let user_details = {
                            id: userDet.id, profile_id: userDet.profileid, fname: userDet.fullname,hdid:userDet.hdid, role: userDet.usertype, menurole: userDet.menurole,hdcasid:userDet.hdcasid,
                            business_name:userDet.business_name,distid:userDet.distid,subdistid:userDet.subdistid,lcoid:userDet.lcoid,groupid:userDet.groupid,managerid:userDet.managerid

                        }
                        // console.log(token, "token");
                        console.log('data',userDet.usertype);
                        if (userDet.usertype == 100) updatetoken = " UPDATE smsv2.subscriber set `token`='" + token + "', `refresh_token`='" + refresh_token + "' where custid=" + userDet.id
                        else updatetoken = " UPDATE smsv2.users set `token`='" + token + "', `refresh_token`='" + refresh_token + "' where id=" + userDet.id
                        console.log('updatetoken', updatetoken);
                        updatetoken = await conn.query(updatetoken);
                        if (updatetoken[0]['affectedRows'] != 0) {
                            await conn.commit();
                            erroraray.push({ msg: "login successfully", status: 1, error_msg: 0, user_details: user_details, token: token, refresh_token: refresh_token });
                            console.log("login successfully ");
                        } else {
                            erroraray.push({ msg: " Please Try After 15 Min. ", status: 2, error_msg: '66' });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Please Try After 5 Min", status: 0, error_msg: '70' });
                        await conn.rollback();
                    }
                } else {
                    console.log(' COUNT is 0 :  ', userava['COUNT']);
                    erroraray.push({ msg: "User ID or Password Incorrect. ", status: 0, error_msg: '75' });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e)
                erroraray.push({ status: 0, msg: 'Internal Error please try later ', error_msg: '80' });
            }
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ status: 0, msg: 'Internal Error please try later ', error_msg: '85' });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}



login.post('/account', async (req, res) => {
    req.setTimeout(864000000);
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log('result----', ip);
    let result = await account(req.body);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});


const generateRondomSting = (length = 20, stringNeedToGenerate = 'ab56789cRSjklmnopqdefghiABCDEFGHIJKL0123MNOPQrstuvwxyzTUVWXYZ4') => {
    let randomString = '';
    for (var i = 0; i < length; i++) {
        let index = Math.floor(Math.random() * stringNeedToGenerate.length);
        randomString += stringNeedToGenerate[index];
    }
    return randomString;
}

module.exports = login;