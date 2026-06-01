import React from 'react';
import {HealthProvider} from './src/context/HealthProvider';
import {HealthDashboard} from './src/components/HealthDashboard';

/**
 * Root application component.
 * Wraps the entire app in HealthProvider for Health Connect state management.
 */
const App: React.FC = () => {
  return (
    <HealthProvider>
      <HealthDashboard />
    </HealthProvider>
  );
};

export default App;
