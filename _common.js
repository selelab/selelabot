const Discord = require('discord.js');
const log4js = require('log4js');
const fs = require('fs');

const config = require('./setting/env.json'); //ログイン情報類の読み込み
const server_setting = require('./setting/selelab.json'); //各サーバ固有の設定の読み込み

const auto_role_adder = require('./exports/autorole.js'); //役職自動付与プロトコル用のコード

/* 一定時間だけ非同期で処理を待つ(単位：秒) */
const sleep = async (seconds) => new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, seconds * 1000); });

module.exports = {
    Discord: Discord,
    log4js: log4js,
    fs: fs,

    config: config,
    server_setting: server_setting,
    auto_role_adder: auto_role_adder,

    sleep: sleep
};