/**
 * Global store for the Swarm Pixel Visualizer.
 * Simple observer pattern to trigger agent animations across the app.
 */
class VisualizerStore {
  constructor() {
    this.state = {
      activeAgent: null, // e.g. 'TaxAgent', 'ClosingAgent', 'AuditAgent'
      actionType: 'idle', // 'idle', 'thinking', 'validating', 'success', 'error'
      message: 'Menunggu instruksi...'
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  // Helper methods to trigger animations
  startAction(agentName, message) {
    this.setState({
      activeAgent: agentName,
      actionType: 'thinking',
      message: message || `${agentName} sedang berpikir...`
    });
  }

  updateAction(actionType, message) {
    this.setState({
      actionType,
      message
    });
  }

  endAction(message = 'Tugas selesai.', delay = 3000) {
    this.setState({
      actionType: 'success',
      message
    });
    
    // Auto reset to idle after delay
    setTimeout(() => {
      this.setState({
        activeAgent: null,
        actionType: 'idle',
        message: 'Menunggu instruksi...'
      });
    }, delay);
  }
}

export const visualizerStore = new VisualizerStore();
