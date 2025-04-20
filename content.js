// 等待页面加载完成
// 在DOMContentLoaded事件中添加表格样式调整
document.addEventListener('DOMContentLoaded', function () {
  if (window.location.hostname.includes('cnki.net')) {
      // 添加表格左对齐样式
      const style = document.createElement('style');
      style.textContent = `
          #gridTable table, 
          #gridTable th, 
          #gridTable td,
          .result-table-list table,
          .result-table-list th,
          .result-table-list td {
              text-align: left !important;
          }
      `;
      document.head.appendChild(style);
      
      addPdfDownloadButtons();
      addHoverForAbstracts();
      addDownloadAllButton();
  }
});

// 监听动态加载的内容
// 修改MutationObserver回调，添加processJournalTags
// 添加防抖处理
let processing = false;
const observer = new MutationObserver(function (mutations) {
  if (!processing) {
    processing = true;
    setTimeout(() => {
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
          addPdfDownloadButtons();
          addHoverForAbstracts();
          addDownloadAllButton();
          // 添加随机延迟（1-3秒）
          setTimeout(processJournalTags, 1000 + Math.random() * 2000);
        }
      });
      processing = false;
    }, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 添加PDF下载按钮（保持原有功能）
// 修改PDF下载按钮添加函数
async function addPdfDownloadButtons() {
  // 支持检索页面的文章链接选择器
  const articleLinks = document.querySelectorAll(`
    #gridTable > div > div > div > table > tbody > tr > td.name > a.fz14,
    #gridTable > div > div > div > table > tbody > tr > td.name > div > a.fz14,
    .result-table-list tbody tr td.name a
  `);

  for (const link of articleLinks) {
      const row = link.closest('tr');
      if (!row || row.querySelector('.pdf-download-btn')) continue;

      // 创建下载按钮
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'pdf-download-btn';
      downloadBtn.textContent = '下载';
      Object.assign(downloadBtn.style, {
          marginRight: '4px',
          padding: '1px 4px',
          fontSize: '9px',
          cursor: 'pointer',
          backgroundColor: 'rgba(194, 194, 194, 0.5)',
          color: '#FFF',
          border: 'none',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          verticalAlign: 'middle',
          whiteSpace: 'nowrap',
          display: 'inline-block'
      });

      // 插入到标题前面
      const nameCell = row.querySelector('td.name');
      if (nameCell) {
          // 创建容器包裹按钮和标题
          const container = document.createElement('div');
          Object.assign(container.style, {
              display: 'flex',
              alignItems: 'center', // 改为center实现垂直居中对齐
              flexWrap: 'wrap'
          });
          
          // 处理标题链接
          const titleLink = nameCell.querySelector('a');
          if (titleLink) {
              titleLink.style.textAlign = 'left';
              titleLink.style.whiteSpace = 'normal';
              titleLink.style.wordBreak = 'break-word';
              titleLink.style.display = 'inline';
              titleLink.style.flex = '1';
              titleLink.style.minWidth = '0';
              titleLink.style.fontSize = '12px';
              titleLink.style.lineHeight = '1.2'; // 添加行高设置
          }
          
          // 清空单元格并添加新结构
          nameCell.innerHTML = '';
          container.appendChild(downloadBtn);
          if (titleLink) container.appendChild(titleLink);
          nameCell.appendChild(container);
      }

      // 点击事件
      downloadBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          downloadBtn.textContent = '获取中...';
          downloadBtn.disabled = true;

          try {
              // 修改为支持学位论文的PDF链接获取
              const pdfUrl = await fetchPdfUrl(link.href, row);
              pdfUrl ? window.open(pdfUrl, '_blank') : alert('无法获取PDF下载链接');
          } catch (error) {
              console.error('获取PDF链接失败:', error);
              alert('获取PDF链接失败: ' + error.message);
          } finally {
              downloadBtn.textContent = '下载';
              downloadBtn.disabled = false;
          }
      });
  }
}

