const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = 3001;
const PYTHON_API = 'http://localhost:8000';

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Mock user data
const users = [
    {
        id: '1',
        username: 'admin@example.com',
        password: 'admin',
        name: 'Administrator',
        email: 'admin@example.com',
        role: 'admin'
    }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend server is running' });
});

// Login endpoint (FastAPI OAuth2 compatible)
app.post('/api/auth/login', (req, res) => {
    console.log('[Backend] Login request received');
    console.log('[Backend] Content-Type:', req.headers['content-type']);
    console.log('[Backend] Body:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            detail: 'Username and password are required'
        });
    }

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({
            detail: 'Incorrect username or password'
        });
    }

    // Generate mock tokens
    const access_token = `mock_access_token_${user.id}_${Date.now()}`;
    const refresh_token = `mock_refresh_token_${user.id}_${Date.now()}`;

    console.log('[Backend] Login successful for user:', username);

    res.json({
        access_token,
        refresh_token,
        token_type: 'bearer'
    });
});

// Verify token endpoint
app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ detail: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    if (token.startsWith('mock_access_token_')) {
        return res.json({ valid: true });
    }

    return res.status(401).json({ detail: 'Invalid token' });
});

// User profile endpoint
app.get('/api/user/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ detail: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    if (token.startsWith('mock_access_token_')) {
        // Extract user id from token
        const parts = token.split('_');
        const userId = parts[3];
        const user = users.find(u => u.id === userId);

        if (user) {
            return res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            });
        }
    }

    return res.status(401).json({ detail: 'Invalid token' });
});

// Proxy CRUD paths to Python FastAPI backend (port 8000)
function createCrudProxy(pathPrefix) {
    return (req, res) => {
        const opts = {
            hostname: '127.0.0.1',
            port: 8000,
            path: pathPrefix + (req.url || ''),
            method: req.method,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'Authorization': req.headers['authorization'] || ''
            }
        };
        const body = req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined
            ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
            : null;
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
        const proxyReq = http.request(opts, (proxyRes) => {
            res.status(proxyRes.statusCode);
            Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            console.error('[Backend] Proxy error for ' + pathPrefix + ':', err.message);
            res.status(502).json({ detail: 'Service unavailable. Start Python backend: cd backend && python -m uvicorn main:app --reload --port 8000' });
        });
        if (body) proxyReq.write(body);
        proxyReq.end();
    };
}
const cron = require('node-cron');
const axios = require('axios');
const { sendEmailNotification } = require('./mailService');

// ... (other parts of the file)

// Proxy CRUD paths to Python FastAPI backend (port 8000)
// ...

['/itp', '/ncr', '/noi', '/itr', '/pqp', '/obs', '/contractors', '/settings', '/followup'].forEach(p => app.use('/api' + p, createCrudProxy('/api' + p)));

/**
 * 自動提醒邏輯：檢查 3 天後到期的案件
 */
async function checkAndSendReminders() {
    console.log('[Cron] Checking for upcoming due dates (3 days ahead)...');
    try {
        // Calculate target date (Today + 3 days)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        console.log(`[Cron] Target date: ${targetDateStr}`);

        // 1. Fetch NCRs
        const ncrsResp = await axios.get(`${PYTHON_API}/api/ncr/`);
        const openNcrs = ncrsResp.data.filter(n =>
            n.status !== 'Closed' && n.status !== '結案' && n.dueDate === targetDateStr
        );

        // 2. Fetch FollowUp Issues
        const followupsResp = await axios.get(`${PYTHON_API}/api/followup/`);
        const openFollowups = followupsResp.data.filter(f =>
            f.status !== 'Closed' && f.status !== '結案' && f.dueDate === targetDateStr
        );

        // 3. Process NCR Reminders
        for (const ncr of openNcrs) {
            // Find contractor email
            const contractorsResp = await axios.get(`${PYTHON_API}/api/contractors/`);
            const contractor = contractorsResp.data.find(c => c.name === ncr.vendor);
            const email = contractor ? contractor.email : 'admin@example.com';

            await sendEmailNotification(email, `NCR: ${ncr.documentNumber}`, 'NCR', ncr.dueDate);
        }

        // 4. Process FollowUp Reminders
        for (const f of openFollowups) {
            // Priority: Check if vendor email exists, otherwise assignedTo or admin
            let email = 'admin@example.com';
            if (f.vendor) {
                const contractorsResp = await axios.get(`${PYTHON_API}/api/contractors/`);
                const contractor = contractorsResp.data.find(c => c.name === f.vendor);
                if (contractor) email = contractor.email;
            }

            await sendEmailNotification(email, `Follow-up Issue: ${f.issueNo} - ${f.title}`, 'Follow-up Issue', f.dueDate);
        }

        console.log(`[Cron] Reminders process finished. Sent ${openNcrs.length + openFollowups.data?.length || 0} notifications.`);
    } catch (error) {
        console.error('[Cron] Error during reminder process:', error.message);
    }
}

// 排程任務：每天早上 08:00 執行
cron.schedule('0 8 * * *', () => {
    checkAndSendReminders();
});

// 手動觸發提醒測試端點
app.post('/api/remind/test', async (req, res) => {
    console.log('[Backend] Manual reminder test triggered');
    await checkAndSendReminders();
    res.json({ message: 'Reminder check triggered. Check server console for logs.' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Reminder test endpoint: http://localhost:${PORT}/api/remind/test (POST)`);
});
