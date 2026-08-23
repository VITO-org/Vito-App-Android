import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {HealthProvider} from './src/context/HealthProvider';
import {SupabaseProvider} from './src/context/SupabaseProvider';
import RootNavigator from './src/navigation/RootNavigator';

const App: React.FC = () => {
  return (
    <SupabaseProvider>
      <HealthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </HealthProvider>
    </SupabaseProvider>
  );
};

export default App;
