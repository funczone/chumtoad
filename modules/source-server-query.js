/**
 * this is some weird frankenstein copy of a source server query script i found online.
 * it implements some features that didn't exist in the original, such as utf8 entity parsing and making multiple queries after closing. but do not be confused: this thing sucks
 * https://github.com/dsyomichev/source-server-query/ < use the official one please god
 */
const bp = require("bufferpack");
const jsp = require("jspack").jspack;
const utf8 = require("utf8");

const dgram = require("dgram");
let client = dgram.createSocket("udp4");

// helper function that detects if the socket is closed
// (for some reason you cant query after closure of the socket. so this checks if its close and if it is, create a new socket)
const isClosed = () => {
  let sym = Reflect.ownKeys(client).find(key => key.toString() === "Symbol(state symbol)");
  return client[sym].handle === null;
}

const send = (request, remote, timeout) => {
  return new Promise((resolve, reject) => {
    if(isClosed()) {
      client = dgram.createSocket("udp4"); // bad idea? surely not.
    }

    const onTimeout = setTimeout(() => {
      client.removeListener("message", onResponse);
      return reject(new Error("Request timeout out."));
    }, timeout);

    const onResponse = (response, rinfo) => {
      if (rinfo.address != rinfo.address || rinfo.port != rinfo.port) return;

      client.removeListener("message", onResponse);
      clearTimeout(onTimeout);
      return resolve(response);
    };

    client.on("message", onResponse);
    client.send(request, remote.port, remote.address);
  });
};

const challenge = async (remote, format, payload, timeout) => {
  let request = bp.pack(format, payload);
  const response = await send(request, remote, timeout);

  if (bp.unpack("<s", response, 4)[0] === "A") {
    payload[payload.length - 1] = bp.unpack("<I", response, 5)[0];
    return await send(bp.pack(format, payload), remote, timeout);
  } else return response;
};

module.exports.info = async (address, port, timeout = 1000) => {
  const query = await challenge({ address, port }, "<isSI", [-1, "T", "Source Engine Query", -1], timeout);

  const format = `<
    B(protocol)
    S(name)
    S(map)
    S(folder)
    S(game)
    h(id)
    B(players)
    B(maxplayers)
    B(bots)
    c(servertype)
    c(environment)
    B(visibility)
    B(vac)
    S(version)`;

  const info = bp.unpack(format, query.slice(5));
  const extra = query.slice(bp.calcLength(format, Object.values(info)) + 5);

  if (extra.length >= 1) {
    let offset = 1;
    const edf = bp.unpack("<B", extra)[0];

    if (edf & 0x80) {
      info.port = bp.unpack("<h", extra, offset)[0];
      offset += 2;
    }

    if (edf & 0x10) {
      info.steamid = jsp.Unpack("<Q", extra, offset)[0];
      offset += 8;
    }

    if (edf & 0x40) {
      const tvinfo = bp.unpack("<hS", extra, offset);
      info.tvport = tvinfo[0];
      info.tvname = utf8.decode(tvinfo[1]);
      offset += bp.calcLength("<hS", tvinfo);
    }

    if (edf & 0x20) {
      info.keywords = bp.unpack("<S", extra, offset)[0].split(",");
      offset += bp.calcLength("<S", info.keywords);
    }

    if (edf & 0x01) {
      info.gameid = jsp.Unpack("<Q", extra, offset)[0];
      offset += 4;
    }
  }

  for(const key in info) {
    if(typeof info[key] === "string") {
      info[key] = utf8.decode(info[key]);
    }
  }
  return info;
};

module.exports.players = async (address, port, timeout = 1000) => {
  const response = await challenge({ address, port }, "<isI", [-1, "U", -1], timeout);

  const count = bp.unpack("<B", response, 5)[0];
  let offset = 6;

  const players = [];
  const format = "<b(index)S(name)i(score)f(duration)";

  for (let i = 0; i < count; i++) {
    const player = bp.unpack(format, response, offset);
    offset += bp.calcLength(format, Object.values(player));

    player.name = utf8.decode(player.name);
    players.push(player);
  }

  return players;
};

module.exports.rules = async (address, port, timeout = 1000) => {
  const response = await challenge({ address, port }, "<isI", [-1, "V", -1], timeout);

  const count = bp.unpack("<h", response, 5)[0];
  let offset = 7;

  const rules = [];
  const format = "<S(name)S(value)";

  for (let i = 0; i < count; i++) {
    const rule = bp.unpack(format, response, offset);

    offset += bp.calcLength(format, Object.values(rule));
    rules.push(rule);
  }

  return rules;
};

module.exports.close = () => client.close();
