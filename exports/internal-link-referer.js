const Discord = require('discord.js');
const log4js = require('log4js');
const path = require('path');

log4js.configure(path.join(__dirname, "../setting/log4js.config.json")); //log4jsの設定の読み込み
const logger = log4js.getLogger();

module.exports = {
    async execute(message) {
        try {
            const discord_link = message.content;
            const discord_link_regex = /([0-9]+)\/([0-9]+)$/;
            const [, target_channel_id, target_message_id] = discord_link.match(discord_link_regex); //貼られたDiscordサーバ内のリンクから、チャンネルidとメッセージidを取り出す
            
            const linked_channel = await message.guild.channels.cache.get(target_channel_id); //チャンネル情報取得
            const linked_message = await linked_channel.messages.fetch(target_message_id, true, true); //被参照メッセージ情報取得
            const linked_message_embed = new Discord.MessageEmbed()
                .setAuthor({
                    name: linked_message.author.username,
                    iconURL: linked_message.author.displayAvatarURL()
                }) //参照先メッセージ投稿者のアイコンと名前
                .setDescription(linked_message.content) //メッセージの内容
                .setFooter({
                    text: await linked_channel.name,
                    iconURL: message.guild.iconURL()
                }) //サーバアイコンとリンク先のチャンネル名
                .setTimestamp(linked_message.createdAt); //リンクされたメッセージの投稿日時

            message.channel.send({embeds: [linked_message_embed]}); //送信

        } catch (e) {
            const e_msg = `リンク参照処理時にエラーが発生しました`;
            logger.error(e_msg + e + 'line' + e.lineNumber);
            message.channel.send(e_msg);
        }
    }
};