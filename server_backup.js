const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 数据库连接
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('数据库连接错误:', err.message);
    } else {
        console.log('成功连接到SQLite数据库');
        initializeDatabase();
    }
});

// 初始化数据库
function initializeDatabase() {
    db.serialize(() => {
        // 创建用户表
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )`);

        // 创建监测数据表
        db.run(`CREATE TABLE IF NOT EXISTS monitoring_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_id INTEGER NOT NULL,
            temperature REAL,
            humidity REAL,
            wind_speed REAL,
            pm25 REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 创建警报表
        db.run(`CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            resolved BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/api/alerts', require('./routes/alerts'));

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('服务器错误!');
});

module.exports = app;