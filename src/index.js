import React from 'react';
import ReactDOM from 'react-dom';
import 'react-toastify/dist/ReactToastify.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/App.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import AppContextProvider from './AppContext';

ReactDOM.render(<AppContextProvider />, document.getElementById('root'));

// Register the service worker.  Once we have the registration object, hand it
// to VersionService so it can trigger update checks directly.
serviceWorkerRegistration.register((registration) => {
    // Dynamically import to avoid a circular dependency at module load time.
    import('./services/VersionService').then(({ versionService }) => {
        versionService.setRegistration(registration);
    });
});
