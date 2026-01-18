"use client";

/*
  Error Boundary Component
  ------------------------
  Catches JavaScript errors anywhere in the child component tree
  and displays a fallback UI instead of crashing the whole app.
  
  Usage:
  
  import ErrorBoundary from "@/components/common/ErrorBoundary/ErrorBoundary";
  
  <ErrorBoundary>
    <ComponentThatMightError />
  </ErrorBoundary>
  
  With custom fallback:
  
  <ErrorBoundary fallback={<CustomErrorUI />}>
    <ComponentThatMightError />
  </ErrorBoundary>
*/

import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging - in production you might want to send this to
    // an error tracking service like Sentry
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // You could also send to an analytics or logging service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    // Reset the error state to try rendering again
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              We're sorry, but something unexpected happened. Please try again or refresh the page.
            </p>
            
            {/* Only show error details in development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre style={styles.errorDetails}>
                {this.state.error.toString()}
              </pre>
            )}
            
            <div style={styles.actions}>
              <button 
                onClick={this.handleRetry} 
                style={styles.retryButton}
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()} 
                style={styles.refreshButton}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles to ensure the error boundary works even if CSS fails to load
const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    padding: "20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "32px",
    maxWidth: "500px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "16px",
  },
  message: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  errorDetails: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "4px",
    padding: "12px",
    fontSize: "12px",
    color: "#991b1b",
    textAlign: "left",
    overflow: "auto",
    maxHeight: "150px",
    marginBottom: "24px",
  },
  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  refreshButton: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
};

export default ErrorBoundary;


