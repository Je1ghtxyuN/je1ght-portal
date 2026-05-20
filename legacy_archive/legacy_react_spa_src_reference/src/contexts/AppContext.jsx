import React, { createContext, useState, useContext, useEffect } from 'react';

// 导入语言文件
import enTranslations from '../locales/en.json';
import jaTranslations from '../locales/ja.json';
import zhTranslations from '../locales/zh.json';

// 创建上下文
const AppContext = createContext();

// 语言映射
const translations = {
    zh: zhTranslations,
    en: enTranslations,
    ja: jaTranslations
};

// 主题配置
const themeConfig = {
    light: {
        primary: '#ff6b9e',
        primaryHover: '#ff4785',
        bgGradient: 'linear-gradient(135deg, #fff0f5 0%, #e6e9f0 100%)',
        glassBg: 'rgba(255, 255, 255, 0.75)',
        glassBorder: 'rgba(255, 255, 255, 0.5)',
        textMain: '#2d3748',
        textSub: '#718096',
        shadowSm: '0 4px 6px rgba(0, 0, 0, 0.05)',
        shadowLg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        bgColor: '#ffffff',
        cardBg: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(0, 0, 0, 0.1)'
    },
    dark: {
        primary: '#ff6b9e',
        primaryHover: '#ff4785',
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        glassBg: 'rgba(30, 41, 59, 0.75)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
        textMain: '#f1f5f9',
        textSub: '#94a3b8',
        shadowSm: '0 4px 6px rgba(0, 0, 0, 0.3)',
        shadowLg: '0 10px 15px rgba(0, 0, 0, 0.4)',
        bgColor: '#0f172a',
        cardBg: 'rgba(30, 41, 59, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
    }
};

export const AppProvider = ({ children }) => {
    // 从localStorage获取初始设置，如果没有则使用默认值（默认英文）
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('language');
        return saved || 'en';
    });

    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved || 'light';
    });

    // 当前翻译
    const t = (key, params = {}) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                // 如果找不到翻译，回退到英语
                let fallback = translations['en'];
                for (const k2 of keys) {
                    if (fallback && fallback[k2] !== undefined) {
                        fallback = fallback[k2];
                    } else {
                        return key; // 返回原始键名
                    }
                }
                value = fallback;
                break;
            }
        }

        // 处理参数替换
        if (typeof value === 'string' && params) {
            return Object.keys(params).reduce((str, paramKey) => {
                return str.replace(`{${paramKey}}`, params[paramKey]);
            }, value);
        }

        return value || key;
    };

    // 切换语言
    const changeLanguage = (lang) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    // 切换主题
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // 设置特定主题
    const setThemeMode = (themeMode) => {
        setTheme(themeMode);
        localStorage.setItem('theme', themeMode);
    };

    // 应用主题到CSS变量
    useEffect(() => {
        const currentTheme = themeConfig[theme];
        const root = document.documentElement;

        Object.entries(currentTheme).forEach(([key, value]) => {
            const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        });

        // 更新body类
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${theme}-theme`);
    }, [theme]);

    // 保存设置到localStorage
    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    const value = {
        language,
        theme,
        t,
        changeLanguage,
        toggleTheme,
        setThemeMode,
        themeConfig: themeConfig[theme]
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// 自定义hook
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};