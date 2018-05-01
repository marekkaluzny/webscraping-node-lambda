'use strict';

/**
* This file is used for dataDog reporting. 
* It based on integration between DataDog and CloudWatch logs.
* The only thing which needs to be fullfiled by client code is console log in specified format MONITORING|<unix_epoch_timestamp>|<value>|<metric_type>|<metric_name>|#<tag_list>
* https://docs.datadoghq.com/integrations/amazon_lambda/
*/

module.exports = {
	
	histogram: function(metricName, value) {
		printLog(value, 'histogram', metricName);
	},
	gauge: function(metricName, value) {
		printLog(value, 'gauge', metricName);
	},
	check: function(metricName, value) {
		printLog(value, 'check', metricName);
	}
}

function printLog(value, metricType, metricName) {
    const timestamp = (new Date).getTime();
    console.log('MONITORING|%s|%s|%s|%s|%s', timestamp, value, metricType, metricName, '#env:' + process.env.ENV_TAG || 'test_env');
};