// 修改PDF链接获取函数
async function fetchPdfUrl(articleUrl, row) {
  try {
      const response = await fetch(articleUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('网络响应不正常');

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      // 判断是否是学位论文
      const isThesis = row.querySelector('img[src*="thesis"]') || 
                       articleUrl.includes('CDMD');

      if (isThesis) {
          // 学位论文PDF下载链接选择器
          const thesisPdfLink = doc.querySelector('.btn-dlcaj, .btn-dlpdf');
          return thesisPdfLink?.href;
      } else {
          // 期刊论文PDF下载链接选择器
          const downloadLinks = doc.querySelectorAll('#pdfDown, #cajDown');
          for (const link of downloadLinks) {
              if (link.textContent.trim().toLowerCase().includes('pdf')) {
                  return link.href;
              }
          }
      }
      return null;
  } catch (error) {
      console.error('获取PDF链接时出错:', error);
      throw error;
  }
}

// 修改摘要悬停功能选择器
async function addHoverForAbstracts() {
  const articleLinks = document.querySelectorAll(`
    #gridTable > div > div > div > table > tbody > tr > td.name > a.fz14,
    #gridTable > div > div > div > table > tbody > tr > td.name > div > a.fz14,
    .result-table-list tbody tr td.name a
  `);
  
  for (const link of articleLinks) {
      if (link.dataset.abstractAdded) continue;
      link.dataset.abstractAdded = true;

      // 创建悬停提示框
      const tooltip = document.createElement('div');
      tooltip.className = 'cnki-abstract-tooltip';
      Object.assign(tooltip.style, {
          position: 'fixed',
          maxWidth: '400px',
          padding: '10px',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: '9999',
          display: 'none',
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#333'
      });
      document.body.appendChild(tooltip);

      // 鼠标悬停事件
      link.addEventListener('mouseenter', async (e) => {
          const rect = link.getBoundingClientRect();
          tooltip.style.left = `${rect.right + 10}px`;
          tooltip.style.top = `${rect.top}px`;
          tooltip.style.display = 'block';
          tooltip.textContent = '加载摘要中...';

          try {
              const abstract = await fetchAbstract(link.href);
              tooltip.innerHTML = abstract || '<span style="color:#999">无摘要内容</span>';
          } catch (error) {
              console.error('获取摘要失败:', error);
              tooltip.innerHTML = '<span style="color:red">获取摘要失败</span>';
          }
      });

      link.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
      });
  }
}

