const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 创建Express应用
const app = express();

// 配置中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 配置JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 数据库文件路径
const dbPath = path.join(__dirname, 'database.db');

// 检查数据库文件是否存在，如果不存在则创建
if (!fs.existsSync(dbPath)) {
    console.log('数据库文件不存在，将创建新数据库');
    fs.writeFileSync(dbPath, '');
}

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接错误:', err.message);
        process.exit(1);
    }
    console.log('成功连接到SQLite数据库');
    
    // 初始化数据库表
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )`, (err) => {
            if (err) {
                console.error('创建users表失败:', err.message);
                return;
            }
            console.log('users表已创建或已存在');
            
            // 检查并添加初始管理员账户
            db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
                if (err) {
                    console.error('查询admin用户失败:', err.message);
                    return;
                }
                if (!row) {
                    const hashedPassword = bcrypt.hashSync('admin123', 10);
                    db.run(
                        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                        ['admin', hashedPassword, 'admin'],
                        function(err) {
                            if (err) {
                                console.error('添加admin用户失败:', err.message);
                                return;
                            }
                            console.log('初始管理员账户已创建');
                        }
                    );
                }
            });
        });
    });
});

// 导入路由
const authRouter = require('./routes/auth');
const dataRouter = require('./routes/data');
const alertsRouter = require('./routes/alerts');

// 挂载路由
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

// 使用路由中间件
app.use('/api/auth', authRoutes.router || authRoutes);
app.use('/api/data', dataRoutes.router || dataRoutes);
app.use('/api/alerts', alertsRouter);

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 登录页路由
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 注册页路由
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '未找到该资源' });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 导出app用于测试
module.exports = app;