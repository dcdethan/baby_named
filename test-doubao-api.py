#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试豆包 API 调用（使用火山引擎 SDK）
使用方法: 
1. pip install volcenginesdkarkruntime
2. export ARK_API_KEY='your-api-key'
3. python test-doubao-api.py
"""

import os
import json
from volcenginesdkarkruntime import Ark

# 也可以直接在这里设置 API Key
# os.environ['ARK_API_KEY'] = 'fc6d1c30-0f73-4339-9e00-9d0984ddb1bd'

client = Ark(
    base_url='https://ark.cn-beijing.volces.com/api/v3',
    api_key=os.getenv('ARK_API_KEY'),
)

prompt = """你是一位精通中华传统文化、诗词歌赋与五行八字的起名专家。

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
```json
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
```

请严格按照以上 JSON 格式返回，不要添加任何额外说明。"""


def test_doubao_api():
    print('开始测试豆包 API...\n')
    api_key = os.getenv('ARK_API_KEY', '')
    print(f'API Key 前10位: {api_key[:10]}...\n')

    try:
        print('发送请求到豆包 API...')
        response = client.chat.completions.create(
            model="doubao-seed-1-6-flash-250828",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.8,
            max_tokens=2000,
        )

        print('API 调用成功！\n')
        print('完整响应:', response)
        print('\n')

        content = response.choices[0].message.content
        if content:
            print('AI 返回内容:')
            print(content)
            print('\n')

            try:
                # 尝试提取 JSON（可能包含 markdown 代码块）
                json_str = content
                if '```json' in content:
                    json_str = content.split('```json')[1].split('```')[0].strip()
                elif '```' in content:
                    json_str = content.split('```')[1].split('```')[0].strip()
                
                parsed = json.loads(json_str)
                print('解析后的数据:')
                print(json.dumps(parsed, ensure_ascii=False, indent=2))
                print(f'\n候选字数量: {len(parsed.get("singleChars", []))}')
            except json.JSONDecodeError as e:
                print(f'JSON 解析失败: {e}')
        else:
            print('返回内容为空！')

    except Exception as error:
        print(f'请求异常: {error}')


if __name__ == '__main__':
    if not os.getenv('ARK_API_KEY'):
        print('错误：请先设置 ARK_API_KEY 环境变量！')
        print('\n使用方法：')
        print('1. export ARK_API_KEY="your-api-key"')
        print('2. python test-doubao-api.py\n')
    else:
        test_doubao_api()
