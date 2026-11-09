import { createRoot } from 'react-dom/client';
import {IconHints} from './icon-hints';
import FinanceApp from './finance-app';
import './globals.css';
import './refinement.css';
createRoot(document.getElementById('root')!).render(<><FinanceApp /><IconHints/></>);
