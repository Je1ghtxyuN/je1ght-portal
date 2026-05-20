import {
    collection, addDoc, deleteDoc, doc, query, orderBy,
    onSnapshot, serverTimestamp, updateDoc, increment,
    setDoc, getDoc, getDocs
} from "firebase/firestore";
import { db } from './firebase';

const APP_ID = 'je1ght-space-v3';

// 本地存储键名前缀
const STORAGE_PREFIX = 'je1ght_';

// 数据缓存时间（毫秒）
const CACHE_DURATION = {
    PROFILE: 5 * 60 * 1000, // 5分钟
    POSTS: 10 * 60 * 1000, // 10分钟
    WORKS: 10 * 60 * 1000, // 10分钟
    PHOTOS: 10 * 60 * 1000, // 10分钟
    COMMENTS: 2 * 60 * 1000, // 2分钟
};

// 错误处理
class DataServiceError extends Error {
    constructor(message, code, originalError) {
        super(message);
        this.name = 'DataServiceError';
        this.code = code;
        this.originalError = originalError;
    }
}

// 本地存储工具
const storage = {
    set(key, data, ttl = null) {
        try {
            const item = {
                data,
                timestamp: Date.now(),
                ttl
            };
            localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(item));
        } catch (e) {
            console.warn('本地存储失败:', e);
        }
    },

    get(key) {
        try {
            const itemStr = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            const now = Date.now();

            // 检查是否过期
            if (item.ttl && (now - item.timestamp) > item.ttl) {
                localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
                return null;
            }

            return item.data;
        } catch (e) {
            console.warn('本地存储读取失败:', e);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        } catch (e) {
            console.warn('本地存储删除失败:', e);
        }
    }
};

// 网络状态检测
const network = {
    isOnline() {
        return navigator.onLine;
    },

    async checkFirebaseConnection() {
        try {
            // 简单的Firebase连接测试
            const testRef = doc(db, 'artifacts', APP_ID, 'public', 'connection_test');
            await getDoc(testRef);
            return true;
        } catch {
            console.warn('Firebase 连接失败，使用本地缓存');
            return false;
        }
    }
};

// 数据服务主类
class DataService {
    constructor() {
        this.useFallback = false;
        this.initialize();
    }

    async initialize() {
        // 检查网络状态
        if (!network.isOnline()) {
            this.useFallback = true;
            console.log('离线模式：使用本地缓存');
            return;
        }

        // 测试Firebase连接
        try {
            const isConnected = await network.checkFirebaseConnection();
            this.useFallback = !isConnected;
            if (this.useFallback) {
                console.log('Firebase连接失败：使用本地缓存');
            }
        } catch {
            this.useFallback = true;
            console.log('Firebase初始化失败：使用本地缓存');
        }
    }

    // 通用数据获取方法
    async getData({ collectionPath, cacheKey, cacheDuration, orderByField = 'createdAt', orderDirection = 'desc' }) {
        // 1. 尝试从缓存读取
        const cachedData = storage.get(cacheKey);
        if (cachedData) {
            console.log(`从缓存读取: ${cacheKey}`);
            return cachedData;
        }

        // 2. 如果使用降级模式，返回空数据
        if (this.useFallback) {
            console.log(`降级模式: ${cacheKey}`);
            return [];
        }

        // 3. 尝试从Firebase获取
        try {
            const q = query(
                collection(db, ...collectionPath),
                orderBy(orderByField, orderDirection)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // 确保日期字段正确转换
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
            }));

            // 4. 缓存数据
            storage.set(cacheKey, data, cacheDuration);
            console.log(`从Firebase获取并缓存: ${cacheKey}`);

