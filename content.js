// 在文件顶部添加全局变量
let isCNKIPage = false;
let observer = null;

// 修改DOMContentLoaded事件监听
document.addEventListener('DOMContentLoaded', function () {
  checkCNKIPage();
});

// 添加页面切换检测
window.addEventListener('popstate', checkCNKIPage);
window.addEventListener('hashchange', checkCNKIPage);

// 添加检查知网页面的函数
function checkCNKIPage() {
  const isCNKI = window.location.hostname.includes('cnki.net');
  
  if (isCNKI && !isCNKIPage) {
    // 进入知网页面
    isCNKIPage = true;
    startPlugin();
  } else if (!isCNKI && isCNKIPage) {
    // 离开知网页面
    isCNKIPage = false;
    stopPlugin();
  }
}

// 启动插件功能
function startPlugin() {
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
  
  // 初始化功能
  addPdfDownloadButtons();
  addHoverForAbstracts();
  addDownloadAllButton();
  processJournalTags();
  
  // 启动MutationObserver
  observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        addPdfDownloadButtons();
        addHoverForAbstracts();
        addDownloadAllButton();
        processJournalTags();
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 停止插件功能
function stopPlugin() {
  // 移除MutationObserver
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  // 移除添加的样式
  const style = document.querySelector('style[data-cnki-style]');
  if (style) {
    style.remove();
  }
  
  // 可以添加更多清理工作...
}

// 在文件末尾添加新的processJournalTags函数
// 在processJournalTags函数中修改期刊名称匹配逻辑
async function processJournalTags() {
  try {
    // 尝试从Gitee获取数据
    let journalsData = await fetchJournalData('https://gitee.com/kailangge/qikandata/raw/master/cnki_journals.json');
    
    // 如果失败，尝试备用数据源
    if (!journalsData) {
      journalsData = await fetchJournalData('https://raw.githubusercontent.com/kailangge/cnki-journals/main/cnki-journals.json');
    }
    
    // 如果没有获取到数据，直接返回
    if (!journalsData) {
      console.warn('未能获取期刊数据');
      return;
    }

  // 获取所有期刊名称元素
  const sourceElements = document.querySelectorAll('td.source');
  
  sourceElements.forEach(element => {
    // 跳过已处理的元素
    if (element.querySelector('.journal-tag')) return;
    
    // 获取期刊名称
    const journalName = element.querySelector('a')?.textContent.trim();
    if (journalName) {
      // 查找匹配的期刊数据
      const journalInfo = journalsData.find(j => j.title === journalName);
      
      // 创建标签元素
      const tag = document.createElement('span');
      tag.className = 'journal-tag';
      
      // 如果有匹配的期刊数据，显示tags，否则跳过
      if (!journalInfo || !journalInfo.tags || journalInfo.tags.length === 0) {
        return;
      }

      // 为所有标签创建单行容器
      const tagContainer = document.createElement('div');
      Object.assign(tagContainer.style, {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginTop: '2px',
        lineHeight: '1'
      });
      
      // 为每个标签创建独立的span元素
      if (journalInfo.wjci) {
          const wjciTag = document.createElement('span');
          wjciTag.className = 'journal-tag';
          wjciTag.textContent = `WJCI ${journalInfo.wjci}`;
          
          // 根据WJCI等级设置颜色
          const wjciLevel = journalInfo.wjci.substring(0, 2).toUpperCase();
          let wjciColor = '#5C6BC0'; // 默认蓝色
          if (wjciLevel === 'Q1') wjciColor = '#4CAF50'; // 绿色
          else if (wjciLevel === 'Q2') wjciColor = '#2196F3'; // 蓝色
          else if (wjciLevel === 'Q3') wjciColor = '#FFC107'; // 黄色
          else if (wjciLevel === 'Q4') wjciColor = '#F44336'; // 红色
          
          Object.assign(wjciTag.style, {
              display: 'inline-block',
              padding: '2px 6px',
              backgroundColor: wjciColor,
              color: 'white',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              marginRight: '4px'
          });
          
          tagContainer.appendChild(wjciTag);
      }

      journalInfo.tags.forEach(tagText => {
        const singleTag = document.createElement('span');
        singleTag.className = 'journal-tag';
        singleTag.textContent = tagText;
        
        // 使用更高级的配色方案
        let bgColor = '#5C6BC0'; // 柔和蓝
        if (tagText.includes('核心')) bgColor = '#EF5350'; // 柔和红
        else if (tagText.includes('EI')) bgColor = '#FF7043'; // 柔和橙
        else if (tagText.includes('CSCD')) bgColor = '#FFCA28'; // 柔和黄
        else if (tagText.includes('CSSCI')) bgColor = '#9575CD'; // 柔和紫
        
        // 添加样式
        Object.assign(singleTag.style, {
          display: 'inline-block',
          padding: '2px 6px',
          backgroundColor: bgColor.includes('5C6BC0') ? 'rgba(92, 107, 192, 0.6)' :
                         bgColor.includes('EF5350') ? 'rgba(239, 83, 80, 0.6)' :
                         bgColor.includes('FF7043') ? 'rgba(255, 112, 67, 0.6)' :
                         bgColor.includes('FFCA28') ? 'rgba(255, 202, 40, 0.6)' :
                         'rgba(149, 117, 205, 0.6)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '8px',
          fontWeight: '500',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        });
        
        tagContainer.appendChild(singleTag);
      });
      
      // 插入到期刊名称后面
      element.querySelector('a').insertAdjacentElement('afterend', tagContainer);
      
      // 添加iF显示
      if (journalInfo && journalInfo.impactFactor) {
        const row = element.closest('tr');
        if (row) {
          const dataElement = row.querySelector('td.data');
          if (dataElement) {
            const impactFactorElement = document.createElement('span');
            impactFactorElement.textContent = `iF：${journalInfo.impactFactor}`;
            // 修改影响因子标签样式
            Object.assign(impactFactorElement.style, {
                display: 'inline-block',
                padding: '2px 6px',
                backgroundColor: 'rgba(239, 83, 80, 0.6)', // 进一步降低饱和度
                color: 'white',
                borderRadius: '4px',
                fontSize: '8px',
                fontWeight: '500',
                marginLeft: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                lineHeight: '1'
            });
            dataElement.appendChild(impactFactorElement);
          }
        }
      }
    }
  });
}
catch (error) {
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
