/**
 * @format
 */
import 'reflect-metadata'; // must be the first import: Inversiland reads decorator metadata
import './src/core/presentation/theme/unistyles'; // StyleSheet.configure must run before any StyleSheet.create
import { AppRegistry } from 'react-native';
import App from './src/app/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
