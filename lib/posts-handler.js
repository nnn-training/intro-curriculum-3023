"use strict";
const pug = require("pug");
const Post = require("./post");
const util = require("./handler-util");

async function handle(req, res) {
  switch (req.method) {
    case "GET":
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });
      const posts = await Post.findAll({ order: [["id", "DESC"]] });
      res.end(pug.renderFile("./views/posts.pug", { posts, user: req.user }));
      console.info(
        `閲覧されました: user: ${req.user}, ` +
          `remoteAddress: ${req.socket.remoteAddress}, ` +
          `userAgent: ${req.headers["user-agent"]} `
      );
      break;
    case "POST":
      let body = "";
      req
        .on("data", (chunk) => {
          body += chunk;
        })
        .on("end", async () => {
          console.log(`post:bodyそのまま:${body}`);
          const params = new URLSearchParams(body);
          console.log(`body返還後${params}`);
          const content = params.get("content");
          console.log(`取得したパラメータからゲットした後${content}`);
          console.info(`送信されました: ${content}`);
          await Post.create({
            content,
            postedBy: req.user,
          });
          handleRedirectPosts(req, res);
        });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    Location: "/posts",
  });
  res.end();
}

function handleDelete(req, res) {
  switch (req.method) {
    case "POST":
      let body = "";
      req
        .on("data", (chunk) => {
          body += chunk;
        })
        .on("end", async () => {
          console.log(`デコード前:${body}`);
          const params = new URLSearchParams(body);
          console.log(`デコード適用後:${params}`);
          const id = params.get("id");
          const post = await Post.findByPk(id);
          if (req.user === post.postedBy) {
            await post.destroy();
            handleRedirectPosts(req, res);
            console.info(`削除されました。投稿id:${id}`);
          }
        });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

module.exports = {
  handle,
  handleDelete,
};
