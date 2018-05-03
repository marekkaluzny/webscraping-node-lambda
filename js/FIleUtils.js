'use strict';
const fileType = require("file-type");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const sha1 = require("sha1");


module.exports = {
    getS3PayloadForBuffer: function(bucketName, buffer) {
        const fileMime = fileType(buffer);
    
        if (fileMime === null) { throw "Unable to retrieve MIME type from buffer"; }
    
       let fileExtension = fileMime.ext;
       let hash = sha1(new Buffer(new Date().toString()));
       let now = (new Date).getTime();
    
       let filePath = hash + '/';
       let fileName = now + '.' + fileExtension;
       let fileFullName = filePath + fileName;
       let fileFullPath = bucketName + fileFullName;
    
       let params = {
           Bucket: bucketName,
           Key: fileName,
           Body: buffer
       };

       let uploadFile = {
           size: buffer.toString('ascii').length,
           type: fileMime.mime,
           name: fileName,
           full_path: fileFullPath
       };
    
       return {
           'params': params,
           'uploadFile': uploadFile
       }
    },
    uploadToS3: function(buffer, bucketName, callback) {
        let payload = this.getS3PayloadForBuffer(bucketName, buffer);
        let params = payload.params;        

        //consider to call callback instead of this crap
        s3.putObject(params, function(err, data) {
            if (err) {
                throw "FileUtils: " + err;
            }

            console.log('File URL', payload.full_path);
        });
    }
};
