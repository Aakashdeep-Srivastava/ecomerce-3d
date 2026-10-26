import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Shown when a child throws (e.g. WebGL unavailable). */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render/runtime errors in the 3D subtree so a WebGL failure degrades
 * to a graceful message instead of a blank screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="scene-fallback" role="alert">
            <p>This experience needs a browser with 3D graphics (WebGL).</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
