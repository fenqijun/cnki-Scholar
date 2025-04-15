// 背景脚本，处理跨域请求
chrome.runtime.onInstalled.addListener(() => {
  console.log('已安装');
});

// 添加消息监听器处理Gitee请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.url) {
    fetch(request.url)
      .then(response => response.json())
      .then(data => sendResponse({data}))
      .catch(error => sendResponse({error: error.message}));
    return true; // 保持消息端口开放
  }
});