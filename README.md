# selelabot

## これはなに

エレラボDiscordサーバ用Botのソースコード

### 現在の機能

- サーバ新規参加者への対話式役職付与
- サーバ脱退者の報告

### ロードマップ

- 新規作成されたテキストチャンネルの「チャンネルの管理」権限を自動で設定し、削除プロテクトを掛ける
- リアクションによる投票作成コマンドの実装
- 新年度移行時の学年役職自動更新

その他、需要と要望に応じて新機能を随時追加予定

## 必要なもの

- Node.js (v15.14.0以上)
- yarn (v1.22.10以上)

## 環境構築

```
$ git clone https://github.com/selelab/selelabot
$ cd selelabot
$ yarn
```

## 実行方法

```
$ node index.js
```
