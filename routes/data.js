const express = require('express');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const db = new sqlite3.Database('./database.db');
const { authenticateToken } = require('./auth');

// 添加监测数据
router.post('/', authenticateToken, (req, res) => {
    const { station_id, temperature, humidity, wind_speed, pm25 } = req.body;
    
    if (!station_id) {
        return res.status(400).json({ error: '监测站点ID不能为空' });
    }

    db.run(
        'INSERT INTO monitoring_data (station_id, temperature, humidity, wind_speed, pm25) VALUES (?, ?, ?, ?, ?)',
        [station_id, temperature, humidity, wind_speed, pm25],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '添加监测数据失败' });
            }
            res.status(201).json({ 
                message: '监测数据添加成功',
                dataId: this.lastID 
            });
        }
    );
});

// 获取所有监测数据
router.get('/', authenticateToken, (req, res) => {
    db.all('SELECT * FROM monitoring_data ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '获取监测数据失败' });
        }
        res.json(rows);
    });
});

// 获取特定站点的监测数据
router.get('/station/:id', authenticateToken, (req, res) => {
    const stationId = req.params.id;
    
    db.all(
        'SELECT * FROM monitoring_data WHERE station_id = ? ORDER BY timestamp DESC',
        [stationId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: '获取监测数据失败' });
            }
            res.json(rows);
        }
    );
});

// 获取最新监测数据
router.get('/latest', authenticateToken, (req, res) => {
    db.all(
        `SELECT m.* 
         FROM monitoring_data m
         INNER JOIN (
             SELECT station_id, MAX(timestamp) as max_timestamp
             FROM monitoring_data
             GROUP BY station_id
         ) latest ON m.station_id = latest.station_id AND m.timestamp = latest.max_timestamp`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: '获取最新监测数据失败' });
            }
            res.json(rows);
        }
    );
});

// 更新监测数据
router.put('/:id', authenticateToken, (req, res) => {
    const dataId = req.params.id;
    const { temperature, humidity, wind_speed, pm25 } = req.body;
    
    db.run(
        `UPDATE monitoring_data 
         SET temperature = ?, humidity = ?, wind_speed = ?, pm25 = ?
         WHERE id = ?`,
        [temperature, humidity, wind_speed, pm25, dataId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '更新监测数据失败' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '未找到指定的监测数据' });
            }
            res.json({ message: '监测数据更新成功' });
        }
    );
});

// 删除监测数据
router.delete('/:id', authenticateToken, (req, res) => {
    const dataId = req.params.id;
    
    db.run(
        'DELETE FROM monitoring_data WHERE id = ?',
        [dataId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '删除监测数据失败' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: '未找到指定的监测数据' });
            }
            res.json({ message: '监测数据删除成功' });
        }
    );
});

module.exports = router;