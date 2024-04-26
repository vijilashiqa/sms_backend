"use strict";
var express = require('express'),
    compress = require('compression'),
    casconn = express.Router(),
    pool = require('../connection/conn');
poolPromise = require('../connection/conn').poolp;
let soap = require('soap'),
    restPostData;
let { PromiseSocket } = require("promise-socket");
var net = require('net'), client = new net.Socket();

var url = "http://192.168.32.13:8080/SMSservicioCAS/services/WebServiceCAS_eng?wsdl";
var nowdate = (JSON.stringify(new Date())).slice(1, 11);
var c_datetime = new Date().toLocaleDateString() + ' ' + new Date((new Date().getTime() + 5 * 60000)).toLocaleTimeString() + ":000";//Plus 5min
var http = require('http');
// const { deflate } = require('zlib');
// const { resolve } = require('path');

async function delay(ms) {
    // return await for better async stack trace support in case of errors.
    return await new Promise(resolve => setTimeout(resolve, ms));
}

const gospellAwait = async (smscmd, port, ip) => {                     // Using
    return new Promise((resolve, reject) => {
        (async () => {
            try {
                let start = false, r1 = '', r2 = '', r1status = false, cas_responce = '';
                let socket = new PromiseSocket(client);
                await socket.connect({ port: port, host: ip });
                console.log('Server Connected....');
                if (smscmd) {
                    await socket.write(smscmd);
                    start = true;
                    // r1status=true;
                    console.log('1st Data Written..');
                }
                if (start) {
                    r1 = await socket.read();
                    console.log('R1 : ',r1);
                    cas_responce = r1.toString('hex');
                }
                if (r1status) {
                    r2 = await socket.read();
                    cas_responce = r2.toString('hex');
                    console.log('2nd Responce : ', cas_responce);
                    await socket.end();
                    console.log('Server Connection Closed..');
                    resolve(cas_responce);
                } else {
                    console.log('1nd Responce : ', cas_responce);
                    await socket.end();
                    console.log('Server Connection Closed..');
                    resolve(cas_responce);
                }
            } catch (e) {
                console.error("Connection error:", e)
                resolve(e);
            }
        })();


    });
}
const SafeViewAwait = async (card_no, box_no, renewal, prod_id, method, port, ip) => {                      // Using
    console.log('-----', card_no, box_no, '-', renewal, '--', prod_id, '---', method, port, ip);
    renewal = renewal == 1 ? 0 : 2;
    console.log('renewal--', renewal, 'Method---', method);
    var data;
    if (method == 'activateSMC') {
        data = { 'SMCid': card_no, 'operationType': renewal }
    } else if (method == 'pairingBarcode') {
        data = { 'SMCid': card_no, 'barCode': box_no }
        // let prod_id = packdata['prod_id'], method = 'purchase';
    } else if (method == 'purchase') {
        data = { 'operationType': renewal, 'SMCid': card_no, productId: '', 'subscriptionId': prod_id }
    }
    return new Promise((resolve, reject) => {
        soap.createClient(url, async (err, client) => {
            if (!err) {
                // console.log(method, "method================>");
                client[method](data, async (err, result, envelope, soapHeader) => {
                    //'result' is the response body
                    // console.log(result.out);
                    // console.log(err);
                    if (!err) {
                        // console.log('----', result.out);
                        let Receiveddata = result.out;
                        resolve(Receiveddata);
                    } else {
                        // resolve({ item: item, msg: 'Pls Try Again', status: false })
                    }
                }, {
                    // strictSSL : true,
                    proxy: 'http://' + ip + ':' + port + '/'
                });
                // console.log('--------', client.lastRequest);
            } else {
                // resolve({ msg: "Not Conneted To CAS", status: false, connissue: true });
            }
        });
    });
}


casconn.post('/BulkActive', function (req, res) {
    var data = req.body, action = data.action, bulk,
        sqlquery, sql, user_det, logs;
    pool.getConnection(function (err, conn) {
        if (!err) {
            if (data.hasOwnProperty('bulk')) {
                // console.log('Success 1');
                bulk = data.bulk;
                // vc = bulk['VC Number'];
                sql = conn.query('SELECT EXISTS(SELECT * FROM `sms`.`stb_vc` WHERE vc_no = ? AND cas_fk = ? AND headend_fk=? AND active_flg = 1)AS COUNT',
                    [bulk['VC Number'], bulk['Cas ID'], data.headend], function (err, result) {
                        if (!err) {
                            if (result[0].COUNT == 1) {
                                bulk = {
                                    status: true,
                                    vc_no: bulk['VC Number'],
                                    cas: bulk['Cas ID'],
                                    pack_id: bulk['Package ID']
                                };
                                getcust();
                            } else {
                                errorhandler('VC Num Not Exist Or Activated', { Vc: bulk['VC Number'], error: 'VC Num Not Exist Or Activated' })
                            }
                        } else {
                            errorhandler('Pls Contact Admin', { Vc: bulk['vc_no'], error: 'Pls Contact Admin' })
                        }
                    });
            } else {
                bulk = data.bulkpack;
                getcust();
            }

            function getcust() {
                console.log(bulk)
                sqlquery = 'SELECT cust.cust_id_pk,pack.`a_la_cart` AS pack_type ' +
                    ' FROM sms.`box` AS box,sms.`customer` AS cust,sms.`pack_price` AS price, ' +
                    '     sms.`stb_vc` AS vc,sms.`package` AS pack ' +
                    ' WHERE cust.stb_id_fk=box.`stb_id` AND vc.vc_no = ? ' +
                    ' AND price.branch_fk = cust.branch_fk AND price.loc_fk = cust.loc_fk ' +
                    ' AND cust.user_id_fk = price.operator_fk AND vc.vc_id = box.vc_id ' +
                    ' AND pack.pack_id = price.pack_fk AND price.`pack_fk` = ?  ';

                sql = conn.query(sqlquery, [bulk['vc_no'], bulk['pack_id']], function (err, result) {
                    if (!err && result.length > 0) {
                        data.cust_id = result[0]['cust_id_pk'];
                        data.package = bulk['pack_id'];
                        data.pack_type = result[0]['pack_type'];
                        base_pack_check();
                    } else {
                        errorhandler('Pls Assign the subscriber Or Package', { Vc: bulk['vc_no'], error: 'Pls Assign the subscriber Or Package' });
                    }
                });

            }

            function base_pack_check() {
                sqlquery = 'SELECT EXISTS(SELECT box.`purchase_flg` FROM sms.`customer` AS cust,sms.`box` AS box ' +
                    ' WHERE cust.`stb_id_fk` = box.`stb_id` AND box.`purchase_flg` = 1 AND (cust.expiry_date >= NOW() ' +
                    ' OR cust.expiry_date IS NULL) ' +
                    ' AND cust.`base_pack` IS NOT NULL AND cust.cust_id_pk=? ) AS `count` ';
                if (data.pack_type != 0 && action) {
                    sql = conn.query(sqlquery, data.cust_id, function (err, result) {
                        if (!err) {
                            if (result[0].count == 1) {
                                cust_renew(data, action, res => {
                                    logs
                                    let fail = res['status'] == 0 ? { Vc: bulk['vc_no'], error: res['msg'] } : '';
                                    errorhandler(res['msg'], fail, res['status']);
                                });
                            } else {
                                errorhandler('Pls Activae Base Package', { Vc: bulk['vc_no'], error: 'Pls Activae Base Package' })
                            }
                        }
                    });
                } else {
                    cust_renew(data, action, res => {
                        logs = res;
                        let fail = res['status'] == 0 ? { Vc: bulk['vc_no'], error: res['msg'] } : '';
                        errorhandler(res['msg'], fail, res['status']);
                    });
                }
            }

            function errorhandler(msg, failure = '', status = 0) {
                let msgs = bulk['vc_no'] + " " + msg + " done by " + data.username_per + " Amt: ";
                msgs += logs ? logs['prize'] : 0;
                msgs += " And Package: ";
                msgs += logs ? logs['packages'] : 'None';
                conn.release();
                console.log(sql.sql)
                res.end(JSON.stringify({ msg: msg, status: status, failure: failure }));
                log.activeLogs("Bulk Activation", data, msgs, err, req.ip);
            }
        }
    });
});