            return data;
        } catch {
            console.error(`获取数据失败 (${cacheKey})`);

            // 5. 如果失败，尝试返回过期的缓存数据
            const expiredCache = storage.get(cacheKey);
            if (expiredCache) {
                console.log(`使用过期的缓存数据: ${cacheKey}`);
                return expiredCache;
            }

            throw new DataServiceError(
                `获取${cacheKey}失败`,
                'FETCH_ERROR'
            );
        }
    }

    // 实时订阅（带降级处理）
    subscribe({ collectionPath, callback, cacheKey, cacheDuration }) {
        // 如果使用降级模式，不进行实时订阅
        if (this.useFallback) {
            console.log(`降级模式: 不订阅实时更新 ${cacheKey}`);
            const cachedData = storage.get(cacheKey) || [];
            callback(cachedData);
            return () => { }; // 返回空清理函数
        }

        try {
            const q = query(
                collection(db, ...collectionPath),
                orderBy('createdAt', 'desc')
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const data = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
                    }));

                    // 更新缓存
                    storage.set(cacheKey, data, cacheDuration);
                    callback(data);
                },
                (error) => {
                    console.error(`实时订阅失败 (${cacheKey}):`, error);
                    // 订阅失败时使用缓存数据
                    const cachedData = storage.get(cacheKey) || [];
                    callback(cachedData);
                }
            );

            return unsubscribe;
        } catch {
            console.error(`订阅初始化失败 (${cacheKey})`);
            const cachedData = storage.get(cacheKey) || [];
            callback(cachedData);
            return () => { };
        }
    }

    // 添加数据
    async add({ collectionPath, data, cacheKey }) {
        try {
            const docRef = await addDoc(collection(db, ...collectionPath), {
                ...data,
                createdAt: serverTimestamp()
            });

            // 使相关缓存失效
            storage.remove(cacheKey);

            return { id: docRef.id, success: true };
        } catch (error) {
            console.error(`添加数据失败:`, error);

            // 在降级模式下，模拟添加操作
            if (this.useFallback) {
                const mockId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const mockData = {
                    id: mockId,
                    ...data,
                    createdAt: new Date(),
                    isLocal: true // 标记为本地数据
                };

                // 更新本地缓存
                const cachedData = storage.get(cacheKey) || [];
                storage.set(cacheKey, [mockData, ...cachedData], CACHE_DURATION[cacheKey.split('_')[1]?.toUpperCase()] || 60000);

                return { id: mockId, success: true, isLocal: true };
            }

            throw new DataServiceError('添加数据失败', 'ADD_ERROR', error);
        }
    }

    // 更新数据
    async update({ collectionPath, docId, data, cacheKey }) {
        try {
            const docRef = doc(db, ...collectionPath, docId);
            await updateDoc(docRef, data);

            // 使相关缓存失效
            storage.remove(cacheKey);

            return { success: true };
        } catch (error) {
            console.error(`更新数据失败:`, error);

            // 在降级模式下，模拟更新操作
            if (this.useFallback) {
                const cachedData = storage.get(cacheKey) || [];
                const updatedData = cachedData.map(item =>
                    item.id === docId ? { ...item, ...data, updatedAt: new Date() } : item
                );

                storage.set(cacheKey, updatedData, CACHE_DURATION[cacheKey.split('_')[1]?.toUpperCase()] || 60000);

                return { success: true, isLocal: true };
            }

            throw new DataServiceError('更新数据失败', 'UPDATE_ERROR', error);
        }
    }

    // 删除数据
    async delete({ collectionPath, docId, cacheKey }) {
        try {
            await deleteDoc(doc(db, ...collectionPath, docId));

            // 使相关缓存失效
            storage.remove(cacheKey);

            return { success: true };
        } catch (error) {
            console.error(`删除数据失败:`, error);

            // 在降级模式下，模拟删除操作
            if (this.useFallback) {
                const cachedData = storage.get(cacheKey) || [];
                const filteredData = cachedData.filter(item => item.id !== docId);

                storage.set(cacheKey, filteredData, CACHE_DURATION[cacheKey.split('_')[1]?.toUpperCase()] || 60000);

                return { success: true, isLocal: true };
            }

            throw new DataServiceError('删除数据失败', 'DELETE_ERROR', error);
        }
    }

    // 特定数据获取方法
    async getProfile() {
        try {
            const docRef = doc(db, 'artifacts', APP_ID, 'public', 'profile');
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                const data = snapshot.data();
                storage.set('profile', data, CACHE_DURATION.PROFILE);
                return data;
            }

            // 返回默认数据
            const defaultProfile = {
                name: 'Je1ghtxyuN',
                subtitle: 'Code, Anime, Games, and Coffee.',
                avatar: '/images/profile.jpg',
                aboutTitle: 'About Me',
                aboutContent: '东南大学CS在读  \n 虚拟现实与人机交互方向，游戏开发  \n 同时也是镇守府的提督和十年葱葱人 ~ \n PC/SWITCH 欢迎一起玩 ~'
            };

            return defaultProfile;
        } catch (error) {
            console.warn('获取个人资料失败，使用缓存或默认数据:', error);

            const cachedProfile = storage.get('profile');
            if (cachedProfile) return cachedProfile;

            // 返回默认数据
            return {
                name: 'Je1ghtxyuN',
                subtitle: 'Code, Anime, Games, and Coffee.',
                avatar: '/images/profile.jpg',
                aboutTitle: 'About Me',
                aboutContent: '东南大学CS在读  \n 虚拟现实与人机交互方向，游戏开发  \n 同时也是镇守府的提督和十年葱葱人 ~ \n PC/SWITCH 欢迎一起玩 ~'
            };
        }
    }

    async updateProfile(data) {
        try {
            const docRef = doc(db, 'artifacts', APP_ID, 'public', 'profile');
            await setDoc(docRef, data);

            storage.set('profile', data, CACHE_DURATION.PROFILE);
            return { success: true };
        } catch (error) {
            console.error('更新个人资料失败:', error);

            // 降级处理
            storage.set('profile', data, CACHE_DURATION.PROFILE);
            return { success: true, isLocal: true };
        }
    }

    // 博客文章相关
    getPosts() {
        return this.getData({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts'],
            cacheKey: 'blog_posts',
            cacheDuration: CACHE_DURATION.POSTS
        });
    }

    subscribePosts(callback) {
        return this.subscribe({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts'],
            callback,
            cacheKey: 'blog_posts',
            cacheDuration: CACHE_DURATION.POSTS
        });
    }

    addPost(data) {
        return this.add({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts'],
            data,
            cacheKey: 'blog_posts'
        });
    }

    updatePost(postId, data) {
        return this.update({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts'],
            docId: postId,
            data,
            cacheKey: 'blog_posts'
        });
    }

    deletePost(postId) {
        return this.delete({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts'],
            docId: postId,
            cacheKey: 'blog_posts'
        });
    }

    // 作品相关
    getWorks() {
        return this.getData({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'works'],
            cacheKey: 'works',
            cacheDuration: CACHE_DURATION.WORKS
        });
    }

    subscribeWorks(callback) {
        return this.subscribe({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'works'],
            callback,
            cacheKey: 'works',
            cacheDuration: CACHE_DURATION.WORKS
        });
    }

    // 照片相关
    getPhotos() {
        return this.getData({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'photos'],
            cacheKey: 'photos',
            cacheDuration: CACHE_DURATION.PHOTOS
        });
    }

    subscribePhotos(callback) {
        return this.subscribe({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'photos'],
            callback,
            cacheKey: 'photos',
            cacheDuration: CACHE_DURATION.PHOTOS
        });
    }

    // 评论相关
    getComments(postId) {
        return this.getData({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts', postId, 'comments'],
            cacheKey: `comments_${postId}`,
            cacheDuration: CACHE_DURATION.COMMENTS,
            orderByField: 'createdAt',
            orderDirection: 'asc'
        });
    }

    subscribeComments(postId, callback) {
        return this.subscribe({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts', postId, 'comments'],
            callback,
            cacheKey: `comments_${postId}`,
            cacheDuration: CACHE_DURATION.COMMENTS
        });
    }

    addComment(postId, data) {
        return this.add({
            collectionPath: ['artifacts', APP_ID, 'public', 'data', 'posts', postId, 'comments'],
            data,
            cacheKey: `comments_${postId}`
        });
    }

    // 点赞相关
    async likePost(postId, userId) {
        try {
            const likeRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'posts', postId, 'likes', userId);
            const likeSnap = await getDoc(likeRef);

            if (likeSnap.exists()) {
                return { success: false, message: '已经点过赞了' };
            }

            await setDoc(likeRef, { uid: userId, createdAt: serverTimestamp() });

            const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'posts', postId);
            await updateDoc(postRef, { likes: increment(1) });

            return { success: true };
        } catch (error) {
            console.error('点赞失败:', error);
            return { success: false, message: '点赞失败' };
        }
    }
}

// 创建单例实例
const dataService = new DataService();

export default dataService;