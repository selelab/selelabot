const { MessageEmbed } = require("discord.js");
const log4js = require("log4js");
const fetch = require("node-fetch");
const path = require('path');

const { accounting_system_token, selelab } = require("../setting/env.json");
log4js.configure(path.join(__dirname, "../setting/log4js.config.json")); //log4jsの設定の読み込み
const logger = log4js.getLogger();

const send_project_info = async (project_uuid, channel, comment) => {
    try {
        const response = await fetch(
            `${selelab.scheme}://${selelab.host}/api/admin/v1/projects/${project_uuid}`,
            {
                method: "GET",
                headers: { Authorization: accounting_system_token },
            }
        );
        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText} ${await response.text()}`
            );
        }
        const project_json = await response.json();

        const project_leader = project_json.leader.display_name;
        const project_title = project_json.title;
        const project_description = project_json.description;
        const project_type = (project_json.accounting_type == "soft") ? "ソフトウェア" : "ハードウェア";
        const project_status = (project_json.closed === true) ? "完了" : "進行中";

        const get_project_approval = (approvals) => {
            if (approvals.length == 0) {
                return "未申請";
            }

            return approvals.every((approval) => approval.approved === true) ? "承認済み" : "未承認";
        };

        const project_approval = get_project_approval(project_json.approvals);
        const requested_budget = (project_approval == "未承認") ? String(project_json.sum_req_budget) : "N/A";

        const project_embed = new MessageEmbed()
            .setTitle(project_title) //プロジェクト名
            .setURL(`${selelab.scheme}://${selelab.host}/admin/projects/${project_uuid}`) //プロジェクトURL
            .addFields([
                {name: "概要", value: project_description}, // プロジェクト概要
                {name: "予算承認状況", value: project_approval},
                {name: "リーダー", value: project_leader, inline: true}, //プロジェクトリーダー
                {name: "種別", value: project_type, inline: true},
                {name: "状況", value: project_status, inline: true},
                {name: "上限額", value: String(project_json.sum_budget), inline: true},
                {name: "支出額", value: String(project_json.sum_purchase_price), inline: true},
                {name: "未承認額", value: requested_budget, inline: true}
            ])
            .setTimestamp(project_json.date_updated); //最終更新時刻

        if (comment) {
            channel.send({contents: comment, embeds: [project_embed]});
        } else {
            channel.send({embeds: [project_embed]});
        }
    } catch (e) {
        const e_msg = `会計システム参照時にエラーが発生しました:`;
        logger.error(`${e_msg}:${e}`);
        channel.send(`${e_msg}:${e}`);
    }
};

module.exports = {
    send_project_info,
    async execute(message) {
        const uuid_regex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/; // ref: https://www.setouchino.cloud/blogs/107
        const [project_uuid] = message.content.match(uuid_regex);

        await send_project_info(project_uuid, message.channel);
    },
};
