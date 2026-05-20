import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // 可以在这里记录错误到日志服务
        console.error('React Error Boundary 捕获到错误:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #fff0f5 0%, #e6e9f0 100%)',
                    fontFamily: "'Quicksand', 'Noto Sans SC', sans-serif",
                    color: '#2d3748'
                }}>
                    <div style={{
                        maxWidth: '600px',
                        padding: '40px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '20px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                        textAlign: 'center'
                    }}>
                        <h1 style={{
                            fontSize: '2.5rem',
                            marginBottom: '20px',
                            background: 'linear-gradient(to right, #ff6b9e, #ff3d7f)',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent'
                        }}>
                            哎呀，出错了！(´；ω；｀)
                        </h1>

                        <p style={{
                            fontSize: '1.1rem',
                            marginBottom: '30px',
                            lineHeight: 1.6,
                            color: '#4a5568'
                        }}>
                            页面遇到了一些问题，可能是网络连接不稳定或者数据加载失败。
                        </p>

                        <div style={{
                            background: 'rgba(255, 107, 158, 0.1)',
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            color: '#718096'
                        }}>
                            <strong>错误信息：</strong>
                            <div style={{ marginTop: '10px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {this.state.error?.toString() || '未知错误'}
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '12px 24px',
                                    background: 'linear-gradient(to right, #ff6b9e, #ff3d7f)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '1rem',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 10px rgba(255, 107, 158, 0.3)'
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                刷新页面
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    color: '#ff6b9e',
                                    border: '2px solid #ff6b9e',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '1rem',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 107, 158, 0.1)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                返回首页
                            </button>
                        </div>

                        <div style={{
                            marginTop: '30px',
                            paddingTop: '20px',
                            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '0.85rem',
                            color: '#a0aec0'
                        }}>
                            <p>如果问题持续存在，请检查网络连接或稍后再试。</p>
                            <p style={{ marginTop: '10px' }}>
                                技术支持：<a href="mailto:je1ghtxyun@example.com" style={{ color: '#ff6b9e' }}>je1ghtxyun@example.com</a>
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;