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

  // 解码 URL
  const targetUrl = decodeURIComponent(url);
  
  try {
    const startTime = Date.now();
    
    // api/check.js 修改 fetch 部分
    const response = await fetch(targetUrl, {
      method: 'GET',  // 改为 GET 请求
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)',
        'Range': 'bytes=0-0'  // 只请求第一个字节，减少响应时间
      },
      signal: AbortSignal.timeout(8000)
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const isAlive = response.status >= 200 && response.status < 400;
    
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
    return res.status(200).json({
      url: targetUrl,
      alive: false,
      signal: 0,
      message: error.name === 'TimeoutError' ? '连接超时' : '无法访问'
    });
  }
}
