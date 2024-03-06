import express from 'express';
import path from 'path';

const app = express();
const PORT = 3000;

// index.htmlを表示する
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname)));

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
