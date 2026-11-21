import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import CoucouHome from '../screens/index';

export default function HomeScreen() {
  const [ready, setReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return <CoucouHome />;
}