async function bulkpairing(data) {
    console.log('---------bulkpairing--------');
    return new Promise(async (resolve, reject) => {
        var sqlquery, casres_result, cuser = data.cuser, failure, conn_status, conn, success = [], sql, erroraray = [];
        // console.log(pool.poolPromise)
        // console.log(data.conn)
        if (data.conn != null) { conn = data.conn; console.log('Old Conn'); } else { conn = await poolPromise.getConnection(); console.log('New Conn'); }
        // conn = connTemp || await poolPromise.getConnection();
        // console.log(' data----', data);
        // console.log('Bulk data----', data.bulk);
        // await conn.connect();
        console.log("length------------", data.bulk.length);
        // conn_status = data.conn_status;
        console.log(' before Conn Status--', data.conn_status);
        if (!data.conn_status) { conn_status = 0 } else if (conn_status == 2) { conn_status = 2 }
        console.log('After Conn Status--', conn_status);
        if (conn) {
            for (var i = 0; i < data.bulk.length; i++) {
                await conn.beginTransaction();
                try {
                    let temp = data.bulk[i];
                    console.log('temp VC---', temp.VC_Number, '---STB---', temp.STB_Number, '---Action---', temp.Action);

                    let actquery = ' SELECT * FROM((SELECT COUNT(*) boxcnt FROM (SELECT cust.`cust_id_pk`,box.`SNo`,cust.`base_pack` ' +
                        ' FROM sms.`customer` AS cust,sms.`box` WHERE box.stb_id = cust.stb_id_fk AND box.`purchase_flg` = 1 ' +
                        ' UNION ' +
                        ' SELECT cust.`cust_id_pk`,box.`SNo`,add_on_pack.`pack_id`  FROM sms.`add_on_pack`,sms.`customer` cust,sms.`box` WHERE ' +
                        ' add_on_pack.`cust_fk`=cust.`cust_id_pk` AND cust.`stb_id_fk`=box.`stb_id` AND add_on_pack.`status` = 1 ' +
                        ' UNION ' +
                        ' SELECT cust.`cust_id_pk`,box.`SNo`,a_la_card.`pack_id` FROM sms.`a_la_card`,sms.`customer` cust,sms.`box` ' +
                        ' WHERE a_la_card.`cust_fk`=cust.`cust_id_pk` AND cust.`stb_id_fk`=box.`stb_id`  AND a_la_card.`status` = 1  ) packact WHERE packact.SNo="' + temp.STB_Number + '") box, ' +
                        ' (SELECT COUNT(*) vccnt FROM (SELECT cust.`cust_id_pk`,stb_vc.`vc_no`,cust.`base_pack` ' +
                        ' FROM sms.`customer` AS cust,sms.`box`,sms.`stb_vc` WHERE box.stb_id = cust.stb_id_fk AND stb_vc.`vc_id`=box.`vc_id` AND box.`purchase_flg` = 1 ' +
                        ' UNION ' +
                        ' SELECT cust.`cust_id_pk`,stb_vc.`vc_no`,add_on_pack.`pack_id`  FROM sms.`add_on_pack`,sms.`customer` cust,sms.`box`,sms.`stb_vc` WHERE ' +
                        ' add_on_pack.`cust_fk`=cust.`cust_id_pk` AND cust.`stb_id_fk`=box.`stb_id`AND stb_vc.`vc_id`=box.`vc_id` AND add_on_pack.`status` = 1 ' +
                        ' UNION ' +
                        ' SELECT cust.`cust_id_pk`,stb_vc.`vc_no`,a_la_card.`pack_id` FROM sms.`a_la_card`,sms.`customer` cust,sms.`box` ,sms.`stb_vc` ' +
                        ' WHERE a_la_card.`cust_fk`=cust.`cust_id_pk` AND cust.`stb_id_fk`=box.`stb_id`AND stb_vc.`vc_id`=box.`vc_id`  AND a_la_card.`status` = 1  ) packact ' +
                        ' WHERE packact.vc_no="' + temp.VC_Number + '") vc) '
                    console.log('Act Pack Query---', actquery);
                    let actallpack = await conn.query(actquery);
                    console.log('Box Pack count---', actallpack[0][0]['boxcnt'], '---VC pack count---', actallpack[0][0]['vccnt']);
                    console.log('Result Length---', actallpack[0].length);
                    if (actallpack[0].length > 0) {
                        if (actallpack[0][0]['boxcnt'] > 0) {
                            erroraray.push({ vc_no: temp.STB_Number, msg: 'Please Deactivate All Package for This STB', Error_msg: 'STBACT' });
                            console.log(' Please Deactivate All Package for This STB ', temp.STB_Number);
                            await conn.rollback();
                            continue;

                        } else if (actallpack[0][0]['vccnt'] > 0) {
                            erroraray.push({ vc_no: temp.VC_Number, msg: 'Please Deactivate All Package for This VC', Error_msg: 'STBACT' });
                            console.log(' Please Deactivate All Package for This VC ', temp.VC_Number);
                            await conn.rollback();
                            continue;

                        } else {
                            console.log('temp VC---', temp.VC_Number, '---STB---', temp.STB_Number, '---Action---', temp.Action);
                            sqlquery = 'SELECT * FROM ( ' +
                                ' (SELECT vc.vc_id,vc_no,vc.user_fk,vc.cas_fk AS vc_cas,vc.`pairing_flg` AS pair_vc,vc.`active_flg` AS vc_active ' +
                                'FROM sms.`stb_vc` AS vc WHERE vc.vc_no="' + temp.VC_Number + '") AS X, ' +
                                '(SELECT box.`stb_id`,box.`SNo`,box.user_id_fk,box.`cas_id` AS box_cas,box.`pairing_flg` AS pair_box, ' +
                                'box.`active_flg` AS box_active,box.`purchase_flg`,hdcas.ip_address,hdcas.server_port  FROM sms.`box` AS box ,sms.`headend_cas` hdcas  ' +
                                'WHERE box.`cas_id`=hdcas.cas_fk AND box.`headend_fk`=hdcas.headend_fk AND box.`SNo`="' + temp.STB_Number + '")AS Y ) ';
                            console.log('sqlquery----', sqlquery);
                            let boxvcstatus = await conn.query(sqlquery);

                            if (boxvcstatus[0].length > 0) {
                                console.log('STB VC Status---', boxvcstatus[0].length, 'box vc status---', boxvcstatus[0][0]);

                                let status = false;
                                if (boxvcstatus[0][0]['user_fk'] != boxvcstatus[0][0]['user_id_fk'] && !status) {
                                    erroraray.push({ vc_no: temp.VC_Number, msg: 'LCO Mismatch for STb and VC.', Error_msg: 'LCOMM' });
                                    console.log('LCO Mismatch for STb and VC.');
                                    status = true;
                                    await conn.rollback();
                                    continue;
                                }
                                if (boxvcstatus[0][0]['vc_active'] != 1 && !status) {
                                    erroraray.push({ vc_no: temp.VC_Number, msg: ' Please Activate The  VC. ', Error_msg: 'VCNA' });
                                    console.log(' Please Activate The  VC.');
                                    status = true;
                                    await conn.rollback();
                                    continue;
                                }
                                if (temp.Action == 1) {
                                    if (boxvcstatus[0][0]['pair_box'] == 1 && !status) {
                                        erroraray.push({ vc_no: temp.STB_Number, msg: ' STB Already Paired. ', Error_msg: 'STBAP' });
                                        console.log(' STB Already Paired.');
                                        status = true;
                                        await conn.rollback();
                                        continue;
                                    }
                                    if (boxvcstatus[0][0]['pair_vc'] == 1 && !status) {
                                        erroraray.push({ vc_no: temp.VC_Number, msg: ' VC Already Paired. ', Error_msg: 'VCAP' });
                                        console.log(' VC Already Paired.');
                                        status = true;
                                        await conn.rollback();
                                        continue;
                                    }
                                } else {
                                    if (boxvcstatus[0][0]['pair_box'] == 0 && !status) {
                                        erroraray.push({ vc_no: temp.STB_Number, msg: ' STB Already Unpaired. ', Error_msg: 'STBAUP' });
                                        console.log(' STB Already Unpaired.');
                                        status = true;
                                        await conn.rollback();
                                        continue;
                                    }
                                    if (boxvcstatus[0][0]['pair_vc'] == 0 && !status) {
                                        erroraray.push({ vc_no: temp.VC_Number, msg: ' VC Already Unpaired. ', Error_msg: 'VCAUP' });
                                        console.log(' VC Already Unpaired.');
                                        status = true;
                                        await conn.rollback();
                                        continue;
                                    }
                                }
                                if (boxvcstatus[0][0]['vc_cas'] != boxvcstatus[0][0]['box_cas'] && !status) {
                                    erroraray.push({ vc_no: temp.VC_Number, msg: ' CAS Mismatch Between STB And VC. ', Error_msg: 'CASMM' });
                                    console.log(' CAS Mismatch Between STB And VC.');
                                    status = true;
                                    await conn.rollback();
                                    continue;
                                }
                                if (!status) {
                                    let ip = boxvcstatus[0][0]['ip_address'], port = boxvcstatus[0][0]['server_port'], paction = temp.Action, cas_type = boxvcstatus[0][0]['vc_cas'],
                                        card_no = temp.VC_Number, box_no = temp.STB_Number;
                                    // console.log('IP Address--',ip,'Port---', port);

                                    let stbvcpairing = await pairingprocess(conn, cas_type, card_no, box_no, paction, port, ip, cuser);
                                    console.log('CAS ', boxvcstatus[0][0]['vc_cas'], 'stbvcpairing : ', stbvcpairing, '\n');

                                    if (cas_type == 3) { casres_result = stbvcpairing.resultCode; }
                                    else if (cas_type == 1 || cas_type == 4) { casres_result = ('00000000' + stbvcpairing.toString(16)).slice(-8); }
                                    else if (cas_type == 5) {
                                        if (stbvcpairing == 0) { casres_result = 0 }
                                        if (stbvcpairing != 0) {
                                            casres_result = stbvcpairing.slice(0, -8);
                                            if (casres_result == 'STB in use!') {
                                                casres_result = 0
                                            } else {
                                                casres_result = stbvcpairing.slice(0, -8);
                                            }
                                        }
                                    }
                                    console.log('Cas Responces---', casres_result);
                                    if (casres_result == 0) {
                                        let pairing_log = ' INSERT INTO sms.`stb_pairing_log`(user_id,stb_id,stb_no,vc_id,vc_no,`action`,cby)VALUES( ' + boxvcstatus[0][0]['user_fk'] + ', ' +
                                            ' ' + boxvcstatus[0][0]['stb_id'] + ',"' + boxvcstatus[0][0]['SNo'] + '","' + boxvcstatus[0][0]['vc_id'] + '","' + boxvcstatus[0][0]['vc_no'] + '","' + temp.Action + '","' + cuser + '"); ';
                                        console.log('pairing_log----', pairing_log);
                                        let stb_pairing_log = await conn.query(pairing_log);
                                        if (stb_pairing_log[0]['affectedRows'] == 0) {
                                            erroraray.push({ vc_no: temp.VC_Number, msg: " Log Can't Update.", Error_msg: 'LOGIDB' });
                                            console.log('Please Try Again');
                                            await conn.rollback();
                                            continue;
                                        } else {
                                            sqlquery = 'UPDATE sms.`box` AS box,sms.`stb_vc` AS vc ';
                                            if (temp.Action == 1) {
                                                sqlquery += ' SET vc.`pairing_flg`=1,box.`pairing_flg`=1,box.vc_id= ' +
                                                    ' (SELECT * FROM (SELECT vc_id FROM sms.stb_vc WHERE vc_no = "' + boxvcstatus[0][0]['vc_no'] + '")AS X) ';
                                            } else if (temp.Action == 0) {
                                                sqlquery += ' SET vc.`pairing_flg`=0,box.pairing_flg=0,box.vc_id=NULL '
                                            }
                                            sqlquery += ' WHERE  box.`SNo`="' + boxvcstatus[0][0]['SNo'] + '" AND vc.vc_no = "' + boxvcstatus[0][0]['vc_no'] + '"';
                                            console.log('BOX VC Status Update---', sqlquery);
                                            let stb_pairing_status = await conn.query(sqlquery);
                                            if (stb_pairing_status[0]['affectedRows'] == 0) {
                                                erroraray.push({ vc_no: temp.VC_Number, msg: " Pairing Status Can't Update.", Error_msg: 'PSCUDB' });
                                                console.log('Please Try Again');
                                                await conn.rollback();
                                                continue;
                                            } else {
                                                if (temp.Action == 1) {
                                                    erroraray.push({ vc_no: temp.VC_Number, msg: " Pairing Process Completed.", Error_msg: '0' });
                                                } else if (temp.Action == 0) { erroraray.push({ vc_no: temp.VC_Number, msg: " Unpairing Process Completed.", Error_msg: '0' }); }
                                                await conn.commit();
                                            }
                                        }
                                    } else {
                                        console.log(casres_result);
                                        erroraray.push({ vc_no: temp.VC_Number, msg: " Contact Your Admin.", Error_msg: casres_result });
                                        await conn.rollback();
                                        continue;
                                    }
                                }
                            } else {
                                erroraray.push({ vc_no: temp.VC_Number, msg: ' VC Or STB Not Exists. ', Error_msg: 'STBVCNE' });
                                console.log(' VC Or STB Not Exists.');
                                await conn.rollback();
                                continue;
                                // Errorhandle('Vc Or Set-Top Box Not Exists', { Vc: bulk['VC Number'], sno: bulk['STB Number'], error: 'Vc Or Set-Top Box Not Exists' });
                            }
                        }
                    }
                } catch (e) {
                    console.log('Error ', e);
                    await conn.rollback();
                }
            }
            // conn.release();
            if (conn_status == 0) {
                conn.release();
                console.log('Renewal Connection Released', conn_status);
            } else {
                console.log(' Connection Not Released --- ', conn_status);
            }
        } else {
            // res.end(JSON.stringify({ msg: "Please Try Again", status: 0 }))
            return;
        }
        console.log('success2');
        // await conn.end();
        // res.end(JSON.stringify({ msg: "Successfully Extended", status: 1 }));
        return resolve(erroraray);
    });
}

