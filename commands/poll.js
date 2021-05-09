const Discord = require('discord.js');
const sleep = async (seconds) => new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, seconds * 1000); }); /* 一定時間だけ非同期で処理を待つ(単位：秒) */

module.exports = {
    name: 'poll',
    description: '投票を作成するよ',
    async execute(message, args) {
        try {
            const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯'];
            const [time, title, ...choices] = args;

            if (!time || !(time.match(/^([1-9]\d*|0)$/))) { //「timeが存在しない」または「timeが0以上の整数ではない」=>弾く
                return message.channel.send("この投票を受け付ける時間を半角数字で入力してください（単位：分）。0を指定することで制限時間なしになります\n例：``!poll 30 きのこの山とたけのこの里、どっちが好き？ きのこ たけのこ``");
            }
            if (!title) {
                return message.channel.send("この投票について説明を書き込んでください\n例：``!poll 30 きのこの山とたけのこの里、どっちが好き？ きのこ たけのこ``");
            }
            if (choices.length < 2 || choices.length > emojis.length) {
                return message.channel.send(`この投票の選択肢を2個以上${emojis.length}個以下で指定してください\n例：``!poll 30 きのこの山とたけのこの里、どっちが好き？ きのこ たけのこ```);
            }

            const poll_embed = new Discord.MessageEmbed()
                .setTitle(title)
                .setAuthor(message.author.username, message.author.displayAvatarURL()) //投票作成者のアイコンと名前
                .setDescription(choices.map((c, i) => `${emojis[i]} ${c}`).join('\n')) //投票の選択肢
                .setTimestamp();
        
            if (time) {
                if (time == 0) {
                    poll_embed.setFooter('この投票は無期限です');
                } else {
                    if (time > 60) {
                        const hour = Math.floor(time / 60);
                        const minute = time % 60;
                        const minute_fixed = (minute == 0) ? '' : `${minute}分`;
                        poll_embed.setFooter(`この投票は、開始時刻から${hour}時間${minute_fixed}後に締め切られます`);
                    } else {
                        poll_embed.setFooter(`この投票は、開始時刻から${time}分後に締め切られます`);
                    }
                }
            }
            
            const poll = await message.channel.send("投票が開始されました！", poll_embed); //投票開始
            emojis.slice(0, choices.length).forEach(emoji => poll.react(emoji)); //リアクション付与
            if (time == 0) {
                return;
            } else {
                await sleep(time * 60); //指定された時間待つ（期間無制限ならここで早期return）
            }

            const poll_finished = await message.channel.messages.fetch(poll.id); //投票終了
            const poll_results = emojis.slice(0, choices.length).map(emoji => `${emoji}${poll_finished.reactions.cache.get(emoji).count - 1}票`); //投票結果の集計
            poll_embed.addField(":fire:投票結果:fire:", poll_results.join('\n')) //埋め込みメッセージに集計結果を書き込み
                .setFooter("この投票は締め切られました。")
                .setTimestamp();
            poll_finished.edit("", poll_embed); //メッセージを編集して集計結果をDiscord上に反映

        } catch (e) {
            console.log('[poll] ' + e);
            message.channel.send('処理中にエラーが発生しました');
        }
    },
};