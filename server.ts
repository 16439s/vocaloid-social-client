import express, { Request, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;

const appname = "Vocaloid.social Timeline";
const instance = "vocaloid.social";
const callback = "client.164.one";
const permissions = "read:account,write:notes";

// index.htmlを表示する
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

app.get('/api/login', (req: Request, res: Response) => {
    if (req.cookies.token) {
        res.send("既にログインされています。<br>3秒後にトップページに戻ります。");
        setTimeout(() => {
            res.redirect('/');
        }, 3000);
    } else {
        const uuid = uuidv4();
        const url = `https://${instance}/miauth/${uuid}?name=${appname}&callback=https://${callback}/callback.php&permission=${permissions}`;
        res.redirect(url);
    }
});

app.get('/api/login/callback', async (req: Request, res: Response) => {
    if (req.query.session) {
        const session = req.query.session as string;
        const host = req.get('referer');
        const url = `${host}/api/miauth/${session}/check`;

        try {
            const { data } = await axios.post(url, {}, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (data.ok && data.token) {
                res.cookie('token', data.token, { maxAge: 60 * 60 * 24 * 7 * 1000 });
                const userName = data.user.name;
                res.send(`<div id='login-message' style='display:none;'>
                            ${userName} にログインしました。<br>5秒後にトップページに戻ります。
                        </div>
                        <script>
                            setTimeout(() => {
                                location.href = '/';
                            }, 5000);
                        </script>`);
            } else {
                res.redirect('/api/login');
            }
        } catch (error) {
            res.redirect('/api/login');
        }
    } else {
        res.redirect('/api/login');
    }
});

// Cookieを解析するためのmiddlewareを設定
app.use(cookieParser());

// ログアウトのエンドポイント
app.get('/api/logout', (req, res) => {
    // tokenクッキーを削除
    res.clearCookie('token');
    
    // ログアウトメッセージを表示
    res.send(`
        <div id='logout-message' class='centered-message' style='display:none;'>
            ログアウトしました。<br>5秒後にトップページに戻ります。
        </div>
        <meta http-equiv="Refresh" content="5; url=https://client.164.one">
    `);
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname)));

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