casconn.post('/bulkvcactive', function (req, res) {
    var data = req.body, sqlquery, failure,
        success = [], sql, bulk = data.bulk;
    // console.log(data)
    // return;
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err)
        } else {
            sqlquery = 'SELECT vc.cas_fk AS vc_cas,vc.`purchase_flg` AS vc_active_pack,vc.active_flg as vc_active,vc.pairing_flg ' +
                'FROM sms.`stb_vc` AS vc WHERE vc.vc_no=?';
            // data.bulk.forEach(function(item){
            sql = conn.query(sqlquery, bulk['VC Number'], function (err, result) {
                console.log(sql.sql)
                if (!err) {
                    if (result.length > 0) {
                        // console.log(result)
                        let status = false;
                        if (result[0]['vc_active_pack'] == 1 && !status) {
                            failure = { Vc: bulk['VC Number'], error: 'Pls Deactivate Package' }
                            Errorhandle('Pls Deactivate Package', failure)
                            status = true;
                        }
                        if (bulk['Action'] == 0) {
                            if (result[0]['vc_active'] == 1 && !status) {
                                failure = { Vc: bulk['VC Number'], error: 'Already Activated' }
                                Errorhandle('Already Activated', failure)
                                status = true;
                            }
                        } else {
                            if (result[0]['vc_active'] == 0 && !status) {
                                failure = { Vc: bulk['VC Number'], error: 'Already Deactivated' }
                                Errorhandle('Already Deactivated', failure)
                                status = true;
                            }
                        }
                        if (result[0]['pairing_flg'] == 1 && !status) {
                            failure = { Vc: bulk['VC Number'], error: 'Pls Unpaire Card' }
                            Errorhandle('Pls Unpaire Card', failure)
                            status = true;
                        }
                        if (!status) {
                            console.log('success 1')
                            stbaction({ cas: result[0]['vc_cas'], vc_no: bulk['VC Number'], action: bulk['Action'] == 0 });
                        }
                    } else {
                        failure = { Vc: bulk['VC Number'], error: 'Vc Not Exists' }
                        Errorhandle('Vc Not Exists', failure)
                    }
                }
            });

            function stbaction(item) {
                console.log('success 2')
                if (item.cas == 4 || item.cas == 5) {
                    update(item);
                } else if (item.cas == 1) {
                    var StbIdHex = ''
                    if (/^\d+$/.test(item['vc_no'])) {		//only Number
                        console.log('Number');
                        StbIdHex = ('00000000' + parseInt(item['vc_no']).toString(16)).slice(-8);
                    } else {								// alphanumeric 
                        console.log('alphanumeric');
                        StbIdHex = ('00000000' + (item['vc_no']).toString(16)).slice(-8);
                    }

                    let cmd = '0001' + '02' + '0A' + '002B' + StbIdHex + '01' + '00000000' + '01' + '00000000' + '00000000' + '0000' + '00' + '00000000' + '5766436f6d756e69636174696f6e5076744c7464' + '0000000000000000000000000000000000000000'
                    console.log('VC Activate CMD :', cmd);
                    cmd = Buffer.from(cmd, 'hex');

                    gospell10(cmd, result => {
                        let vcactivestatus = result.msg.slice(-8);
                        console.log('vcactivestatus:', vcactivestatus);
                        if (vcactivestatus == '00000000') {
                            update(item);
                        } else {
                            failure = { Vc: item['vc_no'], Box: item['sno'], error: result['msg'] }
                            Errorhandle('Failed to Active VC.', failure)

                        }
                    });


                }
                else if (item.cas == 2) {
                    secureTvAPP(item, item['action'], null, 'activateSMC', result => {
                        // console.log(result,'done')
                        if (result['status']) {
                            update(result['item'])
                        } else {
                            if (result['connissue']) {
                                failure = { Vc: item['vc_no'], Box: item['sno'], error: result['msg'] }
                                Errorhandle(result['msg'], failure)
                            } else {
                                let item = result['item'];
                                failure = { Vc: item['vc_no'], Box: item['sno'], error: result['msg'] }
                                Errorhandle(result['msg'], failure)
                            }
                        }
                    });
                }
                else if (item.cas == 3) {
                    console.log('success 3')
                    safeViewAPP(item, item['action'], null, 'activateSMC', result => {
                        console.log(result, 'done')
                        if (result['status']) {
                            console.log(item, 'success')
                            update(result['item'])
                        } else {
                            if (result['connissue']) {
                                failure = { Vc: item['vc_no'], Box: item['sno'], error: result['msg'] }
                                Errorhandle(result['msg'], failure)
                            } else {
                                let item = result['item'];
                                failure = { Vc: item['vc_no'], error: result['msg'] }
                                Errorhandle(result['msg'], failure)
                            }
                        }
                    });
                }
            }

            function update(item) {
                sqlquery = 'UPDATE sms.`stb_vc` ';
                if (item['action']) {
                    sqlquery += " SET `active_flg`=1,activated_date=CURRENT_DATE() WHERE `vc_no`='" + item.vc_no + "'";
                } else {
                    sqlquery += " SET `active_flg`=0,deactive_date=CURRENT_DATE() WHERE `vc_no`='" + item.vc_no + "' "
                }
                sql = conn.query(sqlquery, function () {
                    // console.log(sql);
                    if (!err) {
                        Errorhandle('Successfully Completed', '', 1);
                    } else {
                        failure = { Vc: item['vc_no'], error: 'Not Updated on DB' };
                        Errorhandle('Not Updated on DB', failure);
                    }
                });
            }
        }
        function Errorhandle(msg, failure = '', status = 0) {
            conn.release();
            console.log(sql.sql)
            res.end(JSON.stringify({ msg: msg, status: status, failure: failure }));
            log.activeLogs("Bulk VC Action", data, bulk['VC Number'] + " " + msg + " done by " + data.username_per, err, req.ip);
        }
    });
});

async function bulkTerminal(data) {                 // Using
    return new Promise(async (resolve, reject) => {
        var sql, erroraray = [], conn, conn_status, timeinterval = 1000;
        conn = data.conn;
        console.log('Terminal Process data Length----', data.ter.length);
        // console.log('Terminal Process data----', data.ter[0]);
        for (var i = 0; i < data.ter.length; i++) {
            let temp = data.ter[i];
            console.log('-----', temp);
            let stb_no = temp.stb_no; //STB ID
            // var cas = temp.hdcasid, user_id = temp.hdid;		
            let headend_fk = temp.hdid, smscmd1 = '', casres1 = 999, smscmd2 = 999, casres2 = 999, smscmd3 = '', casres3 = '', area_id = 1;
            if (stb_no != '') {
                // Start Active Terminal -------------------------------
                let newses_id1 = new Date().getTime();
                newses_id1 += '' + Math.floor(Math.random() * 100);
                var cassession = ('00000000' + parseInt(newses_id1).toString(16)).slice(-4);
                console.log('session ID', cassession);
                let command_type = 'A5', data_len, condition_len, terminal_id = stb_no, command_len,
                    session_id = cassession, cas_ver = '02', addressing_mode = '00', condition_type = '00',
                    cas_expired_time = '7e06e3ff', instant_flag = '01';
                let first = session_id + cas_ver + command_type;
                let second = addressing_mode + condition_type + terminal_id;
                condition_len = ('0000' + parseInt((new Buffer.from(second, 'hex').length)).toString(16)).slice(-4);
                let third = cas_expired_time + instant_flag;
                command_len = ('0000' + parseInt((new Buffer.from(third, 'hex').length)).toString(16)).slice(-4);
                data_len = ('0000' + parseInt((new Buffer.from(condition_len + second + command_len + third, 'hex').length)).toString(16)).slice(-4);
                console.log('first : ', first, 'data_len', data_len, 'condition_len ', condition_len, ' second ', second, 'command_len', command_len, 'third ', third);
                var fcmd1 = first + data_len + condition_len + second + command_len + third;
                smscmd1 = new Buffer.from(first + data_len + condition_len + second + command_len + third, 'hex');
                if (fcmd1 != '') {
                    // await delay(timeinterval);
                    // console.log('CMD Type', '1', 'FINAL Buffer ', smscmd1);
                    casres1 = await gospellAwait(smscmd1, temp.port, temp.ip);
                    // console.log('STB No', stb_no, 'CAS Responce ', casres1);
                    casres1 = casres1.slice(16, 24);
                    console.log('STB No', stb_no, 'Responce slice ', casres1);

                } else {
                    erroraray.push({ stb_no: stb_no, msg: "Terminal Not Active.", err_code: 612 });
                }
                if (casres1 == 0) {
                    let newses_id2 = new Date().getTime();
                    newses_id2 += '' + Math.floor(Math.random() * 100);
                    var cassession2 = ('00000000' + parseInt(newses_id2).toString(16)).slice(-4);
                    let command_type = 'A6', network_id = '0000', bouquet_id = '0000', preview_time_interval = '00000000', operator_active_interval = '00000000',
                        user_vip_class = '00', maturity_rating = '00', terminal_type = '00', slave_count = '00', local_active_flag = '00', local_active_interval = '00000000',
                        currency_code = '0164', currency_conversion_denominator = '00000001', currency_conversion_numerator = '00000001',
                        operator_info_length, encode = '00', operator_info = 'WFCTV', data_len, condition_len, terminal_id = stb_no, command_len,
                        session_id = cassession2, cas_ver = '02', addressing_mode = '00', condition_type = '00',
                        cas_expired_time = (((new Date().getTime() / 1000)).toString(16)).substring(0, 8),
                        instant_flag = '01';
                    let first = session_id + cas_ver + command_type;
                    let second = addressing_mode + condition_type + terminal_id;
                    condition_len = ('0000' + parseInt((new Buffer.from(second, 'hex').length)).toString(16)).slice(-4);
                    bouquet_id = ('0000' + bouquet_id.toString(16)).slice(-4);
                    // operator_info = ('000' + operator_info).slice(-3);
                    operator_info = Buffer.from((operator_info), 'utf8').toString('hex');
                    // console.log('operator_info----', user_id, '----', operator_info);
                    operator_info_length = ('00' + parseInt((new Buffer.from(encode + operator_info, 'hex').length)).toString(16)).slice(-2);
                    let third = cas_expired_time + instant_flag + area_id + network_id + bouquet_id + preview_time_interval + operator_active_interval + user_vip_class +
                        maturity_rating + terminal_type + slave_count + local_active_flag + local_active_interval + currency_code + currency_conversion_denominator +
                        currency_conversion_numerator + operator_info_length + encode + operator_info;
                    command_len = ('0000' + parseInt((new Buffer.from(third, 'hex').length)).toString(16)).slice(-4);
                    data_len = ('0000' + parseInt((new Buffer.from(condition_len + second + command_len + third, 'hex').length)).toString(16)).slice(-4);
                    console.log('first : ', first, 'data_len', data_len, 'condition_len ', condition_len, ' second ', second, 'command_len', command_len, 'third ', third);
                    console.log('FINAL COMMAND ', first + data_len + condition_len + second + command_len + third);
                    var fcmd2 = first + data_len + condition_len + second + command_len + third;
                    smscmd2 = new Buffer.from(first + data_len + condition_len + second + command_len + third, 'hex');
                    if (fcmd2 != '') {
                        // console.log('CMD Type', '2', 'FINAL Buffer ', smscmd2);
                        await delay(timeinterval);
                        casres2 = await gospellAwait(smscmd2, temp.port, temp.ip);
                        // console.log('STB No', stb_no, 'CAS Responce ', casres2);
                        casres2 = casres2.slice(16, 24);
                        console.log('STB No', stb_no, 'Responce slice ', casres2);
                    } else {
                       erroraray.push({ stb_no: stb_no, msg: "Terminal Not Active.", err_code: 651 });

                    }
                }
                //Start Terminal Status -----------------------------------------------------
                if (casres2 == 0) {
                    let newses_id3 = new Date().getTime();
                    newses_id3 += '' + Math.floor(Math.random() * 100);
                    var cassession3 = ('00000000' + parseInt(newses_id3).toString(16)).slice(-4);
                    let terstatus = '1';
                    let command_type = 'A7', data_len, condition_len, terminal_id = stb_no, command_len, terminal_status, expired_time = '7e06e3ff',
                        session_id = cassession3, cas_ver = '02', addressing_mode = '00', condition_type = '00',
                        cas_expired_time = (((new Date().getTime() / 1000)).toString(16)).substring(0, 8), instant_flag = '01';
                    if (terstatus == 1) { terminal_status = '01' } else if (terstatus == 0) { terminal_status = '00' }
                    let first = session_id + cas_ver + command_type;
                    let second = addressing_mode + condition_type + terminal_id;
                    condition_len = ('0000' + parseInt((new Buffer.from(second, 'hex').length)).toString(16)).slice(-4);
                    let third = cas_expired_time + instant_flag + terminal_status + expired_time;
                    command_len = ('0000' + parseInt((new Buffer.from(third, 'hex').length)).toString(16)).slice(-4);
                    data_len = ('0000' + parseInt((new Buffer.from(condition_len + second + command_len + third, 'hex').length)).toString(16)).slice(-4);
                    console.log('first : ', first, 'data_len', data_len, 'condition_len ', condition_len, ' second ', second, 'command_len', command_len, 'third ', third);
                    var fcmd3 = first + data_len + condition_len + second + command_len + third;
                    smscmd3 = new Buffer.from(first + data_len + condition_len + second + command_len + third, 'hex');
                    if (fcmd3 != '') {
                        // console.log('CMD Type', '3', 'FINAL Buffer ', smscmd3);
                        await delay(timeinterval);
                        casres3 = await gospellAwait(smscmd3, temp.port, temp.ip);
                        // console.log('STB No', stb_no, 'CAS Responce ', casres3);
                        casres3 = casres3.slice(16, 24);
                        console.log('STB No', stb_no, 'Responce slice ', casres3);
                        if (casres3 == 0) {
                            erroraray.push({ stb_no: stb_no, msg: "Terminal Activated.", err_code: 0 });
                        }
                    } else {
                        erroraray.push({ stb_no: stb_no, msg: "Terminal Not Active.", err_code: 684 });
                    }
                }
            }
        }

        return resolve(erroraray);
    });
}

