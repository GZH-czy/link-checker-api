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

    // HEAD 请求下 status 可能为空，改为检查 ok
    const isAlive = response.ok || (response.status >= 200 && response.status < 400);
    
    let signalStrength = 0;
    if (isAlive) {
      if (responseTime < 500) signalStrength = 4;
      else if (responseTime < 1000) signalStrength = 3;
      else if (responseTime < 2000) signalStrength = 2;
      else signalStrength = 1;
    }

    return res.status(200).json({
      url: targetUrl,
      alive: isAlive,
      status: response.status,
      responseTime: responseTime,
      signal: signalStrength,
      message: isAlive ? `响应时间: ${responseTime}ms` : '无法访问'
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
