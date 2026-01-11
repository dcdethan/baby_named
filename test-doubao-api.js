// 测试豆包 API 调用
// 使用方法: node test-doubao-api.js

const ARK_API_KEY = 'fc6d1c30-0f73-4339-9e00-9d0984ddb1bd'; // 请替换为你的实际 API Key

async function testDoubaoAPI() {
  console.log('开始测试豆包 API...\n');
  console.log('API Key 前10位:', ARK_API_KEY.substring(0, 10) + '...\n');

  const prompt = `你是一位精通中华传统文化、诗词歌赋与五行八字的起名专家。

请推荐6个候选单字，每个字将与姓氏组成两字名（姓+字）。

**用户信息**：
- 姓氏：李
- 性别：男孩
- 阳历生日：2025-12-28
- 起名风格：现代 - 融合自然意象，简洁明快、音韵悦耳、易读易写

**起名要求**：
1. **简洁性**：推荐的单字笔画适中，易于书写和记忆。
2. **寓意美好**：每个字要有积极、正面的寓意。
3. **字义深刻**：符合现代风格的要求。
4. **音韵和谐**：与姓氏李搭配时音韵流畅，避免谐音不佳。

**返回格式要求（必须严格遵守，返回纯 JSON）**：
\`\`\`json
{
  "singleChars": [
    {
      "char": "瑞",
      "pinyin": "ruì",
      "wuxing": "金",
      "fullName": "李瑞",
      "fullPinyin": "lǐ ruì",
      "analysis": "瑞字寓意祥瑞吉祥，代表美好的征兆。与李姓搭配，音韵和谐，读起来清脆悦耳。整体给人积极向上、充满希望的感觉。"
    }
  ]
}
\`\`\`

请严格按照以上 JSON 格式返回，不要添加任何额外说明。`;

  try {
    console.log('发送请求到豆包 API...');
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'doubao-seed-1-8-251215',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    console.log('响应状态码:', response.status);
    console.log('响应状态文本:', response.statusText);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 调用失败！');
      console.error('错误详情:', errorText);
      return;
    }

    const data = await response.json();
    console.log('API 调用成功！\n');
    console.log('完整响应:', JSON.stringify(data, null, 2));
    console.log('\n');

    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log('AI 返回内容:');
      console.log(content);
      console.log('\n');

      try {
        const parsed = JSON.parse(content);
        console.log('解析后的数据:');
        console.log(JSON.stringify(parsed, null, 2));
        console.log('\n候选字数量:', parsed.singleChars?.length || 0);
      } catch (e) {
        console.error('JSON 解析失败:', e.message);
      }
    } else {
      console.error('返回内容为空！');
    }

  } catch (error) {
    console.error('请求异常:', error.message);
    console.error('详细错误:', error);
  }
}

// 检查是否提供了 API Key
if (ARK_API_KEY === 'YOUR_ARK_API_KEY_HERE') {
  console.error('错误：请先在脚本中设置 ARK_API_KEY！');
  console.log('\n使用方法：');
  console.log('1. 打开 test-doubao-api.js');
  console.log('2. 将第4行的 YOUR_ARK_API_KEY_HERE 替换为你的实际 API Key');
  console.log('3. 运行: node test-doubao-api.js\n');
} else {
  testDoubaoAPI();
}
