# 🏓 匹克球随机组队系统

一个智能的匹克球组队管理系统，支持多场地实时组队、权重控制和公平轮换。

## ✨ 功能特性

### 🎯 核心功能
- **智能组队算法**: 基于公平性、权重和多样性的综合评分系统
- **多场地管理**: 支持同时管理多个场地的比赛
- **自定义会话ID**: 支持自定义易记的会话ID，如"abc123"、"周末比赛"
- **实时同步**: 使用 Socket.io 实现多设备实时同步
- **三种用户角色**: 参与者、管理员、超级管理员

### ⚖️ 算法优先级
1. **轮换公平性** (最高) - 确保每个人都有均等的上场机会
2. **权重影响** (中等) - 支持设置特定组合的偏好权重
3. **避免重复** (最低) - 在满足前两个条件下尽量多样化
4. **随机因子** - 避免过于机械化的分配

### 👥 用户角色
- **参与者**: 查看比赛状态、个人统计、等待队列
- **管理员**: 生成新轮次、结束比赛、管理参与者状态
- **超级管理员**: 设置权重偏好、高级配置管理

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Redis (可选，用于生产环境)

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 启动 Next.js 开发服务器
npm run dev

# 或启动带 Socket.io 的完整服务器
npm run server
```

### 访问应用
- 主页: http://localhost:3000
- 算法测试: http://localhost:3000/test

## 📱 使用指南

### 1. 创建会话
1. 在主页输入参与者名单（每行一个名字）
2. 选择场地数量
3. （可选）勾选"使用自定义会话ID"并输入易记的ID
   - 支持3-20个字符
   - 只能包含字母、数字、连字符(-)和下划线(_)
   - 必须以字母或数字开头
   - 例如：`abc123`、`game-2024`、`周末比赛`
4. 点击"创建会话"
5. 系统会生成会话并跳转到管理员页面

### 2. 参与者加入
1. 获取会话ID
2. 在主页输入会话ID
3. 选择"参与者模式"进入

### 3. 管理员操作
- **生成新轮次**: 点击"生成新轮次"按钮
- **结束比赛**: 在每个场地点击"结束比赛"
- **查看统计**: 实时查看参与者状态和比赛统计

### 4. 超级管理员功能
访问 `/superadmin/[sessionId]` 进行权重管理：
- **添加权重**: 设置特定两人的队友/对手偏好
- **权重类型**: 
  - 队友偏好: 增加两人组队概率
  - 对手偏好: 增加两人对战概率
- **权重值**: 1-10，数值越高影响越大

## 🏗️ 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 主页
│   ├── test/              # 算法测试页面
│   ├── admin/             # 管理员页面
│   ├── participant/       # 参与者页面
│   ├── superadmin/        # 超级管理员页面
│   └── api/               # API 路由
├── components/            # React 组件
│   └── ui/               # 基础 UI 组件
├── hooks/                # React Hooks
│   └── useSocket.ts      # Socket.io 客户端
├── lib/                  # 核心逻辑
│   ├── types.ts          # TypeScript 类型定义
│   ├── algorithm.ts      # 组队算法
│   └── redis.ts          # Redis 连接
└── styles/               # 样式文件
```

## 🧮 算法详解

### 评分公式
```
总评分 = 公平性评分 × 1.0 + 权重加分 × 0.8 + 重复惩罚 × 0.6 + 随机因子
```

### 公平性计算
- 基于参与者游戏次数的标准差
- 标准差越小，公平性评分越高
- 优先安排游戏次数少、休息轮数多的参与者

### 权重系统
- **队友权重**: 增加指定两人组队概率
- **对手权重**: 增加指定两人对战概率
- **权重范围**: 1-10，影响算法决策

### 重复惩罚
- 减少相同队友组合的重复
- 减少相同对手组合的重复
- 确保比赛的多样性

## 🔧 配置说明

### 环境变量
创建 `.env.local` 文件：
```env
# Socket.io 服务器地址
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# Redis 连接地址
REDIS_URL=redis://localhost:6379

# 开发环境
NODE_ENV=development
```

