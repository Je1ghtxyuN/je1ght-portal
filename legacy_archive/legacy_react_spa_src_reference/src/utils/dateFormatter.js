/**
 * 日期格式化工具
 * 处理Firebase Timestamp和JavaScript Date对象的转换
 */

/**
 * 将Firebase Timestamp或Date对象转换为JavaScript Date对象
 * @param {Object|Date|string|number} dateInput - 日期输入
 * @returns {Date|null} 转换后的Date对象，如果无效则返回null
 */
export const normalizeDate = (dateInput) => {
    if (!dateInput) return null;

    try {
        // 如果是Firebase Timestamp对象
        if (dateInput.toDate && typeof dateInput.toDate === 'function') {
            return dateInput.toDate();
        }

        // 如果是Firebase Timestamp的seconds和nanoseconds格式
        if (dateInput.seconds !== undefined) {
            return new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1000000);
        }

        // 如果是ISO字符串
        if (typeof dateInput === 'string') {
            const date = new Date(dateInput);
            return isNaN(date.getTime()) ? null : date;
        }

        // 如果是时间戳
        if (typeof dateInput === 'number') {
            const date = new Date(dateInput);
            return isNaN(date.getTime()) ? null : date;
        }

        // 如果是Date对象
        if (dateInput instanceof Date) {
            return isNaN(dateInput.getTime()) ? null : dateInput;
        }

        return null;
    } catch (error) {
        console.warn('日期转换失败:', error, dateInput);
        return null;
    }
};

/**
 * 格式化日期为本地日期字符串
 * @param {Object|Date|string|number} dateInput - 日期输入
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (dateInput, options = {}) => {
    const date = normalizeDate(dateInput);
    if (!date) return 'Invalid Date';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return date.toLocaleDateString(undefined, defaultOptions);
};

/**
 * 格式化日期时间为本地日期时间字符串
 * @param {Object|Date|string|number} dateInput - 日期输入
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDateTime = (dateInput, options = {}) => {
    const date = normalizeDate(dateInput);
    if (!date) return 'Invalid Date';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };

    return date.toLocaleString(undefined, defaultOptions);
};

/**
 * 格式化相对时间（如"2天前"）
 * @param {Object|Date|string|number} dateInput - 日期输入
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (dateInput) => {
    const date = normalizeDate(dateInput);
    if (!date) return 'Invalid Date';

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 7) return `${diffDay}天前`;

    return formatDate(date);
};

/**
 * 获取语言特定的日期格式
 * @param {Object|Date|string|number} dateInput - 日期输入
 * @param {string} language - 语言代码 (en, zh, ja)
 * @returns {string} 格式化后的日期字符串
 */
export const formatDateForLanguage = (dateInput, language = 'en') => {
    const date = normalizeDate(dateInput);
    if (!date) return 'Invalid Date';

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    const locales = {
        en: 'en-US',
        zh: 'zh-CN',
        ja: 'ja-JP'
    };

    return date.toLocaleDateString(locales[language] || 'en-US', options);
};