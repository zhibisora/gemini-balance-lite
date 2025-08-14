import { handleVerification } from './verify_keys.js';
import openai from './openai.mjs';

export async function handleRequest(request) {

  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;

  if (pathname === '/' || pathname === '/index.html') {
    return new Response('Proxy is Running!  More Details: https://github.com/tech-shrimp/gemini-balance-lite', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (pathname === '/verify' && request.method === 'POST') {
    return handleVerification(request);
  }

  // 处理OpenAI格式请求
  if (url.pathname.endsWith("/chat/completions") || url.pathname.endsWith("/completions") || url.pathname.endsWith("/embeddings") || url.pathname.endsWith("/models")) {
    return openai.fetch(request);
  }

  const targetUrl = `https://generativelanguage.googleapis.com${pathname}${search}`;

  try {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (key.trim().toLowerCase() === 'x-goog-api-key') {
        const apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
        if (apiKeys.length > 0) {
          const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
          console.log(`Gemini Selected API Key: ${selectedKey}`);
          headers.set('x-goog-api-key', selectedKey);
        }
      } else {
        if (key.trim().toLowerCase()==='content-type')
        {
           headers.set(key, value);
        }
      }
    }

    console.log('Request Sending to Gemini')
    console.log('targetUrl:'+targetUrl)
    console.log(headers)

    // 构造 fetch 请求的选项
    const fetchOptions = {
      method: request.method,
      headers: headers,
    };

    // 如果请求有请求体，则添加 body 和 duplex 选项
    // duplex: 'half' 是在某些现代 JS 运行时（如 Netlify Edge）中处理流式请求体所必需的
    if (request.body) {
      fetchOptions.body = request.body;
      fetchOptions.duplex = 'half';
    }
    const response = await fetch(targetUrl, fetchOptions);

    console.log("Call Gemini Success")

    const responseHeaders = new Headers(response.headers);

    console.log('Header from Gemini:')
    console.log(responseHeaders)

    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');
    responseHeaders.delete('keep-alive');
    responseHeaders.delete('content-encoding');
    responseHeaders.set('Referrer-Policy', 'no-referrer');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
   console.error('Failed to fetch:', error);
   return new Response('Internal Server Error\n' + error?.stack, {
    status: 500,
    headers: { 'Content-Type': 'text/plain' }
   });
}
};
