import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Crypto Radar frontend crashed", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <main className="dashboard">
            <section className="panel">
              <p className="eyebrow">Render recovery</p>
              <h1 className="recovery-title">The dashboard hit a rendering issue.</h1>
              <p className="hero-text">
                Refresh the page once. If this keeps happening on mobile, the lighter layout will
                load on the next deploy and should stay stable while scrolling.
              </p>
            </section>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