let bulkOSDMessage = async (data) => {                      // Using
    return new Promise(async (resolve, reject) => {
        var sql, erroraray = [];
        // console.log(pool.poolPromise)
        let conn = await poolPromise.getConnection();

        if (conn) {
            // console.log('length', data.message.length);
            for (var i = 0; i < data.message.length; i++) {
                await conn.beginTransaction();
                try {
                    let temp = data.message[i];
                    let stb_id = temp.vc_no, //STB ID
                        dtittle = temp.msg_title,		//Tittle
                        dcontent = temp.msg,	//Content
                        msg_time = temp.Time,		//0-Immediate or 1- Scheduler
                        sdateTime = temp.datetime,
                        headend_id = temp.headend,
                        forall = temp.stb_cat,			// 0-single or 1-headend or 2-All 
                        msg_type = temp.msg_type,		// 1- OSD or 2-Bmail 3-FingerPrint
                        cas_type = temp.castype,       // CAS Type
                        user_type = temp.user_type,      // User Type 1-LCO or 2-Distributer or 3-Sub_Distributor
                        user_id = temp.operator_name;    // User ID
                    //----FB----
                    var GlobalORind = 0, Duration = temp.duration, Interval = temp.intervals, Showtimes = temp.repetition, FontSiz = temp.fp_text_size,
                        FontColor = temp.fp_text_color, BackgroundColor = temp.fp_bg_color, PoSType = temp.fp_type, PoS_X = temp.xcord,
                        PoS_Y = temp.ycord, channelCtrl = 0, ChannelID = '', Overt = temp.fp_overt, style = temp.osd_type, StyleValue = temp.scrool_type;

                    // console.log('xaxis-----', PoS_X); console.log('yaxis-----', PoS_Y);
                    if (!forall) { forall = 0 } if (!cas_type) { cas_type = 0 }
                    let cuser = data.cuser;
                    let sqlquery = ' SELECT box.`headend_fk`,box.user_id_fk,cust.`cust_id_pk`,box.`cas_id` AS box_cas,box.`pairing_flg` AS pair_box,box.`SNo`,vc.`vc_no`, ' +
                        ' box.`active_flg` AS box_active,box.`purchase_flg`,box.`i_ter`,box.`a_ter`,box.`s_ter`,hdcas.`ip_address`, ' +
                        ' hdcas.`server_port` FROM sms.`box` AS box ,sms.`headend_cas` AS hdcas ,sms.`stb_vc` AS vc,sms.customer AS cust ' +
                        ' WHERE box.`cas_id`=hdcas.`cas_fk` AND box.`headend_fk`=hdcas.`headend_fk` AND box.`vc_id`=vc.`vc_id` AND cust.`stb_id_fk`=box.`stb_id` ';
                    if (forall == 0) { sqlquery += ' AND (box.`SNo`="' + stb_id + '" OR vc.`vc_no`= "' + stb_id + '") '; }
                    if (forall == 1) { sqlquery += ' AND  box.`headend_fk`="' + headend_id + '" '; }
                    if (cas_type > 0) { sqlquery += ' AND  box.`cas_id`="' + cas_type + '" '; }
                    if (user_type == 1) { sqlquery += ' AND box.`user_id_fk`="' + user_id + '" '; }
                    if (user_type == 2) { sqlquery += ' AND box.`user_id_fk` IN (SELECT id FROM sms.`user` WHERE distributer_fk ="' + user_id + '"  AND user_type =1 ) '; }
                    if (user_type == 3) { sqlquery += ' AND box.`user_id_fk` IN (SELECT id FROM sms.`user` WHERE sub_distributer_fk ="' + user_id + '"  AND user_type =1 ) '; }

                    console.log('SQlQuerry---', sqlquery);
                    let result = await conn.query(sqlquery);
                    let resultlength = result[0]['length'];
                    // console.log('result -------', result[0]['length']);
                    if (resultlength > 0 && msg_time == 1) {
                        console.log('Schedule');
                    }
                    if (resultlength > 0 && msg_time == 0) {
                        for (let packdata of result[0]) {

                            let cas = packdata['box_cas'], vcnum = ('00000000' + packdata['vc_no']).slice(-8), port = packdata['server_port'], ip = packdata['ip_address'],
                                cust_id = packdata['cust_id_pk'];
                            let casmsgs = ' INSERT sms.`cas_msgs` (cust_id,title,content,msg_type,c_by) VALUES ( ' +
                                ' "' + cust_id + '","' + dtittle + '","' + dcontent + '","' + msg_type + '","' + cuser + '"); ';
                            let casmsgs_res = await conn.query(casmsgs);
                            if (casmsgs_res[0]['affectedRows'] > 0) {
                                // console.log('CAS MSG Inserted in DB.');
                                let sql = 'SELECT msg_id FROM  sms.`cas_msg_cmd` ORDER BY msg_id DESC LIMIT 1';
                                let rst = await conn.query(sql);
                                // console.log('----', rst);
                                let sesmsgid;
                                if (rst[0].length > 0) { sesmsgid = rst[0][0]['msg_id']; } else { sesmsgid = 0; }
                                let sesres_id = (1 + sesmsgid);
                                console.log('Session ID----', sesres_id);

                                if (msg_type == 1 && sesres_id) {			// OSD
                                    if (cas == 1) {
                                        // console.log(Duration,Showtimes,Interval)
                                        let GlobalORind = 0, terminal_id = vcnum, IsControl = 1, lock = 0, duration = Duration, ShowTime = Showtimes, FontSize = FontSiz, fontColor = FontColor, backgroundColor = BackgroundColor;
                                        let cas_ver = '020e', Contition_Cmd = '', command_type = '1d', Reserved = 'ffffffff', StartTime = '', ExpiredTime = '', ShowFreq = '0000', Priority = '00';

                                        let cassession = ('00000000' + parseInt(sesres_id).toString(16)).slice(-4), OSD_ID = ('00000000' + (sesres_id).toString(16)).slice(-8);
                                        if (GlobalORind == 0) { Contition_Cmd = '00062317', STB = ('00000000' + parseInt(terminal_id).toString(16)).slice(-8); } else if (GlobalORind == 1) { Contition_Cmd = '00062315', STB = '000000c8'; }

                                        if (IsControl == 0) { IsControl = '00' } else if (IsControl == 1) { IsControl = '01' }    // 1-display OSD  0-deactivare OSD
                                        if (lock == 0) { lock = '00' } else if (lock == 1) { lock = '01' }  //  1-lock  0-unlock
                                        if (style == 0) { style = '00' }       //  0-scrollbar 1-text
                                        if (StyleValue == 1) { StyleValue = '01'; }  // scroll right to left at the top of the screen
                                        if (StyleValue == 2) { StyleValue = '02'; }  // scroll right to left at the bottom of the screen
                                        if (StyleValue == 3) { StyleValue = '03'; }  // scroll right to left at the middle of the screen
                                        if (style == 1) { style = '01', StyleValue = '50'; }
                                        if (ShowTime == 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            StartTime = ('00000000' + (parseInt(DateTime) - parseInt(9120) + (120)).toString(16)).slice(-8);

                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) - parseInt(9120)) + parseInt(duration) + (120)).toString(16)).slice(-8);
                                            duration = '0000', ShowTime = ('0000' + ShowTime.toString(16)).slice(-2);
                                        }
                                        if (ShowTime > 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            StartTime = ('00000000' + (parseInt(DateTime) - parseInt(9120) + (240)).toString(16)).slice(-8);
                                            let intervalcal = (parseInt(parseInt(duration) * parseInt(ShowTime)) + parseInt(parseInt(Interval) * parseInt(ShowTime)));
                                            duration = ('0000' + duration.toString(16)).slice(-4), ShowTime = ('0000' + parseInt(ShowTime).toString(16)).slice(-2);
                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) - parseInt(9120)) + parseInt(intervalcal) + (240)).toString(16)).slice(-8);
                                        }

                                        FontSize = ('0000' + FontSize.toString(16)).slice(-2);
                                        if (fontColor == 0) { fontColor = '000000ff'; } if (fontColor == 1) { fontColor = 'ffffffff'; } if (fontColor == 2) { fontColor = 'ff0000ff'; } if (fontColor == 3) { fontColor = 'ffff00ff'; }
                                        if (fontColor == 4) { fontColor = '008000ff'; } if (fontColor == 5) { fontColor = '0000ffdd'; } if (fontColor == 6) { fontColor = '808080ff'; } if (fontColor == 7) { fontColor = 'ffa500ff'; }
                                        if (fontColor == 8) { fontColor = 'ee82eeff'; } if (fontColor == 9) { fontColor = 'a52a2aff'; }
                                        if (backgroundColor == 0) { backgroundColor = '000000ff'; } if (backgroundColor == 1) { backgroundColor = 'ffffffff'; } if (backgroundColor == 2) { backgroundColor = 'ff0000ff'; } if (backgroundColor == 3) { backgroundColor = 'ffff00ff'; }
                                        if (backgroundColor == 4) { backgroundColor = '008000ff'; } if (backgroundColor == 5) { backgroundColor = '0000ffdd'; } if (backgroundColor == 6) { backgroundColor = '808080ff'; } if (backgroundColor == 7) { backgroundColor = 'ffa500ff'; }
                                        if (backgroundColor == 8) { backgroundColor = 'ee82eeff'; } if (backgroundColor == 9) { backgroundColor = 'a52a2aff'; }
                                        let Data_body = Buffer.from(dcontent, 'utf8').toString('hex');
                                        let Data_Len = ('0000' + parseInt((new Buffer.from(Data_body, 'hex').length)).toString(16)).slice(-4);
                                        let cmd = (Contition_Cmd + STB + command_type + ExpiredTime + OSD_ID + Reserved + IsControl + StartTime + lock + duration + ShowTime + ShowFreq + Priority + style + StyleValue + FontSize + fontColor + backgroundColor + Reserved + Data_Len + Data_body);
                                        let command_len = ('0000' + parseInt((new Buffer.from(cmd, 'hex').length)).toString(16)).slice(-4);
                                        let gospellcmd = (cassession + cas_ver + command_len + cmd);
                                        console.log(gospellcmd);
                                        let smscmd = new Buffer.from(gospellcmd, 'hex');
                                        let gospelRes = await gospellAwait(smscmd, port, ip, 1);
                                        console.log('cas Responce-----', gospelRes);
                                        let casresststus = gospelRes.slice(-8);
                                        if (casresststus) {
                                            let insmsgcmd = ' INSERT sms.`cas_msg_cmd` (cust_id,msg_type,cas_type,cmd,responce,c_by)VALUES( ' +
                                                ' "' + cust_id + '","' + msg_type + '","' + cas + '","' + gospellcmd + '","' + gospelRes + '","' + data.cuser + '"); ';
                                            let resupdate = await conn.query(insmsgcmd);
                                            if (resupdate[0]['affectedRows'] > 0) {
                                                await conn.commit();
                                                console.log(" cas responce Successfully Updated");
                                            } else {
                                                console.log('Failed to insert in DB');
                                                erroraray.push({ vc_no: vcnum, msg: "MSG Send Successfully but Failed to update in DB." });
                                                await conn.rollback();
                                                continue;
                                            }
                                        }

                                    }
                                    if (cas == 4) {
                                        let terminal_id = vcnum, osd_control = 1, FontSize = FontSiz, fontColor = FontColor, backgroundColor = BackgroundColor,
                                            duration = Duration, ShowTime = Showtimes, service_cnt = 0, service_id = 1120;

                                        let cassession = ('00000000' + parseInt(sesres_id).toString(16)).slice(-4), OSD_ID = ('00000000' + parseInt(sesres_id).toString(16)).slice(-8);
                                        let cas_ver = '02b2', addressing_mode = '01', condition_type = '00', addressing_condition_count = '01', start_time = '', expired_time = '', font = '0001', height = '00f0';
                                        let STB = ('00000000' + (terminal_id).toString(16)).slice(-8);
                                        let condition = (addressing_mode + condition_type + addressing_condition_count + STB + STB);
                                        let condition_len = ('0000' + parseInt((new Buffer.from(condition, 'hex').length)).toString(16)).slice(-4);
                                        if (osd_control == 1) { osd_control = '01'; } if (osd_control == 0) { osd_control = '00'; }    //1- enable OSD display; 0- cancel OSD display
                                        if (ShowTime == 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            StartTime = ('00000000' + (parseInt(DateTime) + parseInt(0)).toString(16)).slice(-8);
                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) + parseInt(0)) + parseInt(duration)).toString(16)).slice(-8);
                                            duration = ('00000000' + duration.toString(16)).slice(-8), ShowTime = '00', duration_time = ('0000' + duration.toString(16)).slice(-4);
                                        }
                                        if (ShowTime > 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            duration_time = ('00000' + duration.toString(16)).slice(-4);
                                            StartTime = ('00000000' + (parseInt(DateTime) + parseInt(0)).toString(16)).slice(-8);
                                            let intervalcal = (parseInt(parseInt(duration) * parseInt(ShowTime)) + parseInt(parseInt(Interval) * parseInt(ShowTime)));
                                            duration = ('00000000' + parseInt(intervalcal).toString(16)).slice(-8), ShowTime = ('0000' + parseInt(ShowTime).toString(16)).slice(-2);
                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) + parseInt(0)) + parseInt(intervalcal)).toString(16)).slice(-8);
                                        }
                                        FontSize = ('0000' + FontSize.toString(16)).slice(-2);
                                        if (fontColor == 0) { fontColor = 'ff000000'; } if (fontColor == 1) { fontColor = 'ffffffff'; } if (fontColor == 2) { fontColor = 'ff0000ff'; } if (fontColor == 3) { fontColor = 'ffff00ff'; }
                                        if (fontColor == 4) { fontColor = '008000ff'; } if (fontColor == 5) { fontColor = '0000ffdd'; } if (fontColor == 6) { fontColor = '808080ff'; } if (fontColor == 7) { fontColor = 'ffa500ff'; }
                                        if (fontColor == 8) { fontColor = 'ee82eeff'; } if (fontColor == 9) { fontColor = 'a52a2aff'; }
                                        if (backgroundColor == 0) { backgroundColor = 'ff000000'; } if (backgroundColor == 1) { backgroundColor = 'ffffffff'; } if (backgroundColor == 2) { backgroundColor = 'ff0000ff'; } if (backgroundColor == 3) { backgroundColor = 'ffff00ff'; }
                                        if (backgroundColor == 4) { backgroundColor = '008000ff'; } if (backgroundColor == 5) { backgroundColor = '0000ffdd'; } if (backgroundColor == 6) { backgroundColor = '808080ff'; } if (backgroundColor == 7) { backgroundColor = 'ffa500ff'; }
                                        if (backgroundColor == 8) { backgroundColor = 'ee82eeff'; } if (backgroundColor == 9) { backgroundColor = 'a52a2aff'; }
                                        if (style == 0) { style = '00' }  // 00-not lock & scroll   
                                        if (style == 2) { style = '10' }  // 10-lock & scroll 
                                        if (StyleValue == 1) { StyleValue = '05'; }  // scroll right to left at the top of the screen
                                        if (StyleValue == 2) { StyleValue = '01'; }  // scroll right to left at the bottom of the screen
                                        if (StyleValue == 3) { StyleValue = '03'; } // scroll right to left at the middle of the screen
                                        if (StyleValue == 4) { StyleValue = '02'; } // scroll left to right at the middle of the screen
                                        if (StyleValue == 5) { StyleValue = '04'; }  // scroll left to right at the top of the screen
                                        if (StyleValue == 0) { StyleValue = '00'; }  // scroll left to right at the bottom of the screen
                                        if (style == 1) { style = '21', StyleValue = '50'; }  // 21-not lock & text
                                        if (style == 3) { style = '31', StyleValue = '50'; }  // 31-lock & text
                                        if (service_cnt == 0) { service_cnt = '0000' } if (service_cnt == 1) {
                                            service_id = ('0000' + parseInt(service_id).toString(16)).slice(-4);
                                            service_cnt = ('0001' + service_id);
                                        }
                                        dcontent = Buffer.from(dcontent, 'utf8').toString('hex');
                                        dcontent = ('00' + dcontent);
                                        let dcontent_len = ('0000' + parseInt((new Buffer.from(dcontent, 'hex').length)).toString(16)).slice(-4);
                                        let command = (ExpiredTime + OSD_ID + osd_control + StartTime + ExpiredTime + style + font + FontSize + 'ff000000' + 'ffffffff' + duration + ShowTime + duration_time + StyleValue + height + service_cnt + dcontent_len + dcontent);
                                        let command_len = ('0000' + parseInt((new Buffer.from(command, 'hex').length)).toString(16)).slice(-4);
                                        let data_body = condition_len + condition + command_len + command;
                                        let data_len = ('0000' + parseInt((new Buffer.from(data_body, 'hex').length)).toString(16)).slice(-4);
                                        let gospellcmd = (cassession + cas_ver + data_len + data_body);
                                        console.log(gospellcmd);
                                        let smscmd = new Buffer.from(gospellcmd, 'hex');
                                        let gospelRes = await gospellAwait(smscmd, port, ip, 1);
                                        console.log('cas Responce-----', gospelRes);
                                        let casresststus = gospelRes.slice(-8);
                                        if (casresststus) {
                                            let insmsgcmd = ' INSERT sms.`cas_msg_cmd` (cust_id,msg_type,cas_type,cmd,responce,c_by)VALUES( ' +
                                                ' "' + cust_id + '","' + msg_type + '","' + cas + '","' + gospellcmd + '","' + gospelRes + '","' + data.cuser + '"); ';
                                            let resupdate = await conn.query(insmsgcmd);
                                            if (resupdate[0]['affectedRows'] > 0) {
                                                await conn.commit();
                                                console.log(" cas responce Successfully Updated");
                                            } else {
                                                console.log('Failed to insert in DB');
                                                erroraray.push({ vc_no: vcnum, msg: "MSG Send Successfully but Failed to update in DB." });
                                                await conn.rollback();
                                                continue;
                                            }
                                        }
                                    }
                                }
                                if (msg_type == 2 && sesres_id) {
                                    if (cas == 1) {
                                        var cardid = vcnum;
                                        let dateTime = Math.round(new Date().getTime() / 1000.0);
                                        let newses = new Date().getTime();
                                        newses += '' + Math.floor(Math.random() * 100);
                                        var cassession = ('00000000' + (sesres_id).toString(16)).slice(-4), cardidhex = ('00000000' + parseInt(cardid).toString(16)).slice(-8);
                                        var start_tim = (parseInt(dateTime) + parseInt(1)); // Time Adj + or -
                                        var start_time = ('00000000' + start_tim.toString(16)).slice(-8);
                                        var Email_tit = Buffer.from(dtittle, 'utf8').toString('hex');
                                        var Email_tit_len = ('00' + parseInt((new Buffer.from(Email_tit, 'hex').length)).toString(16)).slice(-2);
                                        var Email_cont = Buffer.from(dcontent, 'utf8').toString('hex');
                                        var Email_cont_len = ('0000' + parseInt((new Buffer.from(Email_cont, 'hex').length)).toString(16)).slice(-4);
                                        var data_len = ('0000' + ((new Buffer.from((cardidhex + start_time + Email_tit_len + Email_tit + Email_cont_len + Email_cont), 'hex')).length).toString(16)).slice(-4);
                                        var gospellcmd = (cassession + '020d' + data_len + cardidhex + start_time + Email_tit_len + Email_tit + Email_cont_len + Email_cont);
                                        let smscmd = new Buffer.from(gospellcmd, 'hex'); console.log('Command--', gospellcmd);
                                        let gospelRes = await gospellAwait(smscmd, port, ip, 1);
                                        console.log('cas Responce-----', gospelRes);
                                        let casresststus = gospelRes.slice(-8);
                                        if (casresststus) {
                                            let insmsgcmd = ' INSERT sms.`cas_msg_cmd` (cust_id,msg_type,cas_type,cmd,responce,c_by)VALUES( ' +
                                                ' "' + cust_id + '","' + msg_type + '","' + cas + '","' + gospellcmd + '","' + gospelRes + '","' + data.cuser + '"); ';
                                            let resupdate = await conn.query(insmsgcmd);
                                            if (resupdate[0]['affectedRows'] > 0) {
                                                await conn.commit();
                                                console.log(" cas responce Successfully Updated");
                                            } else {
                                                console.log('Failed to insert in DB');
                                                erroraray.push({ vc_no: vcnum, msg: "MSG Send Successfully but Failed to update in DB." });
                                                await conn.rollback();
                                                continue;
                                            }
                                        }
                                    }
                                    if (cas == 2) { }
                                    if (cas == 3) { }
                                    if (cas == 4) {
                                        let title = dtittle, content = dcontent, TerminalID = ('00000000' + vcnum).slice(-8);    //Test Box ID 1700e437
                                        let newses = new Date().getTime();
                                        newses += '' + Math.floor(Math.random() * 100);
                                        var cassession = ('00000000' + (sesres_id).toString(16)).slice(-4);
                                        let addressing_mode = '01', condition_type = '00', addressing_condition_count = '01';
                                        let condition = (addressing_mode + condition_type + addressing_condition_count + TerminalID + TerminalID);
                                        let condition_len = ('0000' + ((new Buffer.from(condition, 'hex').length)).toString(16)).slice(-4);

                                        let cas_expired = new Date();
                                        let cas_expired_time = Math.round(cas_expired.getTime() / 1000.0);
                                        let expired_time = Math.round(parseInt(cas_expired.setDate(new Date().getDate() + 1)) / 1000);
                                        cas_expired_time = ('00000000' + (cas_expired_time).toString(16)).slice(-8),
                                            expired_time = ('00000000' + (expired_time).toString(16)).slice(-8);
                                        // console.log('UNIX cas_expired_time', cas_expired_time);
                                        // console.log('UNIX expired_time', expired_time);
                                        let email_id = '00000001', control = '01', priority = '01', encode = '00', sender_name = 'WFTV';
                                        sender_name = Buffer.from(sender_name, 'utf8').toString('hex');
                                        sender_name = (encode + sender_name);
                                        let sender_name_length = ('00' + ((new Buffer.from(sender_name, 'hex').length)).toString(16)).slice(-2);
                                        title = Buffer.from(title, 'utf8').toString('hex');
                                        title = (encode + title);
                                        let title_length = ('00' + ((new Buffer.from(title, 'hex').length)).toString(16)).slice(-2);
                                        content = Buffer.from(content, 'utf8').toString('hex');
                                        content = (encode + content);
                                        let content_length = ('0000' + ((new Buffer.from(content, 'hex').length)).toString(16)).slice(-4);
                                        let command = (cas_expired_time + email_id + control + priority + expired_time + sender_name_length + sender_name + title_length + title + content_length + content);
                                        let command_len = ('0000' + ((new Buffer.from(command, 'hex').length)).toString(16)).slice(-4);
                                        let data = (condition_len + condition + command_len + command);
                                        let data_len = ('0000' + (new Buffer.from(data, 'hex').length).toString(16)).slice(-4);
                                        var gospellcmd = (cassession + '02b9' + data_len + data);
                                        console.log(gospellcmd);
                                        let smscmd = new Buffer.from(gospellcmd, 'hex');
                                        let gospelRes = await gospellAwait(smscmd, port, ip, 1);
                                        console.log('cas Responce-----', gospelRes);
                                        let caserrormsg = '', casresststus = gospelRes.slice(-8);
                                        if (casresststus) {
                                            let insmsgcmd = ' INSERT sms.`cas_msg_cmd` (cust_id,msg_type,cas_type,cmd,responce,c_by)VALUES( ' +
                                                ' "' + cust_id + '","' + msg_type + '","' + cas + '","' + gospellcmd + '","' + gospelRes + '","' + data.cuser + '"); ';
                                            let resupdate = await conn.query(insmsgcmd);
                                            if (resupdate[0]['affectedRows'] > 0) {
                                                await conn.commit();
                                                console.log(" cas responce Successfully Updated");
                                            } else {
                                                console.log('Failed to insert in DB');
                                                erroraray.push({ vc_no: vcnum, msg: "MSG Send Successfully but Failed to update in DB." });
                                                await conn.rollback();
                                                continue;
                                            }
                                        }
                                    }
                                }
                                if (msg_type == 3 && sesres_id) {       // Fingerprint
                                    if (cas == 1) {
                                        // let GlobalORind = 0;	//	0-Individual 1-Global
                                        let IsConrtol_id = 0;	 	// 0-activate   1-Deactivate
                                        let terminal_id = vcnum;		// nagari stb 80002296 chennai stb 66981331
                                        // let Duration = 60, Interval = 10, Showtimes = 2, FontSiz = 21, FontColor = 7, BackgroundColor = 9, PoSType = 1;
                                        // let PoS_X = 200, PoS_Y = 250, channelCtrl = 0, ChannelID = '', Overt = 1;
                                        let display_type_description = 1; var STB = '';
                                        var initialcmd = '020e', ICCard_ID = '23', Contition_Cmd_Content = '', command_type = '3c', reserved = 'ffffffff', IsConrtol = '';
                                        let lock = 0, StartTime = '', ExpiredTime = '', Condition_Len = '0006';

                                        let cassession = ('00000000' + (sesres_id).toString(16)).slice(-4);
                                        if (GlobalORind == 0) { Contition_Cmd_Content = '17', STB = terminal_id; } else if (GlobalORind == 1) { Contition_Cmd_Content = '15', STB = 200; }
                                        let FP_ID = ('00000000' + (sesres_id).toString(16)).slice(-8), STB_ID = ('00000000' + parseInt(STB).toString(16)).slice(-8);
                                        if (IsConrtol_id == 0) { IsConrtol = '01' } else if (IsConrtol_id == 1) { IsConrtol = '02' }
                                        if (lock == 0) { lock = '00' } else if (lock == 1) { lock = '01' }
                                        console.log('Duration', Duration, 'showtimes', Showtimes, 'Interval', Interval);

                                        if (Showtimes == 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            StartTime = ('00000000' + (parseInt(DateTime) - parseInt(9120) + (240)).toString(16)).slice(-8);
                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) - parseInt(9120)) + parseInt(Duration) + (240)).toString(16)).slice(-8);
                                            Duration = ('0000' + parseInt(Duration).toString(16)).slice(-4), Interval = '0000', Showtimes = '0000';
                                        }
                                        // else if (Showtimes > 1) {
                                        // 	let DateTime = Math.round(new Date().getTime() / 1000.0);
                                        // 	StartTime = ('00000000' + (parseInt(DateTime) - parseInt(9120)).toString(16)).slice(-8);
                                        // 	let intervalcal = ((Duration * Showtimes) + (Showtimes * Interval));
                                        // 	Duration = '0000', Interval = ('0000' +intervalcal.toString(16)).slice(-4), Showtimes = ('0000' + Showtimes.toString(16)).slice(-4);
                                        // 	ExpiredTime = ('00000000' + ((parseInt(DateTime) - parseInt(9120)) + parseInt(intervalcal)).toString(16)).slice(-8); }
                                        else if (Showtimes > 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            StartTime = ('00000000' + (parseInt(DateTime) - parseInt(9120) + (240)).toString(16)).slice(-8);
                                            var intervalcal = ((Duration * Showtimes) + parseInt(Interval));
                                            console.log('intervalcal', intervalcal)
                                            Duration = ('0000' + parseInt(intervalcal).toString(16)).slice(-4), Showtimes = ('0000' + parseInt(Showtimes).toString(16)).slice(-4);
                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) - parseInt(9120)) + parseInt(intervalcal) + (240)).toString(16)).slice(-8);
                                            Interval = ('00000' + parseInt(Interval).toString(16)).slice(-4);
                                        }
                                        var FontSize = ('0000' + FontSiz.toString(16)).slice(-2);
                                        if (FontColor == 0) { FontColor = '000000ff'; } if (FontColor == 1) { FontColor = 'ffffffff'; } if (FontColor == 2) { FontColor = 'ff0000ff'; } if (FontColor == 3) { FontColor = 'ffff00ff'; }
                                        if (FontColor == 4) { FontColor = '008000ff'; } if (FontColor == 5) { FontColor = '0000ffdd'; } if (FontColor == 6) { FontColor = '808080ff'; } if (FontColor == 7) { FontColor = 'ffa500ff'; }
                                        if (FontColor == 8) { FontColor = 'ee82eeff'; } if (FontColor == 9) { FontColor = 'a52a2aff'; }
                                        if (BackgroundColor == 0) { BackgroundColor = '000000ff'; } if (BackgroundColor == 1) { BackgroundColor = 'ffffffff'; } if (BackgroundColor == 2) { BackgroundColor = 'ff0000ff'; } if (BackgroundColor == 3) { BackgroundColor = 'ffff00ff'; }
                                        if (BackgroundColor == 4) { BackgroundColor = '008000ff'; } if (BackgroundColor == 5) { BackgroundColor = '0000ffdd'; } if (BackgroundColor == 6) { BackgroundColor = '808080ff'; } if (BackgroundColor == 7) { BackgroundColor = 'ffa500ff'; }
                                        if (BackgroundColor == 8) { BackgroundColor = 'ee82eeff'; } if (BackgroundColor == 9) { BackgroundColor = 'a52a2aff'; }
                                        if (PoSType == 1) {     //  1-Fixed 2-Random
                                            PoSType = ('000' + parseInt(PoSType).toString(16)).slice(-2), PoS_X = ('000000' + parseInt(PoS_X).toString(16)).slice(-4),
                                                PoS_Y = ('000000' + parseInt(PoS_Y).toString(16)).slice(-4);
                                        } else if (PoSType == 2) { PoSType = ('000' + parseInt(PoSType).toString(16)).slice(-2), PoS_X = '00fa', PoS_Y = '00fa'; }
                                        if (channelCtrl == 0) { channelCtrl = '00', ChannelID = '0500'; }			// for all channel finger print
                                        if (channelCtrl > 0) { channelCtrl = '01', ChannelID = ('000000' + parseInt(ChannelID).toString(16)).slice(-4); }	// Particular channel finger print
                                        if (Overt == 1) { Overt = '42'; } else if (Overt == 2) { Overt = '02'; }
                                        if (display_type_description == 1) { display_type_description = '051003'; }
                                        let end = 'ff00'
                                        let cmd = (Condition_Len + ICCard_ID + Contition_Cmd_Content + STB_ID + command_type + ExpiredTime + FP_ID + reserved + IsConrtol + StartTime + lock + Duration + Interval + Showtimes + FontSize + FontColor + BackgroundColor + PoSType + PoS_X + PoS_Y + channelCtrl + ChannelID + display_type_description + Overt + end);
                                        let data_len = ('0000' + ((new Buffer.from((cmd), 'hex')).length).toString(16)).slice(-4);

                                        let gospellcmd = cassession + initialcmd + data_len + cmd;
                                        console.log(gospellcmd);
                                        let smscmd = new Buffer.from(gospellcmd, 'hex');
                                        console.log('ip', ip, port)
                                        let gospelRes = await gospellAwait(smscmd, port, ip, 1);
                                        let caserrormsg = '', casresststus = gospelRes.slice(-8);
                                        if (casresststus) {
                                            let insmsgcmd = ' INSERT sms.`cas_msg_cmd` (cust_id,msg_type,cas_type,cmd,responce,c_by)VALUES( ' +
                                                ' "' + cust_id + '","' + msg_type + '","' + cas + '","' + gospellcmd + '","' + gospelRes + '","' + data.cuser + '"); ';
                                            let resupdate = await conn.query(insmsgcmd);
                                            if (resupdate[0]['affectedRows'] > 0) {
                                                await conn.commit();
                                                console.log(" cas responce Successfully Updated");
                                            } else {
                                                console.log('Failed to insert in DB');
                                                erroraray.push({ vc_no: vcnum, msg: "MSG Send Successfully but Failed to update in DB." });
                                                await conn.rollback();
                                                continue;
                                            }
                                        }
                                    } else if (cas == 4) {
                                        // console.log(Duration,Interval,Showtimes)
                                        var cassession = ('00000000' + parseInt(sesres_id).toString(16)).slice(-4), StartTime = '', ExpiredTime = '';
                                        let stb_id = vcnum, control = 1, control_flag = PoSType, duration = Duration, interval = Interval, Showtime = Showtimes, PoS_x = PoS_X, PoS_y = PoS_Y, height = 20, FontSize = FontSiz;
                                        let fontColor = FontColor, backgroundColor = BackgroundColor;
                                        var cas_ver = '02b3', addressing_mode = '01', condition_type = '00', addressing_condition_count = '01', font = '0001', duration_time = '', end = '';
                                        let FP_ID = ('00000000' + parseInt(sesres_id).toString(16)).slice(-8);
                                        let TerminalID = ('00000000' + (stb_id).toString(16)).slice(-8);
                                        var condition = (addressing_mode + condition_type + addressing_condition_count + TerminalID + TerminalID);
                                        let condition_len = ('0000' + ((new Buffer.from(condition, 'hex').length)).toString(16)).slice(-4);
                                        if (control == 1) { control = '01' } else if (control == 0) { control = '00' } // 1-display 0-cancel display
                                        if (control_flag == 1) { //1-position fixed 2-random
                                            control_flag = '30', PoS_x = ('0000' + parseInt(PoS_x).toString(16)).slice(-4),
                                                PoS_y = ('0000' + parseInt(PoS_y).toString(16)).slice(-4), height = ('000' + parseInt(height).toString(16)).slice(-2);
                                            end = ('00ff' + PoS_x + PoS_y + height);
                                        } else if (control_flag == 2) { control_flag = '32', end = '00ff'; }
                                        FontSize = ('0000' + parseInt(FontSize).toString(16)).slice(-2);
                                        if (fontColor == 0) { fontColor = '000000ff'; } if (fontColor == 1) { fontColor = 'ffffffff'; } if (fontColor == 2) { fontColor = 'ff0000ff'; } if (fontColor == 3) { fontColor = 'ffff00ff'; }
                                        if (fontColor == 4) { fontColor = '008000ff'; } if (fontColor == 5) { fontColor = '0000ffdd'; } if (fontColor == 6) { fontColor = '808080ff'; } if (fontColor == 7) { fontColor = 'ffa500ff'; }
                                        if (fontColor == 8) { fontColor = 'ee82eeff'; } if (fontColor == 9) { fontColor = 'a52a2aff'; }
                                        if (backgroundColor == 0) { backgroundColor = '000000ff'; } if (backgroundColor == 1) { backgroundColor = 'ffffffff'; } if (backgroundColor == 2) { backgroundColor = 'ff0000ff'; } if (backgroundColor == 3) { backgroundColor = 'ffff00ff'; }
                                        if (backgroundColor == 4) { backgroundColor = '008000ff'; } if (backgroundColor == 5) { backgroundColor = '0000ffdd'; } if (backgroundColor == 6) { backgroundColor = '808080ff'; } if (backgroundColor == 7) { backgroundColor = 'ffa500ff'; }
                                        if (backgroundColor == 8) { backgroundColor = 'ee82eeff'; } if (backgroundColor == 9) { backgroundColor = 'a52a2aff'; }
                                        if (Showtime == 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            StartTime = ('00000000' + (parseInt(DateTime) - parseInt(0)).toString(16)).slice(-8);
                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) - parseInt(0)) + parseInt(Duration)).toString(16)).slice(-8);
                                            duration = ('00000000' + parseInt(duration).toString(16)).slice(-8), interval = '0000', Showtime = '00';
                                            duration_time = ('00000000' + parseInt(Duration).toString(16)).slice(-4)
                                        }
                                        if (Showtime > 1) {
                                            let DateTime = Math.round(new Date().getTime() / 1000.0);
                                            duration_time = ('00000' + duration.toString(16)).slice(-4);
                                            StartTime = ('00000000' + (parseInt(DateTime) - parseInt(0)).toString(16)).slice(-8);
                                            let intervalcal = (parseInt(parseInt(duration) * parseInt(Showtime)) + parseInt(parseInt(interval) * parseInt(Showtime)));
                                            duration = ('00000000' + parseInt(intervalcal).toString(16)).slice(-8), Showtime = ('0000' + parseInt(Showtime).toString(16)).slice(-2);
                                            ExpiredTime = ('00000000' + ((parseInt(DateTime) - parseInt(0)) + parseInt(intervalcal)).toString(16)).slice(-8);
                                        }
                                        var command = (ExpiredTime + FP_ID + control + control_flag + font + FontSize + fontColor + backgroundColor + StartTime + duration + Showtime + duration_time + end);
                                        var command_len = ('0000' + ((new Buffer.from(command, 'hex').length)).toString(16)).slice(-4);
                                        var cmd = (condition_len + condition + command_len + command);
                                        data_len = ('0000' + ((new Buffer.from(cmd, 'hex').length)).toString(16)).slice(-4);
                                        let gospellcmd = cassession + cas_ver + data_len + cmd;
                                        console.log(gospellcmd)
                                        let smscmd = new Buffer.from(gospellcmd, 'hex');
                                        let gospelRes = await gospellAwait(smscmd, port, ip, 1);
                                        let caserrormsg = '', casresststus = gospelRes.slice(-8);
                                        console.log(gospelRes);
                                        if (casresststus) {
                                            let insmsgcmd = ' INSERT sms.`cas_msg_cmd` (cust_id,msg_type,cas_type,cmd,responce,c_by)VALUES( ' +
                                                ' "' + cust_id + '","' + msg_type + '","' + cas + '","' + gospellcmd + '","' + gospelRes + '","' + data.cuser + '"); ';
                                            let resupdate = await conn.query(insmsgcmd);
                                            if (resupdate[0]['affectedRows'] > 0) {
                                                await conn.commit();
                                                console.log(" cas responce Successfully Updated");
                                            } else {
                                                console.log('Failed to insert in DB');
                                                erroraray.push({ vc_no: vcnum, msg: "MSG Send Successfully but Failed to update in DB." });
                                                await conn.rollback();
                                                continue;
                                            }
                                        }

                                    }

                                }
                            }
                        }
                    } else {
                        console.log('NO Record Found');
                        erroraray.push({ vc_no: stb_id, msg: "Can't Find the STB or VC Record." });
                        await conn.rollback();
                        continue;
                    }
                } catch (error) {
                    console.log('Error ', error)
                    await conn.rollback();
                }
            }
            conn.release();
        } else {
            erroraray.push({ vc_no: vcnum, msg: "Failed to Process It." });
        }
        console.log('success2');
        erroraray.push({ msg: "Process Completed.", status: 1 });

        // await conn.end();
        return resolve(erroraray);
    });
}

