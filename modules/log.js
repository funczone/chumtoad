const chalk = require("chalk");

// Label names
const labels = {
  0: "fatal",
  1: "error",
  2: " warn",
  3: " info",
  4: "debug",
  5: "trace",
};

// Label styles
const styles = {
  0: chalk.bgRed.black,
  1: chalk.red,
  2: chalk.yellow,
  3: chalk.white.bold,
  4: chalk.green,
  5: chalk.gray,
};

// If you would prefer accurate stack tracing when using
// debuggers like visual studio code's over having timestamps,
// you can switch by swapping which approach is commented out

// Wrapper function approach

const { DateTime } = require("luxon");
const timestamp = "HH:mm:ss.SSS";
const print = function(level, ...args) {
  const prefix = `${chalk.gray(DateTime.now().toFormat(timestamp))} ${styles[level](labels[level])}`;
  return level > 1 ? console.log(prefix, ...args) : console.error(prefix, ...args);
};
module.exports = (...args) => print(3, ...args);
module.exports.trace = (...args) => print(5, ...args);
module.exports.debug = (...args) => print(4, ...args);
module.exports.info = (...args) => print(3, ...args);
module.exports.warn = (...args) => print(2, ...args);
module.exports.error = (...args) => print(1, ...args);
module.exports.fatal = (...args) => print(0, ...args);
module.exports.timestamp = timestamp;

// Bind approach (no timestamps)
/*
const prefix = (id) => styles[id](labels[id]);
module.exports = console.log.bind(console, prefix(3));
module.exports.trace = console.log.bind(console, prefix(5));
module.exports.debug = console.log.bind(console, prefix(4));
module.exports.info = console.log.bind(console, prefix(3));
module.exports.warn = console.log.bind(console, prefix(2));
module.exports.error = console.error.bind(console, prefix(1));
module.exports.fatal = console.error.bind(console, prefix(0));
*/
