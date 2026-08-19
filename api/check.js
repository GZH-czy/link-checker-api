// api/check.js
export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const targetUrl = decodeURIComponent(url);
  
  try {
    const startTime = Date.now();
    
    // 改用 GET 请求，只获取前 1KB 数据（减少带宽）
    const response = await fetch(targetUrl, {
      method: 'GET',  // 改为 GET
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)',
        'Range': 'bytes=0-1024'  // 只请求前 1KB，减少响应时间
      },
      signal: AbortSignal.timeout(10000)  // 延长超时到 10 秒
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // 修复：区分"服务器在线但拒绝访问"和"服务器不可用"
    // 401/403/405/429 等状态码表示服务器在线，只是拒绝或限制访问
    const isAlive = response.ok || (response.status >= 200 && response.status < 400) || response.status === 401 || response.status === 403 || response.status === 405 || response.status === 429;

    let signalStrength = 0;
    if (isAlive) {
      if (response.status === 401 || response.status === 403 || response.status === 405 || response.status === 429) {
        // 被拒绝访问时信号强度设为 1（服务器在线但受限）
        signalStrength = 1;
      } else if (responseTime < 500) {
        signalStrength = 4;
      } else if (responseTime < 1000) {
        signalStrength = 3;
      } else if (responseTime < 2000) {
        signalStrength = 2;
      } else {
        signalStrength = 1;
      }
    }

    // 修复：针对不同状态提供准确的 message
    let message;
    if (response.ok) {
      message = `响应时间: ${responseTime}ms`;
    } else if (response.status >= 200 && response.status < 400) {
      message = `响应时间: ${responseTime}ms`;
    } else if (response.status === 401) {
      message = '需要认证';
    } else if (response.status === 403) {
      message = '禁止访问';
    } else if (response.status === 405) {
      message = '方法不允许';
    } else if (response.status === 429) {
      message = '请求过多';
    } else {
      message = '无法访问';
    }

    return res.status(200).json({
      url: targetUrl,
      alive: isAlive,
      status: response.status,
      responseTime: responseTime,
      signal: signalStrength,
      message: message
    });

  } catch (error) {
    // 超时或其他错误
    return res.status(200).json({
      url: targetUrl,
      alive: false,
      signal: 0,
      message: error.name === 'TimeoutError' ? '连接超时' : error.message || '无法访问'
    });
  }
}
