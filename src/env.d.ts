/// <reference types="vite/client" />

declare module 'react-dom/client' {
    import { createRoot } from 'react-dom/client';
    export { createRoot };
  }

import 'react';
import 'react-dom';

declare module 'react';
declare module 'react-dom/client';