const casprocess = async (box_id, conn, cas_type, sesres_id, casprod_id, card_no, box_no, renewal, port, ip, cuser, casedate) => {      // Using 
    return new Promise(async (resolve, reject) => {
        const isReachable = require('is-reachable');
        (async () => {
            try {			//	testing
                let ipport = ip + ':' + port;
                // console.log('EXP DATE :', casedate);
                let server_status = await isReachable(ipport);
                if (server_status || cas_type == 5) {
                    if (cas_type == 1) {
                        console.log('Session ID--', sesres_id);
                        var cassession = ('00000000' + parseInt(sesres_id).toString(16)).slice(-4);
                        console.log(sesres_id, 'Session ID--', cassession, 'Product ID-- ', casprod_id);
                        let prod_id = casprod_id, start_time = '', end_time = '';
                        let cardidhex = ('00000000' + parseInt(card_no).toString(16)).slice(-8), PNhex = ('0000' + (parseInt(prod_id)).toString(16)).slice(-4);
                        if (renewal == 1) {
                            start_time = (((new Date().getTime() / 1000) - 9000).toString(16)).substring(0, 8); end_time = casedate; // OLD
                        } else {
                            start_time = casedate, end_time = casedate
                            //	start_time = '7e06e3ff', end_time = '7e06e3ff' 
                        }
                        console.log('Renewal : ', renewal, ' START Time : ', start_time, ' END Time : ', end_time);
                        var gospellcmd = (cassession + '02010013' + cardidhex + '00010100' + PNhex + start_time + end_time + '00');
                        var smscmd = Buffer.from(gospellcmd, 'hex'); console.log('FINAL Buffer ', smscmd);
                        let cas_responce = await gospellAwait(smscmd, port, ip, renewal);
                        console.log('cas Responce-----', cas_responce);
                        let casresststus = cas_responce.slice(-8);
                        if (cas_responce) {
                            let resupdate1 = ' INSERT INTO sms.`cas_session`(box_no,cas_type,cmd_type,sms_cmd,res,cby) values ' +
                                ' ( "' + card_no + '","' + cas_type + '","1","' + gospellcmd + ' ","' + cas_responce + ' ","' + cuser + ' "); ';
                            console.log('cas_session Query : ', resupdate1);
                            let resupdate = await conn.query(resupdate1);
                            if (resupdate[0]['affectedRows'] > 0 && casresststus == 0) {
                                // await conn.commit();
                                resolve(cas_responce);
                                console.log(" Session Successfully Updated");
                            } else { resolve(cas_responce); }
                        }
                    }
                    if (cas_type == 2) {
                        console.log('Secure Tv');
                    }
                    if (cas_type == 3) {
                        let prod_id = casprod_id, method = 'purchase';
                        console.log(card_no, box_no, renewal, prod_id, method, port, ip);
                        let cas_responce = await SafeViewAwait(card_no, box_no, renewal, prod_id, method, port, ip);
                        console.log('Safeviwe cas Responce-----', cas_responce);
                        resolve(cas_responce);
                    }
                    if (cas_type == 4) {
                        console.log('Session ID--', sesres_id)
                        var cassession = ('00000000' + parseInt(sesres_id).toString(16)).slice(-4);
                        console.log('Card No--', card_no, 'Action--', renewal, 'Product ID-- ', casprod_id);
                        let action = renewal, prod_id = casprod_id, itemvc_no = card_no;
                        let session_id = cassession, cas_ver = '02', command_type = 'c1', addressing_mode = '00', condition_type = '00', expired_time, instant_flag = '01',
                            terminal_id = itemvc_no, package_count = '01', authorize_type = '00', service_id = prod_id, start_time = '';
                        if (action == 1) { start_time = (((new Date().getTime() / 1000) - 60).toString(16)).substring(0, 8); expired_time = casedate; } else { start_time = casedate, expired_time = casedate }
                        let first = session_id + cas_ver + command_type;
                        let second = addressing_mode + condition_type + terminal_id;
                        let condition_len = ('0000' + parseInt((new Buffer.from(second, 'hex').length)).toString(16)).slice(-4);
                        let third = instant_flag + package_count + authorize_type;
                        let forth = ('0000' + (parseInt(service_id)).toString(16)).slice(-4) + start_time + expired_time;
                        let command_len = ('0000' + parseInt((new Buffer.from(third + forth, 'hex').length)).toString(16)).slice(-4);
                        let data_len = ('0000' + parseInt((new Buffer.from(condition_len + second + command_len + third + forth, 'hex').length)).toString(16)).slice(-4);
                        var smscmd = new Buffer.from(first + data_len + condition_len + second + command_len + third + forth, 'hex');
                        let fcmd = (first + data_len + condition_len + second + command_len + third + forth);
                        console.log('FINAL Buffer ', fcmd);
                        let cas_responce = await gospellAwait(smscmd, port, ip, renewal);
                        console.log('cas Responce-----', cas_responce);
                        let caserrormsg = '', casresststus = cas_responce.slice(-8);
                        if (casresststus != 0) {
                            if (casresststus = 'e0000005') {
                                let stbter_update = ' UPDATE sms.box SET a_ter=0,i_ter=0,s_ter=0 WHERE stb_id= ' + box_id + ' ';
                                console.log(stbter_update);
                                let stbter_resupdate = await conn.query(stbter_update);
                                if (stbter_resupdate[0]['affectedRows'] > 0) {
                                    await conn.commit();
                                    console.log(" Session Successfully Updated");
                                } else { erroraray.push({ vc_no: vc_no, msg: ' Terminal Status need to Update. Error Code ', Error_msg: '3306' }); }
                                // caserrormsg = 'Terminal not activated';
                            }
                        }

                        if (cas_responce) {
                            let resupdate1 = ' INSERT INTO sms.`cas_session`(box_no,cas_type,cmd_type,sms_cmd,res,cby) values ' +
                                ' ( "' + card_no + '","' + cas_type + '","1","' + fcmd + ' ","' + cas_responce + ' ","' + cuser + ' "); ';
                            console.log(resupdate1);
                            let resupdate = await conn.query(resupdate1);
                            if (resupdate[0]['affectedRows'] > 0 && casresststus == 0) {
                                // await conn.commit();
                                resolve(cas_responce);
                                console.log(" Session Successfully Updated");
                            } else {
                                // console.log('Failed');
                                // await conn.rollback();
                                resolve(cas_responce);
                                // return resolved();
                            }
                        }
                    }
                    if (cas_type == 5) {	// Bharath CAS
                        delay(2000);
                        let start = false, r1 = '', r1status = false, r2 = '', r2status = false, r3 = '', bcascmd1 = '';
                        var vc = ('00000000' + parseInt(card_no)).slice(-8), prod = ('00000000' + parseInt(casprod_id).toString(16)).slice(-4);
                        let socket = new net.Socket();
                        socket = new PromiseSocket(socket);
                        socket.setTimeout(10000);
                        await socket.connect({ port: port, host: ip });
                        r1 = await socket.read();
                        r1 = r1.toString('utf8');
                        console.log('r1 : ', r1);
                        if (r1 == '591801000024000000000000010100081234567800000000') {
                            await socket.write('5918' + '0100' + '0024' + '00000000000001020008' + 'e941a65a' + '00000000'); start = true;
                        }
                        if (start) {
                            await delay(500);
                            r2 = await socket.read();
                            r2 = r2.toString('utf8');
                            console.log('r2 : ', r2);
                        }
                        if (r2 == '59180100001D00000000000001FF0001100000000') {
                            console.log('Renewal : ', renewal);
                            if (renewal == 1) {
                                let d = (new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000))).toISOString();
                                var sdate = d.replace('Z', ' ').replace('T', ' ').slice(0, -5).replace(/[#-]/g, '').replace(/[#:]/g, '').replace(' ', '');
                                bcascmd1 = '59180100' + '004b' + '00003719' + '020d' + '02070008' + vc + '100021' + prod + '0' + sdate + casedate + '00000000';	// Active
                            } else { bcascmd1 = '59180100' + '002E' + '0000000B' + '020e' + '02070008' + vc + '170004' + prod + '00000000'; }			// Deactive

                            // ' 59180100 004b 00003719 020d 02070008 10127822 100021 03f2 0 20210528 100308 20210627 10038 00000000'
                            // ' 59180100 004b 00003719 020d 02070008 10125190 100021 03ac 0 20210529 230310 20210727 22044 00000000'
                            console.log('B-CAS cmd :', bcascmd1);
                            await delay(500);
                            if (bcascmd1) { await socket.write(bcascmd1); r2status = true; }
                        }
                        if (r2status) {
                            r3 = await socket.read();
                            let cas_responce = r3.toString('utf8').slice(33);
                            console.log('r3 : ', r3);
                            await socket.end();
                            resolve(cas_responce);
                        }
                    }
                } else {
                    let cas_responce = 'RTO'
                    resolve(cas_responce);
                }
            } catch (e) {			// try Testing
                console.error("Connection error:", e);
                resolve(e);
            }
        })();

    });
}

