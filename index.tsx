
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Ant Design 5's DatePicker and TimePicker components use dayjs by default
// and require these specific plugins to be extended to function correctly.
// Without these, internal calls like date.weekday() will fail.
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(customParseFormat);

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
