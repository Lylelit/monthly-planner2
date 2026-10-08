import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./ThemeContext";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error('App error:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (<div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}><h1>Что-то пошло не так</h1><p style={{ color: '#666' }}>{this.state.error?.message}</p><button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Перезагрузить</button></div>);
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary><ThemeProvider><App /></ThemeProvider></ErrorBoundary>
);
