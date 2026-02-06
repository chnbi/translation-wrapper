import React, { Component } from 'react';
import { AlertCircle } from "lucide-react";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950 p-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-pink-100 dark:border-pink-900/30 p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-pink-100 dark:bg-pink-900/30">
                            <AlertCircle className="w-8 h-8 text-pink-400" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            We encountered an unexpected error. Try refreshing the page.
                        </p>
                        <div className="bg-slate-100 dark:bg-zinc-800 rounded-lg p-3 text-left overflow-auto max-h-40 mb-6">
                            <code className="text-xs text-red-600 dark:text-red-400">{this.state.error?.toString()}</code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-white px-4 py-2 rounded-lg text-sm font-medium w-full hover:opacity-90 transition-opacity bg-pink-500 hover:bg-pink-600"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
