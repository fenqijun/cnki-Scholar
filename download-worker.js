// download-worker.js
self.onmessage = async function (e) {
    const pdfUrls = e.data;
    for (const pdfUrl of pdfUrls) {
        try {
            // 发送消息给主线程，让其打开下载链接
            self.postMessage(pdfUrl);
            // 为了避免浏览器阻止弹出窗口，添加适当延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('下载 PDF 时出错:', error);
        }
    }
};