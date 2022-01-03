'use strict';
const pug = require('pug');
//cookiesモジュールはcookieをヘッダに書き込む時に簡単なAPIでcookieを利用できるライブラリ
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');
//tracking_idという名前の、後にcookieのkeyとなるものを変数定義
const trackingIdkey = 'tracking_id';

//(/postにリクエストがあった時の)メソッドによって処理を振り分ける関数
function handle(req, res) {
  //リクエストがあればcookiesオブジェクトを作成してレスポンスで返し、それをaddTcackingCookie関数に渡す
  const cookies = new Cookies(req, res);
  addTrackingCookie(cookies);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      //findAll 関数の引数に {order:[['id', 'DESC']]} というオブジェクトを渡すことで、連番で作成した ID の降順にソートされた情報が取得されます
      Post.findAll({order:[['id', 'DESC']]}).then((posts) => {
        res.end(pug.renderFile('./views/posts.pug', { posts }));
        //テンプレートリテラルでユーザー名とトラッキングIDとユーザーのリモートアドレスをログに出力
        console.info(
          `閲覧されました:
          user: ${req.user},
          trackingId: ${cookies.get(trackingIdkey)},
          remoteAddress: ${req.socket.remoteAddress},
          userAgent: ${req.headers['user-agent']}`
        );
      });
      break;
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const params = new URLSearchParams(body);
        const content = params.get('content');
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: cookies.get(trackingIdkey),
          postedBy: req.user
        }).then(() => {
          handleRedirectPosts(req, res);
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function addTrackingCookie(cookies){
  //作成されたcookiesオブジェクトにトラッキングクッキーIDがなければ、ランダムな小数値にNumber.MAX_SAFE_INTEGER（JavaScriptで正確に扱える最大整数値）を掛けて小数点以下を切り捨てたものをtrackingIdとして定義
  if(!cookies.get(trackingIdkey)){
    const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    //new Date()内の Date.now()でミリ秒を取得し、その値に24時間分のミリ秒を追加して、new Date()でDateオブジェクトを作成（Dockerで設定している日本標準時で曜日、年月日、時刻は秒まで）してtomorrow変数に格納し、クッキーの設定（名前、ランダムな数から作られたID、有効期限）をする
    const tomorrow = new Date(Date.now() + (1000*60*60*24));
    cookies.set(trackingIdkey, trackingId, {expires: tomorrow});
  }
}
function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle
};