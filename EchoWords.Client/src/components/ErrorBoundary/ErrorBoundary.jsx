import { Component } from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error information
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You could also log the error to an error reporting service here
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Render error fallback UI
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>We've encountered an unexpected error.</p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="error-details">
                <h3>Error Details:</h3>
                <p className="error-message">{this.state.error.toString()}</p>
                <div className="error-stack">
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                </div>
              </div>
            )}

            <div className="error-actions">
              <button
                className="button button-secondary"
                onClick={this.handleRefresh}
              >
                Refresh Page
              </button>
              <button
                className="button button-primary"
                onClick={this.handleGoHome}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
