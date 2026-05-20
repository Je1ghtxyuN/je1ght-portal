import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Settings, Globe, Moon, Sun, X, Check } from 'lucide-react';

const SettingsPanel = () => {
    const { language, theme, t, changeLanguage, toggleTheme, setThemeMode } = useApp();
    const [isOpen, setIsOpen] = useState(false);

    const languageOptions = [
        { value: 'zh', label: t('settings.chinese'), flag: '🇨🇳' },
        { value: 'en', label: t('settings.english'), flag: '🇺🇸' },
        { value: 'ja', label: t('settings.japanese'), flag: '🇯🇵' }
    ];

    const themeOptions = [
        { value: 'light', label: t('settings.lightMode'), icon: Sun },
        { value: 'dark', label: t('settings.darkMode'), icon: Moon }
    ];

    return (
        <>
            {/* 设置按钮 */}
            <button
                onClick={() => setIsOpen(true)}
                className="glass"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1000,
                    border: 'none',
                    background: 'var(--glass-bg)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.3s ease'
                }}
                onMouseOver={e => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
            >
                <Settings size={24} color="var(--primary)" />
            </button>

            {/* 设置面板 */}
            {isOpen && (
                <div
                    className="glass"
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '90%',
                        maxWidth: '400px',
                        maxHeight: '80vh',
                        borderRadius: '20px',
                        padding: '30px',
                        zIndex: 2000,
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-lg)',
                        overflowY: 'auto'
                    }}
                >
                    {/* 关闭按钮 */}
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-sub)',
                            padding: '5px'
                        }}
                    >
                        <X size={20} />
                    </button>

                    <h3 style={{
                        fontSize: '1.5rem',
                        marginBottom: '25px',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <Settings size={24} /> {t('settings.language')} & {t('settings.theme')}
                    </h3>

                    {/* 语言设置 */}
                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{
                            fontSize: '1rem',
                            marginBottom: '15px',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Globe size={18} /> {t('settings.language')}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {languageOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => changeLanguage(option.value)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 15px',
                                        borderRadius: '12px',
                                        border: language === option.value
                                            ? '2px solid var(--primary)'
                                            : '1px solid var(--border-color)',
                                        background: language === option.value
                                            ? 'rgba(255, 107, 158, 0.1)'
                                            : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={e => {
                                        if (language !== option.value) {
                                            e.currentTarget.style.background = 'rgba(255, 107, 158, 0.05)';
                                        }
                                    }}
                                    onMouseOut={e => {
                                        if (language !== option.value) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>{option.flag}</span>
                                        <span style={{ color: 'var(--text-main)' }}>{option.label}</span>
                                    </div>
                                    {language === option.value && <Check size={18} color="var(--primary)" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 主题设置 */}
                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{
                            fontSize: '1rem',
                            marginBottom: '15px',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />} {t('settings.theme')}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {themeOptions.map(option => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => setThemeMode(option.value)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 15px',
                                            borderRadius: '12px',
                                            border: theme === option.value
                                                ? '2px solid var(--primary)'
                                                : '1px solid var(--border-color)',
                                            background: theme === option.value
                                                ? 'rgba(255, 107, 158, 0.1)'
                                                : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={e => {
                                            if (theme !== option.value) {
                                                e.currentTarget.style.background = 'rgba(255, 107, 158, 0.05)';
                                            }
                                        }}
                                        onMouseOut={e => {
                                            if (theme !== option.value) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Icon size={18} color={theme === option.value ? 'var(--primary)' : 'var(--text-sub)'} />
                                            <span style={{ color: 'var(--text-main)' }}>{option.label}</span>
                                        </div>
                                        {theme === option.value && <Check size={18} color="var(--primary)" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 关闭按钮 */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '1px solid var(--border-color)'
                    }}>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn btn-primary"
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            )}

            {/* 遮罩层 */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1999
                    }}
                />
            )}
        </>
    );
};

export default SettingsPanel;