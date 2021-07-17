const { two_factor_authentication_secret } = require("../setting/env.json");
const crypto = require("crypto").webcrypto;

const GRANTED_ROLE_NAME = "運営者";
const GRANTED_GUILD_ID = "578894382682341376"; // 「SEL運営」のサーバーID

const create_token = (secret) =>
  new Promise((resolve, _) => {
    const b32 = (s) =>
        [0, 8, 16, 24, 32, 40, 48, 56]
          .map((i) =>
            [0, 1, 2, 3, 4, 5, 6, 7]
              .map((j) => s.charCodeAt(i + j))
              .map((c) => (c < 65 ? c - 24 : c - 65))
          )
          .map((a) => [
            (a[0] << 3) + (a[1] >> 2),
            (a[1] << 6) + (a[2] << 1) + (a[3] >> 4),
            (a[3] << 4) + (a[4] >> 1),
            (a[4] << 7) + (a[5] << 2) + (a[6] >> 3),
            (a[6] << 5) + (a[7] >> 0),
          ])
          .flat(),
      trunc = (dv) => dv.getUint32(dv.getInt8(19) & 0x0f) & 0x7fffffff,
      c = Math.floor(Date.now() / 1000 / 30);
    crypto.subtle
      .importKey(
        "raw",
        new Int8Array(b32(secret)),
        { name: "HMAC", hash: { name: "SHA-1" } },
        true,
        ["sign"]
      )
      .then((k) =>
        crypto.subtle.sign(
          "HMAC",
          k,
          new Int8Array([0, 0, 0, 0, c >> 24, c >> 16, c >> 8, c])
        )
      )
      .then((h) => resolve(("0" + trunc(new DataView(h))).slice(-6)));
  });

const checkIfGranted = (message) =>
  !!message.member.roles.cache.find((r) => r.name == GRANTED_ROLE_NAME);

const checkIfValidGuild = (message) => message.guild.id == GRANTED_GUILD_ID;

module.exports = {
  name: "create_google_auth_token",
  description: "Googleの2段階認証コードを生成します。",
  execute(message, _) {
    const isValidGuild = checkIfValidGuild(message);

    if (!isValidGuild) {
      message.channel.send("このコマンドは「SEL運営」内でしか使えません！");
      return;
    }

    const isGranted = checkIfGranted(message);

    if (!isGranted) {
      message.channel.send("権限がありません！");
      return;
    }

    create_token(two_factor_authentication_secret).then((token) => {
      message.channel.send(`2段階認証コード: ${token}`);
    });
  },
};