const pairingprocess = async (cas_type, card_no, box_no, paction, port, ip) => {                   // Using
    console.log('CAS pairing', ip, port);
    return new Promise(async (resolve, reject) => {
        const isReachable = require('is-reachable');
        (async () => {
            try {
                let server_status = await isReachable(ip + ':' + port);
                if (server_status) {
                    if (cas_type == 11 && card_no) {
                        // convert STB ID Number to hex then Binary
                        var StbIdHex = '', sd = ('00000000' + parseInt(Math.floor(1000 + Math.random() * 9000)).toString(16)).slice(-4);
                        console.log('box_no:', box_no, ':', /^\d+$/.test(box_no));
                        if (/^\d+$/.test(box_no)) {		//only Number
                            console.log('box Number');
                            //	StbIdHex = ('00000000' + parseInt(box_no).toString(16)).slice(-8);
                            StbIdHex = ('00000000' + box_no).slice(-8);
                        } else {								// alphanumeric 
                            console.log('box alphanumeric');
                            StbIdHex = ('00000000' + (box_no).toString(16)).slice(-8);
                        }

                        console.log('STB ID in HEX :', StbIdHex);
                        var PET = new Date().getTime() / 1000;        // required for pair & Unpair Fixed Value
                        var PEti = parseInt(PET, 10);
                        var PETim = PEti + 86400 - 2000;
                        var PETimHex = ('00000000' + PETim.toString(16)).slice(-8);
                        // console.log('Expired Time in HEX ', PETimHex);
                        var cardidhex = '';
                        console.log('card_no:', card_no, ':', /^\d+$/.test(card_no));
                        if (/^\d+$/.test(card_no)) {		//only Number
                            console.log('card Number');
                            cardidhex = ('00000000' + parseInt(card_no).toString(16)).slice(-8);
                        } else {								// alphanumeric 
                            console.log('card alphanumeric');
                            cardidhex = ('00000000' + card_no.toString(16)).slice(-8);
                        }
                        console.log('Card ID in HEX ', cardidhex);
                        var gospellcmd;
                        if (StbIdHex > '00000000' && paction == 1) {	//Pairing
                            console.log('pairing');
                            gospellcmd = (sd + '02240013' + StbIdHex + '0100' + PETimHex + '01' + cardidhex + 'ffffffff');
                        } else if (StbIdHex > '00000000' && paction == 0) {	// Unpairing
                            console.log('Unpairing');
                            gospellcmd = (sd + '0224000d' + StbIdHex + '0100' + PETimHex + '00' + 'ffff');
                        } else {
                            console.log('Command Error');
                            resolve('FFFF0000');
                        }
                        console.log('CMD :', gospellcmd);
                        var smscmd = Buffer.from(gospellcmd, 'hex');   // New Buffer
                        // console.log('Paring or Unparing Command ', smscmd);
                        let cas_responce = await gospellAwait(smscmd, port, ip, 1);
                        // console.log(cas_responce);
                        resolve(cas_responce);
                    }
                    if (cas_type == 14) {
                        if (paction == 1) {
                            let prod_id, renewal, method = 'pairingBarcode';
                            console.log('Safeview Data---', card_no, box_no, renewal, prod_id, method, port, ip);
                            let cas_responce = await SafeViewAwait(card_no, box_no, renewal, prod_id, method, port, ip);
                            console.log('Safeviwe cas Responce-----', cas_responce);
                            resolve(cas_responce);
                        } else {
                            let cas_responce = { resultCode: '00', resultMsg: 'OK.' };
                            console.log('Safeviwe cas Responce-----', cas_responce);
                            resolve(cas_responce);
                        }
                    }
                    if (cas_type == 15 || cas_type == 13) {
                        let cas_responce = '00000000'
                        resolve(cas_responce);
                    }
                    if (cas_type == 12) {					// Bharath CAS
                        console.log('B-CAS');
                        let start = false, r1 = '', r1status = false, r2 = '', r2status = false, r3 = '', bcascmd1 = '';
                        let socket = new net.Socket();
                        socket = new PromiseSocket(socket);
                        socket.setTimeout(3000);
                        console.log(ip, port);
                        await socket.connect({ port: port, host: ip });
                        r1 = await socket.read();
                        r1 = r1.toString('utf8');
                        console.log('r1 : ', r1);
                        if (r1 == '591801000024000000000000010100081234567800000000') {
                            await socket.write('5918' + '0100' + '0024' + '00000000000001020008' + 'e941a65a' + '00000000'); start = true;
                        }
                        if (start) {
                            r2 = await socket.read();
                            r2 = r2.toString('utf8');
                            console.log('r2 : ', r2);
                        }
                        if (r2 == '59180100001D00000000000001FF0001100000000') {
                            if (paction == 1) {
                                var cardidhex = ('00000000' + parseInt(card_no).toString(16)).slice(-8), vc = ('00000000' + (card_no)).slice(-8);
                                box_no = ('00000000' + (box_no)).slice(-8);
                                console.log('VC:', cardidhex);
                                bcascmd1 += '5918' + '0100' + '004E' + '00000005' + '0201' + '04' + '07' + '0008' + box_no +
                                    '11' + '0008' + cardidhex + '09' + '0008' + '00560066' + '20' + '0008' + vc + '00000000'		// Pairing
                            } else { bcascmd1 += '5918' + '0100' + '0024' + '00000007' + '0203' + '01070008' + box_no + '00000000' }	// Unpairing
                            if (bcascmd1) { await socket.write(bcascmd1); r2status = true; }
                        }
                        if (r2status) {
                            r3 = await socket.read();
                            let cas_responce = r3.toString('utf8').slice(33);
                            console.log('CAS Final Responce : ', cas_responce);
                            await socket.end();
                            resolve(cas_responce);
                        }

                    }
                } else {
                    let cas_responce = 'RTO'
                    resolve(cas_responce);
                }
            } catch (e) {
                console.error("Connection error:", e)
                resolve(e);
            }
        })();

    });

}



module.exports = casconn;
module.exports.casprocess = casprocess;
module.exports.bulkOSDMessage = bulkOSDMessage;
module.exports.bulkTerminal = bulkTerminal;
module.exports.pairingprocess = pairingprocess;
