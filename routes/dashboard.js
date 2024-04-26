
"use strict";
var express = require('express'),
    compress = require('compression'),
    dashboard = express.Router(),
    pool = require('../connection/conn'),
    poolPromise = require('../connection/conn').poolp;


dashboard.post('/search', function (req, res, err) {
    var jwtdata = req.jwt_data
    var data = req.body, sqlquery = ' SELECT s.custid ', wheresql = ``;
    console.log('Search DATA : ', data);
    if (data.hasOwnProperty('sflag') && data.sflag == 1) {
        sqlquery += ',s.fullname uname '
    }
    if (data.hasOwnProperty('sflag') && (data.sflag == 2 || data.sflag == 3)) {
        sqlquery += ' ,CONCAT("B :",bx.boxno," V :",vc.vcno) uname '
    }

    if (data.hasOwnProperty('sflag') && data.sflag == 4) {
        sqlquery += ' ,s.mobile uname '
    }
    if (data.hasOwnProperty('sflag') && data.sflag == 5) {
        sqlquery += ' ,s.email uname '
    }
    if (data.hasOwnProperty('sflag') && data.sflag == 6) {
        sqlquery += ' ,s.cafno uname '
    }
    if (data.hasOwnProperty('sflag') && data.sflag == 7) {
        sqlquery += ' ,CONCAT("B :",bx.boxno," V :",vc.vcno) uname '
    }


    if (data.hasOwnProperty('sflag') && data.sflag != '') {
        sqlquery += ` FROM  smsv2.subscriber s 
            INNER JOIN smsv2.box bx ON s.custid=bx.custid and bx.hdid=s.hdid
            INNER JOIN smsv2.boxvc vc ON vc.vcid=bx.vcid and bx.hdid=vc.hdid
            WHERE s.custid IS NOT NULL `
    }

    if (data.hasOwnProperty('sflag') && data.sflag != 0 && data.hasOwnProperty('like') && data.like != '') {
        if (data.sflag == 1 && data.like != '') sqlquery += ' and s.custid LIKE "%' + data.like + '%" ';
        if (data.sflag == 2 && data.like != '') sqlquery += ' and vc.vcno LIKE "%' + data.like + '%" ';
        if (data.sflag == 3 && data.like != '') sqlquery += ' and bx.bxno LIKE "%' + data.like + '%" ';
        if (data.sflag == 4 && data.like != '') sqlquery += ' and s.mobile LIKE "%' + data.like + '%" ';
        if (data.sflag == 5 && data.like != '') sqlquery += ' and s.email LIKE "%' + data.like + '%" ';
        if (data.sflag == 6 && data.like != '') sqlquery += ' and s.cafno LIKE "%' + data.like + '%" ';
        if (data.sflag == 7 && data.like != '') sqlquery += ' and bx.boxno LIKE "%' + data.like + '%" ';
        if (data.sflag == 7 && data.like != '') sqlquery += ' and vc.vcno LIKE "%' + data.like + '%" ';
    }

    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) sqlquery += (`and  s.hdid= ${data.hdid} `);
    if (jwtdata.role <= 777) sqlquery += (` and s.hdid= ${jwtdata.hdid} `);

    console.log('Get Search Query : ', sqlquery);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                conn.release();
                console.log('Connection Released. ');
                if (!err) {
                    res.send(JSON.stringify(result));
                } else {
                    console.log('Error so Connection Released. ');
                }
            });
        }
    });
});


module.exports = dashboard;