### 算法参数调整
在 `src/lib/algorithm.ts` 中可以调整：
- 各评分因子的权重
- 随机因子的范围
- 惩罚系数

## 🚀 部署指南

### Railway 部署
1. 连接 GitHub 仓库到 Railway
2. 添加 Redis 插件
3. 设置环境变量：
   ```
   REDIS_URL=<Railway Redis URL>
   NODE_ENV=production
   ```
4. 部署完成后获取域名

### 其他平台
- **Vercel**: 需要额外配置 Socket.io 服务器
- **Heroku**: 添加 Redis 插件
- **Docker**: 使用提供的 Dockerfile

## 🧪 测试功能

访问 `/test` 页面进行算法测试：
- 创建测试参与者
- 运行算法测试
- 模拟比赛完成
- 查看评分详情

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

MIT License

## 🆘 常见问题

### Q: 如何使用自定义会话ID？
A: 在创建会话时勾选"使用自定义会话ID"，输入3-20个字符的ID。支持字母、数字、连字符和下划线，必须以字母或数字开头。

### Q: 自定义会话ID有什么限制？
A: 会话ID必须唯一，不能与现有会话重复。建议使用易记的名称如"abc123"、"周末比赛"等。

### Q: 如何重置会话？
A: 目前需要创建新会话，未来版本将支持会话重置功能。

### Q: 权重设置不生效？
A: 确保权重值足够高（建议 7-10），且参与者数量足够进行有效分配。

### Q: Socket.io 连接失败？
A: 检查防火墙设置，确保 3000 端口可访问。

### Q: 如何备份数据？
A: 生产环境建议定期备份 Redis 数据。

## 📞 支持

如有问题或建议，请提交 Issue 或联系开发团队。

## 🎯 Phase 3: 体验优化 (已完成)

### 3.1 用户管理功能增强
- ✅ **用户状态管理**: 超级管理员可以启用/禁用管理员账号
- ✅ **用户删除功能**: 安全删除管理员账号（不能删除超级管理员和自己）
- ✅ **权限保护**: 完整的权限验证和安全检查

### 3.2 会话分享功能
- ✅ **智能分享**: 支持Web Share API和剪贴板复制
- ✅ **多平台兼容**: 自动回退到手动复制
- ✅ **用户友好**: 一键分享会话链接给参与者

### 3.3 数据导出功能
- ✅ **完整导出**: 会话信息、参与者统计、比赛记录、等待队列
- ✅ **JSON格式**: 结构化数据，便于分析和备份
- ✅ **自动命名**: 包含会话ID和日期的文件名

### 3.4 系统监控面板
- ✅ **实时统计**: 总用户数、活跃用户、活跃会话、总参与者
- ✅ **可视化展示**: 美观的卡片式监控面板
- ✅ **权限控制**: 仅超级管理员可见

### 3.5 参与者页面增强
- ✅ **自动刷新控制**: 可开启/关闭5秒自动刷新
- ✅ **更新时间显示**: 显示最后更新时间
- ✅ **手动刷新**: 随时手动刷新数据
- ✅ **状态排序**: 按比赛场数排序显示参与者

## 🏆 项目完成状态

### ✅ 已完成功能
1. **核心算法**: 公平轮换、权重控制、多样性配对
2. **认证系统**: JWT认证、角色权限、会话管理
3. **用户管理**: 创建、启用/禁用、删除管理员
4. **会话管理**: 创建、分享、导出、实时监控
5. **多场地支持**: 同时管理多个场地比赛
6. **实时更新**: Socket.io实时通信
7. **响应式设计**: 移动端友好的界面
8. **数据持久化**: SQLite数据库存储

### 🎯 核心特性
- **算法优先级**: 轮换公平性(最高) → 权重影响(中等) → 避免重复(最低) → 随机因子
- **用户角色**: 超级管理员 → 管理员 → 参与者
- **权重系统**: 1-10分权重，支持队友/对手偏好
- **自定义会话ID**: 支持易记的会话标识符
- **多租户架构**: 支持多个管理员同时管理不同会话 