// 获取摘要内容
async function fetchAbstract(articleUrl) {
  try {
      const response = await fetch(articleUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('网络响应不正常');

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      // 获取摘要内容
      const abstractElement = doc.querySelector('#ChDivSummary');
      return abstractElement ? abstractElement.textContent.trim() : null;
  } catch (error) {
      console.error('获取摘要时出错:', error);
      throw error;
  }
}

// 获取PDF下载链接（保持不变）
async function fetchPdfUrl(articleUrl) {
  try {
      const response = await fetch(articleUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('网络响应不正常');

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // 获取所有下载链接
      const downloadLinks = doc.querySelectorAll('#pdfDown, #cajDown');
      
      // 遍历所有下载链接，找到PDF下载按钮
      for (const link of downloadLinks) {
          const linkText = link.textContent.trim().toLowerCase();
          if (linkText.includes('pdf')) {
              return link.href;
          }
      }
      return null;
  } catch (error) {
      console.error('获取PDF链接时出错:', error);
      throw error;
  }
}

// 添加下载所有按钮
function addDownloadAllButton() {
  const pagesDiv = document.querySelector('#briefBox > div:nth-child(2) > div > div.pages');
  if (pagesDiv && !pagesDiv.querySelector('.download-all-btn')) {
      const downloadAllBtn = document.createElement('button');
      downloadAllBtn.className = 'download-all-btn';
      downloadAllBtn.textContent = '下载所有PDF';
      pagesDiv.appendChild(downloadAllBtn);

      downloadAllBtn.addEventListener('click', async () => {
          try {
              await downloadAllPdfs();
          } catch (error) {
              console.error('下载所有PDF时出错:', error);
              alert('下载所有PDF时出错: ' + error.message);
          }
      });
  }
}

// 下载队列管理类
class DownloadQueue {
    constructor(maxConcurrent = 3) {
        this.queue = [];
        this.running = 0;
        this.maxConcurrent = maxConcurrent;
        this.totalTasks = 0;
        this.completedTasks = 0;
        this.failedTasks = 0;
    }

    async add(task) {
        this.totalTasks++;
        this.queue.push(task);
        await this.processQueue();
    }

    async processQueue() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

        const task = this.queue.shift();
        this.running++;

        try {
            await this.executeTask(task);
            this.completedTasks++;
        } catch (error) {
            console.error('任务执行失败:', error);
            this.failedTasks++;
            if (task.retries < 3) {
                task.retries++;
                this.queue.push(task);
            }
        } finally {
            this.running--;
            this.updateProgress();
            await this.processQueue();
        }
    }

    async executeTask(task) {
        const delay = Math.random() * 2000 + 1000; // 1-3秒随机延迟
        await new Promise(resolve => setTimeout(resolve, delay));
        await task.execute();
    }

    updateProgress() {
        const progressElement = document.querySelector('.download-progress');
        if (progressElement) {
            const progress = ((this.completedTasks / this.totalTasks) * 100).toFixed(1);
            progressElement.textContent = `下载进度: ${progress}% (${this.completedTasks}/${this.totalTasks})`;
            if (this.failedTasks > 0) {
                progressElement.textContent += ` 失败: ${this.failedTasks}`;
            }
        }
    }
}

// 下载所有页面的PDF
async function downloadAllPdfs() {
    const downloadQueue = new DownloadQueue(3);
    const articleLinks = document.querySelectorAll('#gridTable > div > div > div > table > tbody > tr > td.name > a.fz14, #gridTable > div > div > div > table > tbody > tr > td.name > div > a.fz14');

    // 创建进度显示元素
    const progressElement = document.createElement('div');
    progressElement.className = 'download-progress';
    progressElement.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; z-index: 9999;';
    document.body.appendChild(progressElement);

    // 添加下载任务到队列
    for (const link of articleLinks) {
        await downloadQueue.add({
            retries: 0,
            execute: async () => {
                const pdfUrl = await fetchPdfUrl(link.href);
                if (pdfUrl) {
                    // 检查是否包含验证码页面特征
                    if (pdfUrl.toLowerCase().includes('checkcode')) {
                        throw new Error('检测到验证码，请手动处理');
                    }
                    window.open(pdfUrl, '_blank');
                } else {
                    throw new Error('无法获取PDF链接');
                }
            }
        });
    }
}

// 添加缓存对象
const journalCache = {
  data: null,
  lastFetch: 0,
  CACHE_DURATION: 3600000 // 1小时缓存
};

async function processJournalTags() {
  try {
    // 使用缓存数据
    if (!journalCache.data || Date.now() - journalCache.lastFetch > journalCache.CACHE_DURATION) {
      journalCache.data = await fetchJournalData('https://gitee.com/kailangge/cnki-journals/raw/main/cnki_journals.json');
      journalCache.lastFetch = Date.now();
    }
    const journalsData = journalCache.data;
    if (!journalsData) return;

    const sourceElements = document.querySelectorAll('td.source');
    sourceElements.forEach(element => {
      if (element.querySelector('.journal-tag-container')) return;
      const journalNameElement = element.querySelector('a, span');
      const journalName = journalNameElement?.textContent.trim();
      if (journalName) {
        let journalInfo;

        // 第一级：精确匹配原始名称
        journalInfo = journalsData.find(j => j.title.toLowerCase() === journalName.toLowerCase());

        // 第二级：匹配中英文变体
        if (!journalInfo) {
          const variantName = `${journalName}(中英文)`;
          journalInfo = journalsData.find(j => j.title.toLowerCase() === variantName.toLowerCase());
        }

        // 第三级：移除括号模糊匹配
        if (!journalInfo) {
          const baseName = journalName.replace(/[（）()]/g, '').trim();
          journalInfo = journalsData.find(j => j.title.toLowerCase().includes(baseName.toLowerCase()));
        }

        if (!journalInfo) return;
        const tagContainer = document.createElement('div');
        tagContainer.className = 'journal-tag-container';
        Object.assign(tagContainer.style, {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginTop: '2px',
          lineHeight: '1'
        });
        // 中科院标签
        if (journalInfo["中科院"]) {
            const casTag = document.createElement('span');
            casTag.className = 'journal-tag cas-tag';
            casTag.textContent = `中科院 ${journalInfo["中科院"]}区`;
            let casColor = '#2196F3';
            switch (journalInfo["中科院"]) {
                case '1': casColor = '#F44336'; break;
                case '2': casColor = '#FF9800'; break;
                case '3': casColor = '#FFC107'; break;
            }
            Object.assign(casTag.style, {
                display: 'inline-block',
                padding: '2px 6px',
                backgroundColor: casColor,
                opacity: '0.7',
                color: 'white',
                borderRadius: '4px',
                fontSize: '8px',
                fontWeight: '500',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginRight: '4px'
            });
            tagContainer.appendChild(casTag);
        }
        // TOP标签
        if (journalInfo.TOP === 'T') {
            const topTag = document.createElement('span');
            topTag.className = 'journal-tag top-tag';
            topTag.textContent = 'Top';
            Object.assign(topTag.style, {
                display: 'inline-block',
                padding: '2px 6px',
                backgroundColor: '#9C27B0',
                opacity: '0.7',
                color: 'white',
                borderRadius: '4px',
                fontSize: '8px',
                fontWeight: '500',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginRight: '4px'
            });
            tagContainer.appendChild(topTag);
        }
        // JCR分区标签
        if (journalInfo.IF_Quartile && journalInfo.IF_Quartile !== 'N/A') {
          const jcrTag = document.createElement('span');
          jcrTag.className = 'journal-tag jcr-tag';
          jcrTag.textContent = `JCR ${journalInfo.IF_Quartile}`;
          let jcrColor = '#2196F3';
          switch (journalInfo.IF_Quartile) {
              case 'Q1': jcrColor = '#F44336'; break;
              case 'Q2': jcrColor = '#FF9800'; break;
              case 'Q3': jcrColor = '#FFC107'; break;
          }
          Object.assign(jcrTag.style, {
              display: 'inline-block',
              padding: '2px 6px',
              backgroundColor: jcrColor,
              opacity: '0.7',
              color: 'white',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              marginRight: '4px'
          });
          tagContainer.appendChild(jcrTag);
        }
        // WOS标签
        if (journalInfo.WOS && journalInfo.WOS !== 'N/A') {
          const wosValues = journalInfo.WOS.split(';');
          wosValues.forEach(wosValue => {
            const wosTag = document.createElement('span');
            wosTag.className = 'journal-tag wos-tag';
            wosTag.textContent = wosValue.trim();
            Object.assign(wosTag.style, {
                display: 'inline-block',
                padding: '2px 6px',
                backgroundColor: '#009688',
                opacity: '0.7',
                color: 'white',
                borderRadius: '4px',
                fontSize: '8px',
                fontWeight: '500',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginRight: '4px'
            });
            tagContainer.appendChild(wosTag);
          });
        }
        // WJCI标签
        if (journalInfo.wjci && journalInfo.wjci !== 'N/A') {
            const wjciTag = document.createElement('span');
            wjciTag.className = 'journal-tag wjci-tag';
            wjciTag.textContent = `WJCI ${journalInfo.wjci}`;
            const wjciLevel = journalInfo.wjci.substring(0, 2).toUpperCase();
            let wjciColor = '#5C6BC0';
            if (wjciLevel === 'Q1') wjciColor = '#4CAF50';
            else if (wjciLevel === 'Q2') wjciColor = '#2196F3';
            else if (wjciLevel === 'Q3') wjciColor = '#FFC107';
            else if (wjciLevel === 'Q4') wjciColor = '#F44336';
            Object.assign(wjciTag.style, {
                display: 'inline-block',
                padding: '2px 6px',
                backgroundColor: wjciColor,
                opacity: '0.7',
                color: 'white',
                borderRadius: '4px',
                fontSize: '8px',
                fontWeight: '500',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginRight: '4px'
            });
            tagContainer.appendChild(wjciTag);
        }
        // tags原样显示
        if (journalInfo.tags && journalInfo.tags.length > 0) {
            journalInfo.tags.sort((a, b) => {
                if (a.includes('CSSCI')) return -1;
                if (b.includes('CSSCI')) return 1;
                return 0;
            }).forEach(tagText => {
              if (tagText && tagText !== 'N/A') {
                const singleTag = document.createElement('span');
                singleTag.className = 'journal-tag';
                singleTag.textContent = tagText;
                let bgColor = '#5C6BC0';
                if (tagText.includes('核心')) bgColor = '#F44336';
                else if (tagText.includes('扩展')) bgColor = '#FF9800';
                else if (tagText.includes('EI')) bgColor = '#FF7043';
                else if (tagText.includes('SCI')) bgColor = '#4CAF50';
                else if (tagText.includes('CSSCI')) bgColor = '#9C27B0';
                Object.assign(singleTag.style, {
                  display: 'inline-block',
                  padding: '2px 6px',
                  backgroundColor: bgColor,
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '8px',
                  fontWeight: '500',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  marginRight: '4px',
                  opacity: '0.7'
                });
                tagContainer.appendChild(singleTag);
              }
            });
        }
        if (tagContainer.hasChildNodes()) {
            journalNameElement.insertAdjacentElement('afterend', tagContainer);
        }
        if (journalInfo) {
          const row = element.closest('tr');
          if (row) {
            const dataElement = row.querySelector('td.data');
            if (dataElement) {
              dataElement.querySelectorAll('.custom-journal-info').forEach(el => el.remove());
              const infoContainer = document.createElement('div');
              infoContainer.className = 'custom-journal-info';
              Object.assign(infoContainer.style, {
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginTop: '2px',
                  lineHeight: '1'
              });
              if (journalInfo.impactFactor && journalInfo.impactFactor !== 'N/A') {
                const impactFactorElement = document.createElement('span');
                impactFactorElement.className = 'impact-factor-tag';
                impactFactorElement.textContent = `IF: ${journalInfo.impactFactor}`;
                Object.assign(impactFactorElement.style, {
                    display: 'inline-block',
                    padding: '2px 6px',
                    backgroundColor: 'rgba(239, 83, 80, 0.7)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '8px',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap'
                });
                infoContainer.appendChild(impactFactorElement);
              }
              if (journalInfo.JCR_IF && journalInfo.JCR_IF !== 'N/A') {
                const jcrIfElement = document.createElement('span');
                jcrIfElement.className = 'jcr-if-tag';
                jcrIfElement.textContent = `JCR IF: ${journalInfo.JCR_IF}`;
                Object.assign(jcrIfElement.style, {
                    display: 'inline-block',
                    padding: '2px 6px',
                    backgroundColor: 'rgba(239, 83, 80, 0.7)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '8px',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap'
                });
                infoContainer.appendChild(jcrIfElement);
              }
              if (journalInfo.CR && journalInfo.CR !== 'N/A') {
                const crElement = document.createElement('span');
                crElement.className = 'cr-rank-tag';
                crElement.textContent = `Rank: ${journalInfo.CR}`;
                Object.assign(crElement.style, {
                    display: 'inline-block',
                    padding: '2px 6px',
                    backgroundColor: 'rgba(33, 150, 243, 0.7)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '8px',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap'
                });
                infoContainer.appendChild(crElement);
              }
              if (infoContainer.hasChildNodes()) {
                  const existingSpan = dataElement.querySelector('span');
                  if (existingSpan) {
                      existingSpan.insertAdjacentElement('afterend', infoContainer);
                  } else {
                      dataElement.appendChild(infoContainer);
                  }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('处理期刊标签时出错:', error);
  }
}

// 新增获取期刊数据的辅助函数
async function fetchJournalData(url) {
  try {
    const {data, error} = await new Promise(resolve => {
      chrome.runtime.sendMessage({url, retry: 3}, response => {
        if (!response || response.error) {
          return resolve({error: response?.error || '无响应'});
        }
        resolve(response);
      });
    });
    
    if (error || !data) {
      console.error(`从${url}获取数据失败:`, error);
      return null;
    }
    
    // 验证数据格式
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    throw new Error('无效的数据格式');
    
  } catch (error) {
    console.error(`获取期刊数据失败(${url}):`, error);
    return null;
  }
}

// 新增默认期刊数据常量
const DEFAULT_JOURNALS_DATA = [
  {
    title: "计算机学报",
    tags: ["核心", "EI"],
    impactFactor: "2.456"
  },
  {
    title: "软件学报",
    tags: ["核心", "EI", "CSCD"],
    impactFactor: "1.892"
  },
  {
    title: "自动化学报",
    tags: ["核心", "EI"],
    impactFactor: "3.125"
  },
  // 添加更多常见期刊...
];
