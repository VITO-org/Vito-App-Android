import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {HealthProvider} from './src/context/HealthProvider';
import RootNavigator from './src/navigation/RootNavigator';

/**
 * Root application component.
 * Wraps the app in HealthProvider + NavigationContainer.
 */
const App: React.FC = () => {
  return (
    <HealthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </HealthProvider>
  );
};

export default App;
