const Discord = require('discord.js');
const log4js = require('log4js');
const fetch = require('node-fetch');
const fs = require('fs');

log4js.configure('./setting/log4js.config.json'); //log4jsの設定の読み込み
const logger = log4js.getLogger();

const server_setting = require('../setting/selelab.json'); //各サーバ固有の設定の読み込み
const config = require('../setting/env.json'); //ログイン情報類の読み込み
const { accounting_system_token } = config;

module.exports = {
    /* 会計システム内のプロジェクトURLがDiscordに貼られたら、プロジェクトの情報を取得してDiscordに自動展開する */
    async execute(message, accounting_system_token) {
        try {
            const uuid_regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/; // ref: https://www.setouchino.cloud/blogs/107
            const [project_uuid] = message.content.match(uuid_regex);
                
            const response = await fetch(`https://selelab.com/api/admin/v1/projects/${project_uuid}`,
                {
                    method: 'GET',
                    headers: { 'Authorization': accounting_system_token }
                }
            );
            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText} ${await response.text()}`);
            }
            const project_json = await response.json();

            const project_embed = module.exports.project_expand(project_json); //プロジェクトの情報をEmbedに展開
                
            message.channel.send(project_embed); //Embedを送信

        } catch (e) {
            const e_msg = `会計システム参照時にエラーが発生しました`;
            logger.error(e_msg + e);
            message.channel.send(e_msg);
        }
    },

    /* 会計システムへ定期的にアクセスし、新しく作られているプロジェクトを発見したらDiscordに通知する */
    async project_creation_notifier(client, accounting_system_token, guild_id) {
        const project_uuid_prev = fs.readFileSync('../setting/project_uuid_history.txt', 'utf8');

        const response = await fetch('https://selelab.com/api/admin/v1/projects/',
            {
                method: 'GET',
                headers: { 'Authorization': accounting_system_token }
            }
        );
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText} ${await response.text()}`);
        }
        const project_json = await response.json();

        const project_uuid_latest = project_json[0].id;

        if (project_uuid_latest != project_uuid_prev) {
            const notice_channel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === server_setting.CHANNEL.PROJECT_NOTICE); //プロジェクト申請場チャンネルの情報を取得
            const created_project_embed = module.exports.project_expand(project_json); //取得したプロジェクトの情報をEmbedに展開
            notice_channel.send(created_project_embed); //Embedを送信

            fs.writeFile('../setting/project_uuid_history.txt', project_uuid_latest, (err) => {
                if (err) {
                    logger.error('[project_creation_notifier] ファイル書き込み時にエラーが発生しました' + err);
                    return;
                }
                logger.info('[project_creation_notifier] 正常に書き込みが完了しました');
            });

        }
    },

    // JSONで渡されたプロジェクトの情報を展開し、DiscordのEmbed形式にして返す
    project_expand(project_json) {
        const project_leader = project_json.leader.display_name;
        const project_title = project_json.title;
        const project_description = project_json.description;
        const project_type = (project_json.accounting_type == "soft") ? "ソフトウェア" : "ハードウェア";
        const project_status = (project_json.closed === true) ? "完了" : "進行中";
        const project_approval = (project_json.approvals[0].approved === true) ? "承認済み" : "未承認";
        const requested_budget = (project_approval == "未承認") ? project_json.sum_req_budget : "N/A";

        const project_embed = new Discord.MessageEmbed()
            .setTitle(project_title) //プロジェクト名
            .addField('概要', project_description) // プロジェクト概要
            .addField('予算承認状況', project_approval)
            .addField('リーダー', project_leader, true) //プロジェクトリーダー
            .addField('区分', project_type, true)
            .addField('状況', project_status, true)
            .addField('上限額', project_json.sum_budget, true)
            .addField('支出済み金額', project_json.sum_purchase_price, true)
            .addField('未承認金額', requested_budget, true)
            .setTimestamp(project_json.date_updated); //最終更新時刻
        
        return project_embed;
    }
};