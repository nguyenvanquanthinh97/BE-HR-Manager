const { get } = require('lodash');
const { uploader } = require('../config/cloudinaryConfig');

module.exports.uploadToCloudinary = (image) => {
  return new Promise((resolve, reject) => {
    uploader.upload(image, (err, url) => {
      if (err) return reject(err);
      return resolve(get(url, 'url'));
    });
  });
};

module.exports.uploadFileToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    uploader.upload(file,
      { resource_type: "raw" },
      (err, url) => {
        if (err) return reject(err);
        return resolve(get(url, 'url'));
      }
    );
  });
};

module.exports.deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    uploader.destroy(publicId, (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    });
  });
};