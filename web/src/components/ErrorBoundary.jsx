import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <p className="text-4xl">⚠️</p>
            <h2 className="text-lg font-semibold text-gray-800">發生錯誤</h2>
            <p className="text-sm text-gray-500">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="text-sm text-blue-600 underline"
            >
              重試
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
