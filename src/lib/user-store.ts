/**
 * 用户存储和管理系统
 */

import { 
  createUser as createUserInDB,
  getUserByUsername,
  getUserById as getUserByIdFromDB,
  getAllUsers as getAllUsersFromDB,
  updateUser
} from './database';
import { User, CreateUserRequest, PasswordPolicy } from './types';
import bcrypt from 'bcryptjs';

// 密码策略
export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 6,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
};

/**
 * 验证密码是否符合策略
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < PASSWORD_POLICY.minLength) {
    return { valid: false, error: `密码长度至少${PASSWORD_POLICY.minLength}位` };
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: '密码必须包含大写字母' };
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: '密码必须包含小写字母' };
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    return { valid: false, error: '密码必须包含数字' };
  }

  return { valid: true };
}

/**
 * 创建用户
 */
export async function createUser(userData: CreateUserRequest, createdBy: string): Promise<User> {
  try {
    // 验证密码
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 创建用户
    const passwordHash = bcrypt.hashSync(userData.password, 10);

    const user = await createUserInDB({
      username: userData.username,
      passwordHash,
      role: userData.role,
      wechatId: 'aho206', // 默认微信号
      createdBy,
      isActive: true,
    });

    // 返回创建的用户（不包含密码）
    return {
      ...user,
      passwordHash: '', // 不返回密码哈希
    };
  } catch (error) {
    console.error('[UserStore] 创建用户失败:', error);
    throw error;
  }
}

/**
 * 验证用户登录
 */
export async function validateUserLogin(username: string, password: string): Promise<User | null> {
  try {
    const user = await getUserByUsername(username);

    if (!user || !user.isActive) {
      return null;
    }

    // 验证密码
    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('[UserStore] 验证用户登录失败:', error);
    return null;
  }
}

/**
 * 根据ID获取用户
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const user = await getUserByIdFromDB(userId);
    return user;
  } catch (error) {
    console.error('[UserStore] 根据ID获取用户失败:', error);
    return null;
  }
}

/**
 * 获取所有用户列表（仅超级管理员）
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await getAllUsersFromDB();
    return users;
  } catch (error) {
    console.error('[UserStore] 获取所有用户失败:', error);
    return [];
  }
}

/**
 * 切换用户状态（启用/禁用）
 */
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  try {
    await updateUser(userId, { isActive });
    return true;
  } catch (error) {
    console.error('[UserStore] 切换用户状态失败:', error);
    return false;
  }
} 