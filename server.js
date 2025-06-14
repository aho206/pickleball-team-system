/**
 * Socket.io 服务器
 * 处理实时通信和会话管理
 */

console.log('🚀 启动服务器...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const fetch = require('node-fetch');

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0'; // 生产环境绑定到所有接口
const port = process.env.PORT || 3000;

console.log('🔧 配置信息:');
console.log('- 开发模式:', dev);
console.log('- 主机名:', hostname);
console.log('- 端口:', port);

// 初始化 Next.js 应用
console.log('📦 初始化 Next.js 应用...');
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

console.log('⏳ 准备 Next.js 应用...');
app.prepare().then(() => {
  console.log('✅ Next.js 应用准备完成');
  
  const httpServer = createServer(handler);
  console.log('🌐 HTTP 服务器创建完成');
  
  // 初始化 Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  console.log('🔌 Socket.io 服务器初始化完成');

  // Socket.io 连接处理
  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    // 加入会话房间
    socket.on('join-session', (sessionId, userRole) => {
      socket.join(sessionId);
      console.log(`用户 ${socket.id} 以 ${userRole} 身份加入会话 ${sessionId}`);
      
      // 通知房间内其他用户
      socket.to(sessionId).emit('user-joined', {
        socketId: socket.id,
        role: userRole,
        timestamp: new Date()
      });
    });

    // 管理员结束场地比赛
    socket.on('admin-end-court', async (sessionId, courtId) => {
      try {
        // 这里应该调用API来结束比赛
        console.log(`管理员结束场地 ${courtId} 的比赛`);
        
        // 通知房间内所有用户
        io.to(sessionId).emit('court-ended', courtId);
      } catch (error) {
        socket.emit('error', '结束比赛失败');
      }
    });

    // 管理员添加参与者
    socket.on('admin-add-participant', async (sessionId, name) => {
      try {
        console.log(`管理员添加参与者: ${name}`);
        
        // 这里应该调用API来添加参与者
        // 然后通知所有用户
        io.to(sessionId).emit('participant-added', {
          id: Date.now().toString(),
          name,
          gamesPlayed: 0,
          restRounds: 0,
          teammates: {},
          opponents: {},
          status: 'resting',
          joinedAt: new Date(),
          hasLeft: false
        });
      } catch (error) {
        socket.emit('error', '添加参与者失败');
      }
    });

    // 管理员移除参与者
    socket.on('admin-remove-participant', async (sessionId, participantId) => {
      try {
        console.log(`管理员移除参与者: ${participantId}`);
        
        // 这里应该调用API来移除参与者
        io.to(sessionId).emit('participant-removed', participantId);
      } catch (error) {
        socket.emit('error', '移除参与者失败');
      }
    });

    // 管理员标记参与者离开
    socket.on('admin-mark-away', async (sessionId, participantId) => {
      try {
        console.log(`标记参与者 ${participantId} 离开`);
        
        // 这里应该调用API来更新参与者状态
        io.to(sessionId).emit('participant-status-changed', {
          participantId,
          status: 'away'
        });
      } catch (error) {
        socket.emit('error', '更新状态失败');
      }
    });

    // 管理员标记参与者返回
    socket.on('admin-mark-return', async (sessionId, participantId) => {
      try {
        console.log(`标记参与者 ${participantId} 返回`);
        
        // 这里应该调用API来更新参与者状态
        io.to(sessionId).emit('participant-status-changed', {
          participantId,
          status: 'resting'
        });
      } catch (error) {
        socket.emit('error', '更新状态失败');
      }
    });

    // 超级管理员设置权重
    socket.on('superadmin-set-weight', async (sessionId, weight) => {
      try {
        console.log(`设置权重:`, weight);
        
        // 调用API来设置权重 - 修复URL和移除认证依赖
        const apiUrl = dev ? `http://localhost:${port}` : `https://pickleball-team-system-production.up.railway.app`;
        const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/weights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(weight)
        });

        const data = await response.json();
        
        if (data.success) {
          // 通知所有客户端权重已添加
          io.to(sessionId).emit('weight-added', data.data);
        } else {
          socket.emit('error', data.error || '设置权重失败');
        }
      } catch (error) {
        console.error('设置权重失败:', error);
        socket.emit('error', '设置权重失败');
      }
    });

    // 超级管理员移除权重
    socket.on('superadmin-remove-weight', async (sessionId, weightId) => {
      try {
        console.log(`移除权重: ${weightId}`);
        
        // 调用API来移除权重 - 修复URL和移除认证依赖
        const apiUrl = dev ? `http://localhost:${port}` : `https://pickleball-team-system-production.up.railway.app`;
        const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/weights?weightId=${weightId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          // 通知所有客户端权重已移除
          io.to(sessionId).emit('weight-removed', weightId);
        } else {
          socket.emit('error', data.error || '移除权重失败');
        }
      } catch (error) {
        console.error('移除权重失败:', error);
        socket.emit('error', '移除权重失败');
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);
    });
  });

  // 启动服务器
  console.log('🚀 启动 HTTP 服务器...');
  console.log(`📍 监听地址: ${hostname}:${port}`);
  
  httpServer.listen(port, hostname, (err) => {
    if (err) {
      console.error('❌ 服务器启动失败:', err);
      throw err;
    }
    console.log(`✅ 服务器启动成功!`);
    console.log(`🌍 访问地址: http://${hostname}:${port}`);
    console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('❌ Next.js 应用准备失败:', err);
  process.exit(1);
}); 