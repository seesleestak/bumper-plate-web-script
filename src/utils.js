module.exports = function (...args) {
  console.log(new Date().toUTCString(), "|", ...args);
};
