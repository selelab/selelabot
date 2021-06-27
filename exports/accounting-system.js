const Discord = require('discord.js');
const log4js = require('log4js');
const fetch = require('node-fetch');

log4js.configure('./setting/log4js.config.json'); //log4jsの設定の読み込み
const logger = log4js.getLogger();

module.exports = {
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
                .addField('種別', project_type, true)
                .addField('状況', project_status, true)
                .addField('上限額', project_json.sum_budget, true)
                .addField('支出額', project_json.sum_purchase_price, true)
                .addField('未承認額', requested_budget, true)
                .setTimestamp(project_json.date_updated); //最終更新時刻
                
            message.channel.send(project_embed); //送信

        } catch (e) {
            const e_msg = `会計システム参照時にエラーが発生しました`;
            logger.error(e_msg + e);
            message.channel.send(e_msg);
        }
    }
};