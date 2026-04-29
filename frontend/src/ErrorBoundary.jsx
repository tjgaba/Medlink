import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <section className="panel">
            <h1>Something went wrong.</h1>
            <p>Please refresh and try again.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
