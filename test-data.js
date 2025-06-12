const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, 'database.db');

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接错误:', err.message);
        process.exit(1);
    }
    console.log('成功连接到SQLite数据库');
    
    // 初始化数据库
    initializeDatabase();
});

// 初始化数据库
async function initializeDatabase() {
    try {
        // 删除现有表（如果存在）
        await runQuery(`DROP TABLE IF EXISTS users`);
        await runQuery(`DROP TABLE IF EXISTS monitoring_data`);
        await runQuery(`DROP TABLE IF EXISTS alerts`);
        
        // 创建表
        await runQuery(`CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )`);
        
        await runQuery(`CREATE TABLE monitoring_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_id INTEGER NOT NULL,
            temperature REAL,
            humidity REAL,
            wind_speed REAL,
            pm25 REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        await runQuery(`CREATE TABLE alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            resolved BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // 添加测试用户
        await addUser('admin', 'admin123', 'admin');
        await addUser('operator', 'operator123', 'operator');
        await addUser('user', 'user123', 'user');
        
        // 添加监测数据
        await addMonitoringData();
        
        // 添加警报数据
        await addAlerts();
        
        console.log('测试数据初始化完成');
    } catch (error) {
        console.error('初始化数据库时出错:', error);
    } finally {
        db.close();
    }
}

// 执行SQL查询
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

// 添加用户
async function addUser(username, password, role = 'user') {
    const hashedPassword = await bcrypt.hash(password, 10);
    await runQuery(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
    );
    console.log(`用户 ${username} 添加成功`);
}

// 添加监测数据
async function addMonitoringData() {
    const stations = [101, 102, 103, 104, 105];
    const now = new Date();
    
    for (let stationId of stations) {
        // 添加24小时数据
        for (let i = 0; i < 24; i++) {
            const hoursAgo = 24 - i;
            const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
            
            // 随机生成数据
            const temperature = 20 + Math.random() * 15; // 20-35°C
            const humidity = 30 + Math.random() * 50; // 30-80%
            const windSpeed = 1 + Math.random() * 10; // 1-11 m/s
            const pm25 = 10 + Math.random() * 90; // 10-100 µg/m³
            
            await runQuery(
                `INSERT INTO monitoring_data (station_id, temperature, humidity, wind_speed, pm25, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [stationId, temperature, humidity, wind_speed, pm25, timestamp]
            );
        }
        console.log(`站点 ${stationId} 的监测数据添加成功`);
    }
}

// 添加警报
async function addAlerts() {
    const alerts = [
        { station_id: 101, alert_type: 'PM2.5超标', level: 'critical', message: 'PM2.5浓度达到严重污染水平' },
        { station_id: 102, alert_type: '高温预警', level: 'warning', message: '温度超过35°C' },
        { station_id: 103, alert_type: '高湿度', level: 'normal', message: '湿度超过80%' },
        { station_id: 104, alert_type: '大风警报', level: 'warning', message: '风速超过10m/s' },
        { station_id: 105, alert_type: '设备故障', level: 'critical', message: '传感器数据异常' },
    ];
    
    for (let alert of alerts) {
        await runQuery(
            'INSERT INTO alerts (station_id, alert_type, level, message) VALUES (?, ?, ?, ?)',
            [alert.station_id, alert.alert_type, alert.level, alert.message]
        );
    }
    console.log('警报数据添加成功');
}