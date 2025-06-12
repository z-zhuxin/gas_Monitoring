const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const db = new sqlite3.Database('./database.db');

// 注册新用户
router.post('/register', async (req, res) => {
    try {
        const { username, password, role = 'user' } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 检查用户是否已存在
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }
            if (row) {
                return res.status(400).json({ error: '用户名已存在' });
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10);

            // 创建新用户
            db.run(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username, hashedPassword, role],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: '创建用户失败' });
                    }
                    res.status(201).json({ message: '用户注册成功', userId: this.lastID });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户登录
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: '数据库错误' });
        }
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成JWT令牌
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        res.json({ 
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    });
});

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// JWT认证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: '无效的认证令牌' });
        }
        req.user = user;
        next();
    });
}

module.exports = {
    router,
    authenticateToken
};