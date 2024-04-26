// "use strict";
const express = require('express');
app = express();
// Routes File Import Start
const login = require('./routes/login');

const prehandler = require('./routes/prehandler');
const rtoken = require('./routes/renewtoken');
const geo =require('./routes/geo');
const headend = require('./routes/headend');
const channel = require('./routes/channel');
const broadcaster =require('./routes/broadcaster');
const channelsrv=require('./routes/channelsrv');
const package=require('./routes/package');
const vendor=require('./routes/vendor');
const vendordet=require('./routes/vendordet');
const stbm=require('./routes/stbm');
const boxmodel=require('./routes/boxmodel');
const boxtype=require('./routes/boxtype');
const hsn=require('./routes/hsn');
const stock=require('./routes/stock');
const operator=require('./routes/operator');
const subscriber=require('./routes/subscriber');
const role=require('./routes/role');
const account=require('./routes/account');
const packpriceshare=require('./routes/packpriceshare');
const reports=require('./routes/reports');
const operations=require('./routes/operations');
const dashboard=require('./routes/dashboard');



// Routes File Import End
const cors = require('cors');
// const swaggerUi = require('swagger-ui-express');
// var options = { swaggerOptions: { url: 'http://petstore.swagger.io/v2/swagger.json' } }
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, options));

var compress = require('compression');
var helmet = require('helmet');
const bodyParser = require('body-parser');
const IP = '192.168.4.58',port=9091; 
app.use(cors())
app.use(compress());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

app.use(function (req, res, next) {
  console.log(
    '----------Request START----------\n\rSystem IP :', req.ip,
    '\n\rLocal IP :', req.connection.remoteAddress,
    '\n\rreq Origin :', req.url,'\n\rreq Origin Ip :', req.headers.origin,
    '\n\rReq.body :',req.body,
    '\n\r----------Request END----------'
  );
  next();
});
app.use(helmet({frameguard: { action: 'deny' }}));
// API Method Start
app.use('/login',login);
app.use('/renewtoken',rtoken);
app.use('/*',prehandler);
app.use('/geo',geo);
app.use('/headend',headend);
app.use('/channel',channel);
app.use('/broadcaster',broadcaster);
app.use('/srv',channelsrv);
app.use('/package',package);
app.use('/vendors',vendor);
app.use('/vendordet',vendordet);
app.use('/stbm',stbm);
app.use('/boxmodel',boxmodel);
app.use('/boxtype',boxtype);
app.use('/hsn',hsn);
app.use('/stock',stock);
app.use('/operator',operator);
app.use('/subscriber',subscriber);
app.use('/role',role);
app.use('/account',account);
app.use('/packpriceshare',packpriceshare);
app.use('/reports',reports);
app.use('/operations',operations);
app.use('/dashboard',dashboard);
// API Method End

app.listen(port, IP, () => {
    console.log('SMS Server Running... on IP:',IP+':'+port)
  });