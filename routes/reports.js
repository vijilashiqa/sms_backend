var express = require('express'),
    compress = require('compression'),
    reports = express.Router(),
    pool = require('../connection/conn'),
    poolPromise = require('../connection/conn').poolp;

//box Vc Pair log table//
reports.post('/stbpairlist', function (req, res, err) {
    console.log('bbfjh')
    var jwtdata = req.jwt_data, where = [], sql, sqlquery =
        `    	
        SELECT bx.boxid,bx.boxno,bv.vcid,bv.vcno,h.hdid,h.hdname,hd.cas_name,bx.pairflg,u.id,u.fullname,bm.modelname,u.profileid,bx.cdate FROM smsv2.box bx
        LEFT JOIN smsv2.hd h ON bx.hdid=h.hdid
        LEFT JOIN smsv2.boxvc bv ON bx.vcid=bv.vcid
        LEFT  JOIN smsv2.users u ON bx.lcoid=u.id 
        LEFT JOIN smsv2.hd_cas hd ON bx.casid=hd.hdcasid 
        LEFT JOIN smsv2.boxmodel bm ON bx.modelid=bm.bmid
     `
        ,
        sqlqueryc = `SELECT COUNT(*) AS count FROM smsv2.box bx
        LEFT JOIN smsv2.hd h ON bx.hdid=h.hdid
        LEFT JOIN smsv2.boxvc bv ON bx.vcid=bv.vcid
        LEFT  JOIN smsv2.users u ON bx.lcoid=u.id 
        LEFT JOIN smsv2.hd_cas hd ON bx.casid=hd.hdcasid 
        LEFT JOIN smsv2.boxmodel bm ON bx.modelid=bm.bmid`

        , finalresult = [],
        data = req.body;
     
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' bx.hdid=' + data.hdid);
    if (jwtdata.role <= 777) where.push(' bx.hdid=' + jwtdata.hdid);
    if(data.hasOwnProperty('usertype')&& data.usertype )where.push(`u.usertype=${data.usertype}`);
    if(data.hasOwnProperty('boxid')&& data.boxid )where.push(`bx.boxid=${data.boxid}`);
    if(data.hasOwnProperty('vcid')&& data.vcid )where.push(`bx.vcid=${data.vcid}`);

    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ')
        sqlquery += where;
        sqlqueryc += where;
    }
    if (data.index != null) console.log('-----');
    if (data.index != null && data.limit != null) sqlquery += ' LIMIT ' + data.index + ',' + data.limit;
    console.log('getlist...', sqlquery, '\n\r sqlqueryc :', sqlqueryc);
    // sqlquery += ' LIMIT ?,? '
    console.log('list stb ...', sqlquery);
    pool.getConnection(function (err, conn) {
        if (!err) {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    finalresult.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        console.log(sql.sql)
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
//search for box  //
reports.post('/searchgetbox', function (req, res) {

	var sql, data = req.body,jwtdata=req.jwt_data,where=[],
		sqlquery = `SELECT bx.vcid,bx.boxid,bx.boxno,bv.vcno,bx.hdid,bx.pairflg,bx.casid FROM smsv2.box bx
        LEFT JOIN smsv2.boxvc bv  ON bx.vcid=bv.vcid  `;
	console.log('data', data)
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' bx.hdid=' + data.hdid);
    if (jwtdata.role <= 777) where.push(' bx.hdid=' + jwtdata.hdid);
	if (data.hasOwnProperty('boxno') && data.boxno) {
		sqlquery += ` AND bx.boxno like  %${data.boxno}%`;
	}
    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ')
        sqlquery += where;
        
    }
console.log('searchbox',sqlquery);
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
//search for boxvc  //
reports.post('/searchgetboxvc', function (req, res) {

	var sql, data = req.body,
		sqlquery = `SELECT hdid,vcid,vcno  FROM smsv2.boxvc  bv 
         `;
	console.log('data', data)
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' bv.hdid=' + data.hdid);
    if (jwtdata.role <= 777) where.push(' bv.hdid=' + jwtdata.hdid);
	
	if (data.hasOwnProperty('vcno') && data.vcno) {
		sqlquery += ` AND bv.vcno like  %${data.vcno}%`;
	}
    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ')
        sqlquery += where;
        
    }
  
console.log('searchboxvc',sqlquery);
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


//search api for subscriber//
reports.post('/searchforsub', function (req, res) {

	var sql, data = req.body,
		sqlquery = ` SELECT custid, hdid, userid,profileid FROM smsv2.subscriber  

         `;
	console.log('data', data)
    if (jwtdata.role > 777 && data.hdid != '' && data.hdid != null) where.push(' hdid=' + data.hdid);
    if (jwtdata.role <= 777) where.push(' hdid=' + jwtdata.hdid);
	if (data.hasOwnProperty('profileid') && data.profileid) {
		sqlquery += ` AND profileid like  %${data.profileid}%`;
	}
    if (where.length > 0) {
        where = ' WHERE' + where.join(' AND ')
        sqlquery += where;
       
    }
console.log('search',sqlquery);
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




module.exports = reports;