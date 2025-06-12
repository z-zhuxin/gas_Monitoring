const express = require('express');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const db = new sqlite3.Database('./database.db');
const { authenticateToken } = require('./auth');

// 创建新警报
router.post('/', authenticateToken, (req, res) => {
    const { station_id, alert_type, level, message } = req.body;
    
    // 验证输入
    if (!station_id || !alert_type || !level || !message) {
        return res.status(400).json({ error: '缺少必要的警报字段' });
    }

    // 验证警报级别
    const validLevels = ['critical', 'warning', 'normal'];
    if (!validLevels.includes(level)) {
        return res.status(400).json({ error: '无效的警报级别' });
    }

    db.run(
        'INSERT INTO alerts (station_id, alert_type, level, message) VALUES (?, ?, ?, ?)',
        [station_id, alert_type, level, message],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '创建警报失败' });
            }
            res.status(201).json({ 
                message: '警报创建成功',
                alertId: this.lastID 
            });
        }
    );
});

// 获取所有警报
router.get('/', authenticateToken, (req, res) => {
    const { resolved, level } = req.query;
    let query = 'SELECT * FROM alerts';
    const params = [];
    
    // 构建查询条件
    const conditions = [];
    if (resolved !== undefined) {
        conditions.push('resolved = ?');
        params.push(resolved === 'true' ? 1 : 0);
    }
    if (level) {
        conditions.push('level = ?');
        params.push(level);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY timestamp DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '获取警报失败' });
        }
        res.json(rows);
    });
});

// 获取特定警报
router.get('/:id', authenticateToken, (req, res) => {
    const alertId = req.params.id;
    
    db.get(
        'SELECT * FROM alerts WHERE id = ?',
        [alertId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: '获取警报失败' });
            }
            if (!row) {
                return res.status(404).json({ error: '未找到指定的警报' });
            }
            res.json(row);
        }
    );
});

// 更新警报状态
router.put('/:id', authenticateToken, (req, res) => {
    const alertId = req.params.id;
    const { resolved, message } = req.body;
    
    // 验证至少有一个字段要更新
    if (resolved === undefined && !message) {
        return res.status(400).json({ error: '没有提供要更新的字段' });
    }

    // 构建更新语句
    let updateFields = [];
    const params = [];
    
    if (resolved !== undefined) {
        updateFields.push('resolved = ?');
        params.push(resolved ? 1 : 0);
    }
    if (message) {
        updateFields.push('message = ?');
        params.push(message);
    }
    
    params.push(alertId);
    
    db.run(
        `UPDATE alerts SET ${updateFields.join(', ')} WHERE id = ?`,
        params,
        function(err) {
            if (err) {
                return res.status(500).json({ error: '更新警报失败' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '未找到指定的警报' });
            }
            res.json({ message: '警报更新成功' });
        }
    );
});

// 删除警报
router.delete('/:id', authenticateToken, (req, res) => {
    const alertId = req.params.id;
    
    db.run(
        'DELETE FROM alerts WHERE id = ?',
        [alertId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '删除警报失败' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '未找到指定的警报' });
            }
            res.json({ message: '警报删除成功' });
        }
    );
});

module.exports = router;