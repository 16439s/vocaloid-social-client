import Koa from 'koa';
import Router from 'koa-router';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import koaBody from 'koa-body';
import koaCookie from 'koa-cookie';
import fs from 'fs/promises';

const app = new Koa();
const router = new Router();
const PORT = 3000;

const appname = "Vocaloid.social Timeline";
const instance = "vocaloid.social";
const callback = "client.164.one";
const permissions = "read:account,write:notes";

app.use(koaCookie());
app.use(koaBody());

// index.htmlを表示する
router.get('/', async (ctx) => {
    ctx.body = await fs.readFile(path.join(__dirname, 'client/index.html'), 'utf-8');
});

router.get('/api/login', async (ctx) => {
    if (ctx.cookies.get('token')) {
        ctx.body = "既にログインされています。<br>3秒後にトップページに戻ります。";
        setTimeout(() => {
            ctx.redirect('https://client.164.one');
        }, 3000);
    } else {
        const uuid = uuidv4();
        const url = `https://${instance}/miauth/${uuid}?name=${appname}&callback=http://${callback}/api/login/callback&permission=${permissions}`;
        ctx.redirect(url);
    }
});

router.get('/api/login/callback', async (ctx) => {
    if (ctx.query.session) {
        const session = ctx.query.session as string;
        const host = ctx.headers.referer;
        const url = `${host}api/miauth/${session}/check`;

        try {
            const { data } = await axios.post(url, {}, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (data.ok && data.token) {
                ctx.cookies.set('token', data.token, { maxAge: 60 * 60 * 24 * 7 * 1000 });
                const userName = data.user.name;
                ctx.body = `<div id='login-message' style='display:none;'>
                            ${userName} にログインしました。<br>5秒後にトップページに戻ります。
                        </div>
                        <script>
                            setTimeout(() => {
                                location.href = '/';
                            }, 5000);
                        </script>`;
            } else {
                ctx.redirect('/api/login');
            }
        } catch (error) {
            ctx.redirect('/api/login');
        }
    } else {
        ctx.redirect('/api/login');
    }
});

// ログアウトのエンドポイント
router.get('/api/logout', async (ctx) => {
    // tokenクッキーを削除
    ctx.cookies.set('token', null);
    
    // ログアウトメッセージを表示
    ctx.body = `
        <div id='logout-message' class='centered-message' style='display:none;'>
            ログアウトしました。<br>5秒後にトップページに戻ります。
        </div>
        <meta http-equiv="Refresh" content="5; url=https://client.164.one">
    `;
});

router.get('/api/proxy', async (ctx) => {
    const imageUrl: string | string[] | undefined = ctx.query.url as string;
  
    if (!imageUrl) {
      ctx.status = 400;
      ctx.body = { error: 'Image URL is required' };
      return;
    }
  
    try {
      // 画像のコンテンツタイプを取得
      const response = await axios.head(imageUrl);
      const contentType = response.headers['content-type'];
  
      // 画像データを直接送信
      ctx.set('Content-Type', contentType);
      const imageStream = await axios.get(imageUrl, { responseType: 'stream' });
      ctx.body = imageStream.data;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: 'Failed to fetch or proxy image' };
    }
  });

  router.get('/api/checktoken', async (ctx) => {
    const token = ctx.cookies.get('token');

    // トークンが存在するかどうかを確認し、ログイン状態を返す
    if (token) {
        ctx.body = { loggedIn: true };
    } else {
        ctx.body = { loggedIn: false };
    }
});

// ルーターをKoaアプリケーションに適用
app.use(router.routes()).use(router.allowedMethods());

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
