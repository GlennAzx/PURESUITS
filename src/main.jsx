import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/* Fonts are self-hosted. The Google Fonts <link> was removed because the CDN
   is unreachable from some networks, which left every face in an "error" state
   and silently fell back to Georgia at a synthesised weight. */

/* Cinzel: display face, uppercase Latin only. Used for headings. */
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-900.css';

/* Noto Serif SC: real 500/700 weights for Latin. The Chinese glyphs come from
   the self-hosted subset declared in index.css, under the same family name. */
import '@fontsource/noto-serif-sc/latin-500.css';
import '@fontsource/noto-serif-sc/latin-700.css';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
